
"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig, Participant, Score, Game, PerformanceOverTimeDataPoint, MultiMetricDataPoint, LeaderboardEntry } from "@/types";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { getParticipants, getScores, getGames } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils"; // For SF scores

const chartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary-foreground))", "hsl(var(--muted-foreground))",
];

const getColor = (index: number) => chartColors[index % chartColors.length];

interface ProcessedPageData {
  participants: Participant[];
  allScores: Score[]; // All raw scores
  games: Game[];
  participantsMap: Map<string, Participant>;
  gamesMap: Map<string, Game>;
  // leaderboardForLatestScores: LeaderboardEntry[]; // For game comparison based on latest SF relevant data
}

export default function ComparisonsPage() {
  const [selectedParticipantIdsForComparison, setSelectedParticipantIdsForComparison] = useState<string[]>([]);
  const [selectedGameIdsForComparison, setSelectedGameIdsForComparison] = useState<string[]>([]);

  const { data: participants = [], isLoading: isLoadingParticipants, error: errorParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: allScores = [], isLoading: isLoadingScores, error: errorScores } = useQuery<Score[]>({
    queryKey: ["scores"], // Fetch all scores
    queryFn: getScores,
  });

  const { data: games = [], isLoading: isLoadingGames, error: errorGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const isLoadingOverall = isLoadingParticipants || isLoadingScores || isLoadingGames;
  const overallError = errorParticipants || errorScores || errorGames;

  const processedData = useMemo((): ProcessedPageData | null => {
    if (isLoadingOverall || overallError) return null;

    const participantsMap = new Map(participants.map(p => [p.id, p]));
    const gamesMap = new Map(games.map(g => [g.id, g]));
    // const leaderboardForLatestScores = calculateAllParticipantScores(participants, allScores);

    return { participants, allScores, games, participantsMap, gamesMap, /*leaderboardForLatestScores*/ };
  }, [participants, allScores, games, isLoadingOverall, overallError]);


  const handleParticipantSelection = (participantId: string, checked: boolean) => {
    setSelectedParticipantIdsForComparison(prev =>
      checked ? [...prev, participantId] : prev.filter(id => id !== participantId)
    );
  };

  const handleGameSelection = (gameId: string, checked: boolean) => {
    setSelectedGameIdsForComparison(prev =>
      checked ? [...prev, gameId] : prev.filter(id => id !== gameId)
    );
  };

  // Participant Comparison Chart: Trend of SF (Score Final) over time
  const participantSFComparisonChart = useMemo(() => {
    if (!processedData || selectedParticipantIdsForComparison.length === 0 || !processedData.allScores.length) {
      return { chartData: [], chartConfig: {} };
    }
    const { participantsMap, allScores, participants: allParticipants } = processedData;

    // We need to calculate SF for *each* score entry for the selected participants
    // This requires global T_p_min/max, T_m_min/max from allScores
    
    let tp_min = Infinity, tp_max = -Infinity, tm_min = Infinity, tm_max = -Infinity;
    allScores.forEach(score => {
        if (score.tiempo_fisico < tp_min) tp_min = score.tiempo_fisico;
        if (score.tiempo_fisico > tp_max) tp_max = score.tiempo_fisico;
        if (score.tiempo_mental < tm_min) tm_min = score.tiempo_mental;
        if (score.tiempo_mental > tm_max) tm_max = score.tiempo_mental;
    });
    const tp_range_is_zero = tp_max === tp_min;
    const tm_range_is_zero = tm_max === tm_min;

    const PESO_FISICO = 0.45, PESO_MENTAL = 0.40, PESO_EXTRA = 0.15;
    const PENALIZACION_MAX_EXTRA_MINUTOS = 30;
    const getExtraNumericValue = (status: any): number => ({'no_hecho':0,'hecho_a_medias':0.5,'hecho':1}[status]||0);

    const chartDataPoints: { [participantName: string]: { time: string, value: number }[] } = {};

    selectedParticipantIdsForComparison.forEach(pid => {
      const participantName = participantsMap.get(pid)?.name || pid;
      chartDataPoints[participantName] = [];

      const participantScores = allScores.filter(s => s.participantId === pid).sort((a,b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

      participantScores.forEach(score => {
        let s_p = tp_range_is_zero ? 100 : Math.max(0,Math.min(100,((tp_max - score.tiempo_fisico) / (tp_max - tp_min)) * 100));
        let s_m = tm_range_is_zero ? 100 : Math.max(0,Math.min(100,((tm_max - score.tiempo_mental) / (tm_max - tm_min)) * 100));
        const ev_normalizado = getExtraNumericValue(score.estado_extra);
        const e_ajuste_minutos = (1 - 2 * ev_normalizado) * PENALIZACION_MAX_EXTRA_MINUTOS;
        let s_e = Math.max(0,Math.min(100,((PENALIZACION_MAX_EXTRA_MINUTOS - e_ajuste_minutos) / (2 * PENALIZACION_MAX_EXTRA_MINUTOS)) * 100));
        const sf = (PESO_FISICO * s_p) + (PESO_MENTAL * s_m) + (PESO_EXTRA * s_e);
        
        chartDataPoints[participantName].push({ time: format(parseISO(score.recordedAt), "MMM d, HH:mm"), value: parseFloat(sf.toFixed(1)) });
      });
    });
    
    const allTimestamps = Array.from(new Set(Object.values(chartDataPoints).flat().map(dp => dp.time))).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

    const chartData: PerformanceOverTimeDataPoint[] = allTimestamps.map(ts => {
        const dataPoint: PerformanceOverTimeDataPoint = { time: ts };
        selectedParticipantIdsForComparison.forEach(pid => {
            const pName = participantsMap.get(pid)?.name || pid;
            const scoreAtTime = chartDataPoints[pName]?.find(dp => dp.time === ts);
            dataPoint[pName] = scoreAtTime ? scoreAtTime.value : null;
        });
        return dataPoint;
    });
    
    const chartConfig: ChartConfig = {};
    selectedParticipantIdsForComparison.forEach((pid, index) => {
      const pName = participantsMap.get(pid)?.name || pid;
      chartConfig[pName] = { label: pName, color: getColor(index) };
    });
    return { chartData, chartConfig };

  }, [processedData, selectedParticipantIdsForComparison]);


  // Game Comparison Chart: Raw times for selected games across all participants (latest score)
  const gameComparisonChart = useMemo(() => {
    if (!processedData || selectedGameIdsForComparison.length === 0 || !processedData.allScores.length) {
         return { chartData: [], chartConfig: {} };
    }
    const { participants: allParticipants, gamesMap, allScores, participantsMap } = processedData;

    const selectedGames = selectedGameIdsForComparison.map(id => gamesMap.get(id)).filter(Boolean) as Game[];
    if (selectedGames.length === 0) return { chartData: [], chartConfig: {} };

    // Use the globally calculated latest scores (which includes gameTimes)
    const leaderboardForLatestScores = calculateAllParticipantScores(allParticipants, allScores);

    const chartData: MultiMetricDataPoint[] = leaderboardForLatestScores.map(entry => {
      const participantName = participantsMap.get(entry.id)?.name || entry.id;
      const dataPoint: MultiMetricDataPoint = { name: participantName }; 
      selectedGames.forEach(game => {
        dataPoint[game.name] = entry.gameTimes?.[game.id] ?? null;
      });
      return dataPoint;
    }).filter(dp => selectedGames.some(game => dp[game.name] !== null && dp[game.name] !== undefined)); 
    
    const chartConfig: ChartConfig = {};
    selectedGames.forEach((game, index) => {
      chartConfig[game.name] = { label: game.name, color: getColor(index + selectedParticipantIdsForComparison.length) }; // Offset colors
    });

    return { chartData, chartConfig };
  }, [processedData, selectedGameIdsForComparison, selectedParticipantIdsForComparison.length]);


  const renderLineChart = (title: string, description: string, data: PerformanceOverTimeDataPoint[], config: ChartConfig, yAxisLabel: string = "Score (SF)") => {
    if (isLoadingOverall && !processedData && data.length === 0 && selectedParticipantIdsForComparison.length === 0) return <Skeleton className="h-[400px] w-full shadow-lg" />;
    if (!isLoadingOverall && selectedParticipantIdsForComparison.length > 0 && data.length === 0) return <p className="text-center text-muted-foreground py-8">No recorded scores for selected participant(s) or no data to plot.</p>;
    if (selectedParticipantIdsForComparison.length === 0) return <p className="text-center text-muted-foreground py-8">Select participants to compare their Final Score (SF) trend.</p>;
    
    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" angle={-30} textAnchor="end" height={50} />
                <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dx: -10 }} stroke="hsl(var(--muted-foreground))" domain={[0, 'auto']}/>
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                {Object.keys(config).map((keyName) => ( // Changed from participantName to keyName
                    <Line key={keyName} type="monotone" dataKey={keyName} stroke={config[keyName]?.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                ))}
                </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };

  const renderGroupedBarChart = (title: string, description: string, data: MultiMetricDataPoint[], config: ChartConfig, yAxisLabel: string = "Time (min)") => {
    if (isLoadingOverall && !processedData && data.length === 0 && selectedGameIdsForComparison.length === 0) return <Skeleton className="h-[400px] w-full shadow-lg" />;
    if (!isLoadingOverall && selectedGameIdsForComparison.length > 0 && data.length === 0 ) return <p className="text-center text-muted-foreground py-8">No data for selected games or participants with scores in those games.</p>;
    if (selectedGameIdsForComparison.length === 0) return <p className="text-center text-muted-foreground py-8">Select games to compare raw performance times.</p>;

    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[400px] w-full">
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tickFormatter={(value) => value.length > 10 ? `${value.substring(0,7)}...` : value} stroke="hsl(var(--muted-foreground))" angle={-30} textAnchor="end" height={50} />
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dx: -10 }} stroke="hsl(var(--muted-foreground))" domain={['dataMin', 'auto']}/>
              <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {Object.keys(config).map((gameName) => (
                <Bar key={gameName} dataKey={gameName} fill={config[gameName]?.color} radius={4} />
              ))}
            </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };
  
  if (overallError) {
    return <p className="text-destructive text-center py-8">Error loading comparison data: {(overallError as Error).message}</p>;
  }

  return (
    <>
      <PageHeader
        title="Comparisons"
        description="Select participants or games below for specific comparisons."
      />
      
      {isLoadingOverall && !processedData ? (
        <div className="space-y-8">
            <Skeleton className="h-[600px] w-full shadow-lg" />
            <Skeleton className="h-[600px] w-full shadow-lg" />
        </div>
      ) : (
      <div className="space-y-10">
        <div>
          <h3 className="text-2xl font-semibold mb-3 text-foreground">Participant Final Score (SF) Trend</h3>
          <p className="text-sm text-muted-foreground mb-4">Compare Final Score (SF) trends for selected participants across all their score recordings. Higher SF is better.</p>
          <div className="mb-6 p-4 border rounded-md bg-card shadow-sm">
            <h4 className="text-md font-semibold mb-3 text-card-foreground/90">Select Participants:</h4>
            {processedData && processedData.participants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedData.participants.map((p) => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <Checkbox id={`compare-trend-${p.id}`} checked={selectedParticipantIdsForComparison.includes(p.id)} onCheckedChange={(checked) => handleParticipantSelection(p.id, !!checked)} />
                    <Label htmlFor={`compare-trend-${p.id}`} className="text-sm font-normal cursor-pointer hover:text-primary transition-colors">{p.name}</Label>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No participants available.</p>}
          </div>
          {renderLineChart(
            "Participant Final Score (SF) Trend", 
            "",
            participantSFComparisonChart.chartData,
            participantSFComparisonChart.chartConfig,
            "Final Score (SF)"
          )}
        </div>

        <div>
          <h3 className="text-2xl font-semibold mb-3 text-foreground">Game Performance Comparison (Raw Times)</h3>
          <p className="text-sm text-muted-foreground mb-4">Compare participant raw performance times across selected games (based on latest scores). Lower time is better.</p>
          <div className="mb-6 p-4 border rounded-md bg-card shadow-sm">
            <h4 className="text-md font-semibold mb-3 text-card-foreground/90">Select Games:</h4>
            {processedData && processedData.games.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedData.games.map((g) => (
                  <div key={g.id} className="flex items-center space-x-2">
                    <Checkbox id={`compare-game-${g.id}`} checked={selectedGameIdsForComparison.includes(g.id)} onCheckedChange={(checked) => handleGameSelection(g.id, !!checked)} />
                    <Label htmlFor={`compare-game-${g.id}`} className="text-sm font-normal cursor-pointer hover:text-primary transition-colors">{g.name} <span className="text-xs text-muted-foreground">({g.category})</span></Label>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No games available.</p>}
          </div>
          {renderGroupedBarChart(
            "Game Performance Comparison (Raw Times)", 
            "", 
            gameComparisonChart.chartData,
            gameComparisonChart.chartConfig,
            "Time (min)"
          )}
        </div>
      </div>
      )}
    </>
  );
}
