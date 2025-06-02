
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
import { calculateAllParticipantScores } from "@/lib/data-utils"; 

const chartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary-foreground))", "hsl(var(--muted-foreground))",
];

const getColor = (index: number) => chartColors[index % chartColors.length];

interface ProcessedPageData {
  participants: Participant[];
  allScores: Score[]; 
  games: Game[];
  participantsMap: Map<string, Participant>;
  gamesMap: Map<string, Game>;
}

export default function ComparisonsPage() {
  const [selectedParticipantIdsForComparison, setSelectedParticipantIdsForComparison] = useState<string[]>([]);
  const [selectedGameIdsForComparison, setSelectedGameIdsForComparison] = useState<string[]>([]);

  const { data: participants = [], isLoading: isLoadingParticipants, error: errorParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: allScores = [], isLoading: isLoadingScores, error: errorScores } = useQuery<Score[]>({
    queryKey: ["scores"], 
    queryFn: getScores,
  });

  const { data: games = [], isLoading: isLoadingGames, error: errorGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const isLoadingOverall = isLoadingParticipants || isLoadingScores || isLoadingGames;
  const overallError = errorParticipants || errorScores || errorGames;

  const processedData = useMemo((): ProcessedPageData | null => {
    if (isLoadingOverall || overallError || !participants.length || !allScores.length || !games.length) return null;

    const participantsMap = new Map(participants.map(p => [p.id, p]));
    const gamesMap = new Map(games.map(g => [g.id, g]));

    return { participants, allScores, games, participantsMap, gamesMap };
  }, [participants, allScores, games, isLoadingOverall, overallError]);


  const handleParticipantSelection = (participantId: string, checked: boolean) => {
    setSelectedParticipantIdsForComparison(prev =>
      checked ? [...prev, participantId] : prev.filter(id => id !== participantId)
    );
  };

  const handleGameSelection = (gameId: string, checked: boolean) => {
    setSelectedGameIdsForComparison(prev =>
      checked ? [...prev, gameId] : prev.filter(id => id !== participantId)
    );
  };

  // Participant Comparison Chart: Trend of P_Total (Total Points) over time
  const participantPTotalComparisonChart = useMemo(() => {
    if (!processedData || selectedParticipantIdsForComparison.length === 0 || !processedData.allScores.length) {
      return { chartData: [], chartConfig: {} };
    }
    const { participantsMap, allScores, games: allGames, participants: allParticipants } = processedData;
    
    // This will store { participantName: [{ time: string, value: P_Total }] }
    const chartDataPoints: { [participantName: string]: { time: string, value: number }[] } = {};

    // For each selected participant, calculate P_Total for each of their scores
    selectedParticipantIdsForComparison.forEach(pid => {
      const participantName = participantsMap.get(pid)?.name || pid;
      chartDataPoints[participantName] = [];

      // Filter scores for this participant and sort them by date
      const participantScores = allScores
        .filter(s => s.participantId === pid)
        .sort((a,b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

      participantScores.forEach(score => {
        // To calculate P_Total for a single score, we essentially run a mini-version
        // of calculateAllParticipantScores for just this one participant and this one score,
        // but since P_fisico and P_mental now use fixed thresholds, we don't need global min/max times.
        // We only need allGames for the extra points calculation.
        
        // Create a temporary participant array with just this one participant
        const tempParticipantArray = allParticipants.filter(p => p.id === pid);
        // Create a temporary score array with just this one score
        const tempScoreArray = [score];

        // Calculate scores for this specific entry
        const singleEntryCalculation = calculateAllParticipantScores(tempParticipantArray, tempScoreArray, allGames);
        
        if (singleEntryCalculation.length > 0) {
          const p_total = singleEntryCalculation[0].puntos_total;
          chartDataPoints[participantName].push({ 
            time: format(parseISO(score.recordedAt), "MMM d, HH:mm"), 
            value: parseFloat(p_total.toFixed(1)) 
          });
        }
      });
    });
    
    // Aggregate all unique timestamps from all selected participants' scores
    const allTimestamps = Array.from(new Set(Object.values(chartDataPoints).flat().map(dp => dp.time)))
      .sort((a,b) => new Date(a.split(',')[0]).getTime() - new Date(b.split(',')[0]).getTime()); // Basic sort by date part


    // Construct the final chart data by merging data points for each timestamp
    const chartData: PerformanceOverTimeDataPoint[] = allTimestamps.map(ts => {
        const dataPoint: PerformanceOverTimeDataPoint = { time: ts };
        selectedParticipantIdsForComparison.forEach(pid => {
            const pName = participantsMap.get(pid)?.name || pid;
            const scoreAtTime = chartDataPoints[pName]?.find(dp => dp.time === ts);
            dataPoint[pName] = scoreAtTime ? scoreAtTime.value : null; // Use null for missing data points for a participant at a specific time
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


  // Game Comparison Chart: Raw times for selected Physical/Mental games across all participants (latest score)
  const gameComparisonChart = useMemo(() => {
    if (!processedData || selectedGameIdsForComparison.length === 0 || !processedData.allScores.length) {
         return { chartData: [], chartConfig: {} };
    }
    const { participants: allParticipantsList, games: allGamesList, allScores: allScoresList, participantsMap, gamesMap } = processedData;

    const selectedGames = selectedGameIdsForComparison
        .map(id => gamesMap.get(id))
        .filter(Boolean)
        .filter(game => game!.category === 'Physical' || game!.category === 'Mental') as Game[]; // Only physical/mental games have times

    if (selectedGames.length === 0) return { chartData: [], chartConfig: {} };

    // Use the globally calculated latest scores (which includes gameTimes)
    const leaderboardForLatestScores = calculateAllParticipantScores(allParticipantsList, allScoresList, allGamesList);

    const chartData: MultiMetricDataPoint[] = leaderboardForLatestScores.map(entry => {
      const participantName = participantsMap.get(entry.id)?.name || entry.id;
      const dataPoint: MultiMetricDataPoint = { name: participantName }; 
      selectedGames.forEach(game => {
        dataPoint[game.name] = entry.gameTimes?.[game.id] ?? null; // Use null if no time recorded
      });
      return dataPoint;
    }).filter(dp => selectedGames.some(game => dp[game.name] !== null && dp[game.name] !== undefined)); 
    
    const chartConfig: ChartConfig = {};
    selectedGames.forEach((game, index) => {
      chartConfig[game.name] = { label: `${game.name} (Time)`, color: getColor(index + selectedParticipantIdsForComparison.length) }; // Offset colors
    });

    return { chartData, chartConfig };
  }, [processedData, selectedGameIdsForComparison, selectedParticipantIdsForComparison.length]);


  const renderLineChart = (title: string, description: string, data: PerformanceOverTimeDataPoint[], config: ChartConfig, yAxisLabel: string = "Points (Pᴛ)") => {
    if (isLoadingOverall && !processedData && data.length === 0 && selectedParticipantIdsForComparison.length === 0) return <Skeleton className="h-[400px] w-full shadow-lg" />;
    if (!isLoadingOverall && selectedParticipantIdsForComparison.length > 0 && data.length === 0) return <p className="text-center text-muted-foreground py-8">No recorded scores for selected participant(s) or no data to plot.</p>;
    if (selectedParticipantIdsForComparison.length === 0) return <p className="text-center text-muted-foreground py-8">Select participants to compare their Total Points (Pᴛ) trend.</p>;
    
    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" angle={-30} textAnchor="end" height={60} interval="preserveStartEnd" />
                <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dx: -10 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']}/>
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                {Object.keys(config).map((keyName) => (
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
    if (selectedGameIdsForComparison.length === 0) return <p className="text-center text-muted-foreground py-8">Select Physical/Mental games to compare raw performance times.</p>;

    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[400px] w-full">
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tickFormatter={(value) => value.length > 10 ? `${value.substring(0,7)}...` : value} stroke="hsl(var(--muted-foreground))" angle={-30} textAnchor="end" height={60} />
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
          <h3 className="text-2xl font-semibold mb-3 text-foreground">Participant Total Points (Pᴛ) Trend</h3>
          <p className="text-sm text-muted-foreground mb-4">Compare Total Points (Pᴛ) trends for selected participants across all their score recordings. Higher Pᴛ is better.</p>
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
            "Participant Total Points (Pᴛ) Trend", 
            "",
            participantPTotalComparisonChart.chartData,
            participantPTotalComparisonChart.chartConfig,
            "Total Points (Pᴛ)"
          )}
        </div>

        <div>
          <h3 className="text-2xl font-semibold mb-3 text-foreground">Game Performance Comparison (Raw Times)</h3>
          <p className="text-sm text-muted-foreground mb-4">Compare participant raw performance times across selected Physical/Mental games (based on latest scores). Lower time is better.</p>
          <div className="mb-6 p-4 border rounded-md bg-card shadow-sm">
            <h4 className="text-md font-semibold mb-3 text-card-foreground/90">Select Physical/Mental Games:</h4>
            {processedData && processedData.games.filter(g => g.category === 'Physical' || g.category === 'Mental').length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedData.games.filter(g => g.category === 'Physical' || g.category === 'Mental').map((g) => (
                  <div key={g.id} className="flex items-center space-x-2">
                    <Checkbox id={`compare-game-${g.id}`} checked={selectedGameIdsForComparison.includes(g.id)} onCheckedChange={(checked) => handleGameSelection(g.id, !!checked)} />
                    <Label htmlFor={`compare-game-${g.id}`} className="text-sm font-normal cursor-pointer hover:text-primary transition-colors">{g.name} <span className="text-xs text-muted-foreground">({g.category})</span></Label>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No Physical or Mental games available for comparison.</p>}
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
