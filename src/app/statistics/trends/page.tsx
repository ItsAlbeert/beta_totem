
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
import type { ChartConfig, Participant, Score, TrendDataPoint } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';


const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants";
const SCORES_STORAGE_KEY = "chronoScoreScores";

const getStoredParticipants = (): Participant[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const getStoredScores = (): Score[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SCORES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const chartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary-foreground))", "hsl(var(--muted-foreground))", "hsl(var(--foreground))",
];

function formatDataForChart(
  selectedParticipantIds: string[],
  allScores: Score[],
  allParticipants: Participant[],
  dataKey: keyof Pick<Score, 'weightedTotalTime' | 'physicalTime' | 'mentalTime'>
): { chartData: TrendDataPoint[], chartConfig: ChartConfig } {
  if (selectedParticipantIds.length === 0 || allScores.length === 0) {
    return { chartData: [], chartConfig: {} };
  }

  const participantMap = new Map(allParticipants.map(p => [p.id, p.name]));

  const relevantScores = allScores.filter(score => selectedParticipantIds.includes(score.participantId));
  if (relevantScores.length === 0) return { chartData: [], chartConfig: {} };

  // Get all unique, sorted timestamps
  const uniqueTimestamps = Array.from(new Set(relevantScores.map(s => new Date(s.recordedAt).getTime())))
    .sort((a, b) => a - b)
    .map(ts => new Date(ts));

  const chartData: TrendDataPoint[] = uniqueTimestamps.map(timestamp => {
    const formattedTime = format(timestamp, "MMM d, HH:mm"); // e.g., "Jan 1, 09:00"
    const dataPoint: TrendDataPoint = { time: formattedTime };

    selectedParticipantIds.forEach(participantId => {
      const participantName = participantMap.get(participantId) || participantId;
      // Find score for this participant at this specific timestamp (or very close to it, if needed)
      // For simplicity, we assume recordedAt is precise enough or we only care about exact matches.
      const scoreAtTime = relevantScores.find(
        s => s.participantId === participantId && new Date(s.recordedAt).getTime() === timestamp.getTime()
      );
      dataPoint[participantName] = scoreAtTime ? scoreAtTime[dataKey] : null;
    });
    return dataPoint;
  });

  const chartConfig: ChartConfig = {};
  selectedParticipantIds.forEach((participantId, index) => {
    const participantName = participantMap.get(participantId) || participantId;
    chartConfig[participantName] = {
      label: participantName,
      color: chartColors[index % chartColors.length],
    };
  });

  return { chartData, chartConfig };
}


export default function TrendsPage() {
  const [loading, setLoading] = useState(true);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [allScores, setAllScores] = useState<Score[]>([]);
  const [selectedIdsForComparison, setSelectedIdsForComparison] = useState<string[]>([]);

  useEffect(() => {
    const participants = getStoredParticipants();
    const scores = getStoredScores();
    setAllParticipants(participants);
    setAllScores(scores);
    setLoading(false);

    // Listener for storage changes
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === PARTICIPANTS_STORAGE_KEY || event.key === SCORES_STORAGE_KEY) {
            setLoading(true);
            const updatedParticipants = getStoredParticipants();
            const updatedScores = getStoredScores();
            setAllParticipants(updatedParticipants);
            setAllScores(updatedScores);
            // Filter out selected IDs that no longer exist
            setSelectedIdsForComparison(prev => prev.filter(id => updatedParticipants.some(p => p.id === id)));
            setLoading(false);
        }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);

  }, []);
  
  const comparisonChart = useMemo(() => {
    if (selectedIdsForComparison.length === 0) return { chartData: [], chartConfig: {} };
    return formatDataForChart(selectedIdsForComparison, allScores, allParticipants, 'weightedTotalTime');
  }, [selectedIdsForComparison, allScores, allParticipants]);


  const handleParticipantSelection = (participantId: string, checked: boolean) => {
    setSelectedIdsForComparison(prev =>
      checked ? [...prev, participantId] : prev.filter(id => id !== participantId)
    );
  };

  const renderChart = (title: string, description: string, data: TrendDataPoint[], config: ChartConfig, yAxisLabel: string) => {
    if (loading && data.length === 0 && selectedIdsForComparison.length === 0 ) { // Show skeleton only if loading and no selection yet
      return <Skeleton className="h-[400px] w-full" />;
    }
     if (!loading && selectedIdsForComparison.length > 0 && data.length === 0) {
       return <p className="text-center text-muted-foreground py-8">No recorded scores found for the selected participant(s) to plot a trend.</p>;
    }


    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time" 
                  tickFormatter={(value) => value} 
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dx: -10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <ChartTooltip
                  cursor={true}
                  content={<ChartTooltipContent indicator="line" hideLabel={false} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                {Object.keys(config).map((participantName) => (
                  <Line
                    key={participantName}
                    type="monotone"
                    dataKey={participantName}
                    stroke={config[participantName]?.color || "#000000"}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls={true} // Connect lines over null points if desired, or false to break lines
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        title="Performance Trends"
        description="Analyze participant performance over time based on their recorded scores."
      />
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Custom Participant Comparison</CardTitle>
            <CardDescription>Select participants below to compare their weighted total time trends over recordings (lower is better).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Select Participants:</h3>
              {loading && allParticipants.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : allParticipants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {allParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`compare-${participant.id}`}
                        checked={selectedIdsForComparison.includes(participant.id)}
                        onCheckedChange={(checked) => handleParticipantSelection(participant.id, !!checked)}
                      />
                      <Label htmlFor={`compare-${participant.id}`} className="text-sm font-normal cursor-pointer">
                        {participant.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                 <p className="text-center text-muted-foreground py-4">No participants available. Please add participants on the Participants page.</p>
              )}
            </div>
            {selectedIdsForComparison.length > 0 ? (
                 renderChart(
                    `Comparison: ${selectedIdsForComparison.map(id => allParticipants.find(p=>p.id===id)?.name).filter(Boolean).join(', ')}`,
                    "Weighted total time trends for selected participants across their score recordings.",
                    comparisonChart.chartData,
                    comparisonChart.chartConfig,
                    "Weighted Time (min)"
                  )
            ) : !loading && (
                <p className="text-center text-muted-foreground py-8">Select one or more participants to see their comparison.</p>
            )}
             {loading && selectedIdsForComparison.length > 0 && ( // Show skeleton if loading and participants are selected
                <Skeleton className="h-[400px] w-full mt-4" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
