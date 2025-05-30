
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
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Participant, ParticipantTrend, ParticipantTrendDataPoint, LeaderboardEntry } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

// Expanded Mock Data
const mockParticipantsList: Participant[] = [
  { id: "1", name: "Alice Wonderland", year: 1, photoUrl: "https://placehold.co/40x40.png" },
  { id: "2", name: "Bob The Builder", year: 2, photoUrl: "https://placehold.co/40x40.png" },
  { id: "3", name: "Charlie Chaplin", year: 3, photoUrl: "https://placehold.co/40x40.png" },
  { id: "4", name: "Diana Prince", year: 1 },
  { id: "5", name: "Edward Scissorhands", year: 2, photoUrl: "https://placehold.co/40x40.png" },
  { id: "6", name: "Fiona Gallagher", year: 3 },
  { id: "7", name: "George Jetson", year: 1, photoUrl: "https://placehold.co/40x40.png" },
  { id: "8", name: "Harry Potter", year: 2 },
  { id: "9", name: "Ivy Valentine", year: 3, photoUrl: "https://placehold.co/40x40.png" },
  { id: "10", name: "John Doe", year: 1 },
  { id: "11", name: "Kevin McCallister", year: 2, photoUrl: "https://placehold.co/40x40.png"},
  { id: "12", name: "Lisa Simpson", year: 3 }
];

// Mock scores to determine top 10 (similar to leaderboard)
const mockScoresForRanking = mockParticipantsList.map((p, index) => ({
  participantId: p.id,
  physicalTime: 20 + Math.floor(Math.random() * 20), // Random physical time 20-39
  mentalTime: 8 + Math.floor(Math.random() * 10),   // Random mental time 8-17
  extraTime: Math.floor(Math.random() * 5),        // Random extra time 0-4
}));

function calculateWeightedTotalTime(physicalTime: number, mentalTime: number, extraTime: number = 0): number {
  return physicalTime + (mentalTime * 3) - extraTime;
}

const mockLeaderboardData: LeaderboardEntry[] = mockScoresForRanking
  .map((score) => {
    const participant = mockParticipantsList.find(p => p.id === score.participantId);
    if (!participant) return null;
    const weightedTotalTime = calculateWeightedTotalTime(score.physicalTime, score.mentalTime, score.extraTime);
    return {
      ...participant,
      rank: 0, // Placeholder
      physicalTime: score.physicalTime,
      mentalTime: score.mentalTime,
      extraTime: score.extraTime,
      weightedTotalTime,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a!.weightedTotalTime - b!.weightedTotalTime)
  .map((entry, index) => ({ ...entry!, rank: index + 1 }));

const top10ParticipantIds = mockLeaderboardData.slice(0, 10).map(p => p.id);

const generateTrendDataForParticipant = (participantId: string, name: string): ParticipantTrend => {
  const trendData: ParticipantTrendDataPoint[] = [];
  let lastPhysical = 20 + Math.floor(Math.random() * 20);
  let lastMental = 8 + Math.floor(Math.random() * 10);
  for (let i = 0; i < 5; i++) { // 5 data points
    const date = new Date(2024, 6, 1 + i * 7).toISOString().split('T')[0]; // Weekly data for July
    lastPhysical = Math.max(15, lastPhysical + (Math.random() * 6 - 3)); // Fluctuate by +/-3
    lastMental = Math.max(5, lastMental + (Math.random() * 4 - 2)); // Fluctuate by +/-2
    trendData.push({
      date,
      physicalTime: parseFloat(lastPhysical.toFixed(1)),
      mentalTime: parseFloat(lastMental.toFixed(1)),
      weightedTotalTime: parseFloat(calculateWeightedTotalTime(lastPhysical, lastMental, 0).toFixed(1)), // Assuming 0 extra time for trends simplicity
    });
  }
  return { participantId, participantName: name, trendData };
};

const allParticipantTrendsData: ParticipantTrend[] = mockParticipantsList.map(p => generateTrendDataForParticipant(p.id, p.name));

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary-foreground))", // Re-using some theme colors
  "hsl(var(--muted-foreground))",
  "hsl(var(--foreground))",
];

const commonDates = allParticipantTrendsData.length > 0 ? allParticipantTrendsData[0].trendData.map(d => d.date).sort() : [];

function formatDataForChart(
  participantIds: string[],
  allTrends: ParticipantTrend[],
  dataKey: keyof Pick<ParticipantTrendDataPoint, 'physicalTime' | 'mentalTime' | 'weightedTotalTime'>
): { chartData: any[], chartConfig: ChartConfig } {
  const relevantTrends = allTrends.filter(t => participantIds.includes(t.participantId));
  if (relevantTrends.length === 0) return { chartData: [], chartConfig: {} };

  const chartData = commonDates.map(date => {
    const dataPoint: any = { date };
    relevantTrends.forEach(trend => {
      const trendPoint = trend.trendData.find(dp => dp.date === date);
      dataPoint[trend.participantName] = trendPoint ? trendPoint[dataKey] : null;
    });
    return dataPoint;
  });

  const chartConfig: ChartConfig = {};
  relevantTrends.forEach((trend, index) => {
    chartConfig[trend.participantName] = {
      label: trend.participantName,
      color: chartColors[index % chartColors.length],
    };
  });

  return { chartData, chartConfig };
}


export default function TrendsPage() {
  const [loading, setLoading] = useState(true);
  const [participantsForSelection, setParticipantsForSelection] = useState<Participant[]>([]);
  const [selectedIdsForComparison, setSelectedIdsForComparison] = useState<string[]>([]);

  useEffect(() => {
    // Simulate fetching data
    const timer = setTimeout(() => {
      setParticipantsForSelection(mockParticipantsList);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  const top10Physical = useMemo(() => {
    return formatDataForChart(top10ParticipantIds, allParticipantTrendsData, 'physicalTime');
  }, []);

  const top10Mental = useMemo(() => {
    return formatDataForChart(top10ParticipantIds, allParticipantTrendsData, 'mentalTime');
  }, []);

  const comparisonChart = useMemo(() => {
    if (selectedIdsForComparison.length === 0) return { chartData: [], chartConfig: {} };
    return formatDataForChart(selectedIdsForComparison, allParticipantTrendsData, 'weightedTotalTime');
  }, [selectedIdsForComparison]);


  const handleParticipantSelection = (participantId: string, checked: boolean) => {
    setSelectedIdsForComparison(prev =>
      checked ? [...prev, participantId] : prev.filter(id => id !== participantId)
    );
  };

  const renderChart = (title: string, description: string, data: any[], config: ChartConfig, yAxisLabel: string) => {
    if (loading && data.length === 0) {
      return <Skeleton className="h-[400px] w-full" />;
    }
    if (!loading && data.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No data available for this chart.</p>;
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
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
        description="Analyze participant performance over time with comparative charts."
      />
      <div className="space-y-8">
        {renderChart(
          "Top 10 - Physical Challenge Trends",
          "Comparison of physical challenge times (lower is better) for the top 10 ranked participants.",
          top10Physical.chartData,
          top10Physical.chartConfig,
          "Physical Time (min)"
        )}

        {renderChart(
          "Top 10 - Mental Challenge Trends",
          "Comparison of mental challenge times (lower is better) for the top 10 ranked participants.",
          top10Mental.chartData,
          top10Mental.chartConfig,
          "Mental Time (min)"
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Custom Participant Comparison</CardTitle>
            <CardDescription>Select participants below to compare their weighted total time trends (lower is better).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Select Participants:</h3>
              {loading && participantsForSelection.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : participantsForSelection.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {participantsForSelection.map((participant) => (
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
                 <p className="text-center text-muted-foreground py-4">No participants available for selection.</p>
              )}
            </div>
            {selectedIdsForComparison.length > 0 ? (
                 renderChart(
                    `Comparison: ${selectedIdsForComparison.map(id => mockParticipantsList.find(p=>p.id===id)?.name).filter(Boolean).join(', ')}`,
                    "Weighted total time trends for selected participants.",
                    comparisonChart.chartData,
                    comparisonChart.chartConfig,
                    "Weighted Time (min)"
                  )
            ) : !loading && (
                <p className="text-center text-muted-foreground py-8">Select one or more participants to see their comparison.</p>
            )}
             {loading && selectedIdsForComparison.length > 0 && comparisonChart.chartData.length === 0 && (
                <Skeleton className="h-[400px] w-full mt-4" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

