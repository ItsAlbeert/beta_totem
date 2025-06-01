
"use client";

import { useEffect, useState, useMemo } from "react";
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
import type { ChartConfig, Participant, Score, Game, PerformanceOverTimeDataPoint, MultiMetricDataPoint } from "@/types";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";

const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants";
const SCORES_STORAGE_KEY = "chronoScoreScores";
const GAMES_STORAGE_KEY = "chronoScoreGames";

const getStoredData = <T,>(key: string, defaultValue: T[] = []): T[] => {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  try {
    return stored ? JSON.parse(stored) as T[] : defaultValue;
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage`, e);
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const chartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary-foreground))", "hsl(var(--muted-foreground))",
];

const getColor = (index: number) => chartColors[index % chartColors.length];

interface ProcessedData {
  participants: Participant[];
  scores: Score[];
  games: Game[];
  latestScoresMap: Map<string, Score>;
  participantsMap: Map<string, Participant>;
  gamesMap: Map<string, Game>;
}

export default function ComparisonsPage() {
  const [loading, setLoading] = useState(true);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [selectedParticipantIdsForComparison, setSelectedParticipantIdsForComparison] = useState<string[]>([]);
  const [selectedGameIdsForComparison, setSelectedGameIdsForComparison] = useState<string[]>([]);

  const fetchData = () => {
    setLoading(true);
    const participants = getStoredData<Participant>(PARTICIPANTS_STORAGE_KEY);
    const scores = getStoredData<Score>(SCORES_STORAGE_KEY);
    const games = getStoredData<Game>(GAMES_STORAGE_KEY);

    const participantsMap = new Map(participants.map(p => [p.id, p]));
    const gamesMap = new Map(games.map(g => [g.id, g]));

    const latestScoresMap = new Map<string, Score>();
    scores.forEach(score => {
      const existing = latestScoresMap.get(score.participantId);
      if (!existing || new Date(score.recordedAt) > new Date(existing.recordedAt)) {
        latestScoresMap.set(score.participantId, score);
      }
    });

    setProcessedData({ participants, scores, games, latestScoresMap, participantsMap, gamesMap });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === PARTICIPANTS_STORAGE_KEY ||
        event.key === SCORES_STORAGE_KEY ||
        event.key === GAMES_STORAGE_KEY
      ) {
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  const participantComparisonChart = useMemo(() => {
    if (!processedData || selectedParticipantIdsForComparison.length === 0) return { chartData: [], chartConfig: {} };
    const { scores, participantsMap } = processedData;

    const relevantScores = scores.filter(score => selectedParticipantIdsForComparison.includes(score.participantId));
    if (relevantScores.length === 0) return { chartData: [], chartConfig: {} };
    
    const uniqueTimestamps = Array.from(new Set(relevantScores.map(s => parseISO(s.recordedAt).getTime())))
      .sort((a, b) => a - b)
      .map(ts => parseISO(new Date(ts).toISOString()));

    const chartData: PerformanceOverTimeDataPoint[] = uniqueTimestamps.map(timestamp => {
      const formattedTime = format(timestamp, "MMM d, HH:mm");
      const dataPoint: PerformanceOverTimeDataPoint = { time: formattedTime };
      selectedParticipantIdsForComparison.forEach(pid => {
        const pName = participantsMap.get(pid)?.name || pid;
        const scoreAtTime = relevantScores.find(s => s.participantId === pid && parseISO(s.recordedAt).getTime() === timestamp.getTime());
        dataPoint[pName] = scoreAtTime ? scoreAtTime.weightedTotalTime : null;
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


  const gameComparisonChart = useMemo(() => {
    if (!processedData || selectedGameIdsForComparison.length === 0) return { chartData: [], chartConfig: {} };
    const { participants, gamesMap, latestScoresMap, participantsMap } = processedData;

    const selectedGames = selectedGameIdsForComparison.map(id => gamesMap.get(id)).filter(Boolean) as Game[];
    if (selectedGames.length === 0) return { chartData: [], chartConfig: {} };

    const chartData: MultiMetricDataPoint[] = participants.map(p => {
      const participantName = participantsMap.get(p.id)?.name || p.id;
      const dataPoint: MultiMetricDataPoint = { name: participantName };
      const latestScore = latestScoresMap.get(p.id);
      selectedGames.forEach(game => {
        dataPoint[game.name] = latestScore?.gameTimes?.[game.id] ?? null;
      });
      return dataPoint;
    });
    
    const chartConfig: ChartConfig = {};
    selectedGames.forEach((game, index) => {
      chartConfig[game.name] = { label: game.name, color: getColor(index) };
    });

    return { chartData, chartConfig };
  }, [processedData, selectedGameIdsForComparison]);

  const renderLineChart = (title: string, description: string, data: PerformanceOverTimeDataPoint[], config: ChartConfig, yAxisLabel: string = "Time (min)") => {
    if (loading && data.length === 0 && selectedParticipantIdsForComparison.length === 0) return <Skeleton className="h-[400px] w-full" />;
    if (!loading && selectedParticipantIdsForComparison.length > 0 && data.length === 0) return <p className="text-center text-muted-foreground py-8">No recorded scores for selected participant(s).</p>;
    if (selectedParticipantIdsForComparison.length === 0) return <p className="text-center text-muted-foreground py-8">Select participants to compare.</p>;
    
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[400px] w-full">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dx: -10 }} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {Object.keys(config).map((participantName) => (
                <Line key={participantName} type="monotone" dataKey={participantName} stroke={config[participantName]?.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={true} />
              ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };

  const renderGroupedBarChart = (title: string, description: string, data: MultiMetricDataPoint[], config: ChartConfig, yAxisLabel: string = "Time (min)") => {
    if (loading && data.length === 0) return <Skeleton className="h-[400px] w-full" />;
    if (!loading && data.length === 0 && selectedGameIdsForComparison.length > 0) return <p className="text-center text-muted-foreground py-8">No data for selected games.</p>;
    if (selectedGameIdsForComparison.length === 0) return <p className="text-center text-muted-foreground py-8">Select games to compare.</p>;

    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[400px] w-full">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tickFormatter={(value) => value.length > 10 ? `${value.substring(0,7)}...` : value} stroke="hsl(var(--muted-foreground))"/>
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dx: -10 }} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {Object.keys(config).map((gameName) => (
                <Bar key={gameName} dataKey={gameName} fill={config[gameName]?.color} radius={4} />
              ))}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        title="Comparisons"
        description="Select participants or games below for specific comparisons."
      />
      
      {loading && !processedData ? (
        <div className="space-y-8">
            <Skeleton className="h-[600px] w-full" />
            <Skeleton className="h-[600px] w-full" />
        </div>
      ) : (
      <div className="space-y-10">
        {/* Participant Comparison Trend Sub-section */}
        <div>
          <h3 className="text-2xl font-medium mb-3">Participant Performance Trend</h3>
          <p className="text-sm text-muted-foreground mb-4">Compare weighted total time trends for selected participants across their score recordings. Lower is better.</p>
          <div className="mb-4 p-4 border rounded-md bg-background shadow-sm">
            <h4 className="text-md font-medium mb-3 text-foreground/90">Select Participants:</h4>
            {processedData && processedData.participants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedData.participants.map((p) => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <Checkbox id={`compare-trend-${p.id}`} checked={selectedParticipantIdsForComparison.includes(p.id)} onCheckedChange={(checked) => handleParticipantSelection(p.id, !!checked)} />
                    <Label htmlFor={`compare-trend-${p.id}`} className="text-sm font-normal cursor-pointer">{p.name}</Label>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No participants available.</p>}
          </div>
          {renderLineChart(
            "Participant Weighted Total Time Trend", 
            "",
            participantComparisonChart.chartData,
            participantComparisonChart.chartConfig,
            "Weighted Time (min)"
          )}
        </div>

        {/* Game Comparison Sub-section */}
        <div>
          <h3 className="text-2xl font-medium mb-3">Game Performance Comparison</h3>
          <p className="text-sm text-muted-foreground mb-4">Compare participant performance across selected games (based on latest scores). Lower is better.</p>
          <div className="mb-4 p-4 border rounded-md bg-background shadow-sm">
            <h4 className="text-md font-medium mb-3 text-foreground/90">Select Games:</h4>
            {processedData && processedData.games.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedData.games.map((g) => (
                  <div key={g.id} className="flex items-center space-x-2">
                    <Checkbox id={`compare-game-${g.id}`} checked={selectedGameIdsForComparison.includes(g.id)} onCheckedChange={(checked) => handleGameSelection(g.id, !!checked)} />
                    <Label htmlFor={`compare-game-${g.id}`} className="text-sm font-normal cursor-pointer">{g.name} <span className="text-xs text-muted-foreground">({g.category})</span></Label>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No games available.</p>}
          </div>
          {renderGroupedBarChart(
            "Game Performance Comparison", 
            "", 
            gameComparisonChart.chartData,
            gameComparisonChart.chartConfig
          )}
        </div>
      </div>
      )}
    </>
  );
}
