"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Participant, ParticipantTrend, ParticipantTrendDataPoint } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data
const mockParticipantsList: Participant[] = [
  { id: "1", name: "Alice Wonderland", year: 1, photoUrl: "https://placehold.co/40x40.png" },
  { id: "2", name: "Bob The Builder", year: 2, photoUrl: "https://placehold.co/40x40.png" },
  { id: "3", name: "Charlie Chaplin", year: 3, photoUrl: "https://placehold.co/40x40.png" },
];

const mockTrendsData: ParticipantTrend[] = [
  {
    participantId: "1",
    participantName: "Alice Wonderland",
    trendData: [
      { date: "2024-07-01", weightedTotalTime: 60 },
      { date: "2024-07-08", weightedTotalTime: 58 },
      { date: "2024-07-15", weightedTotalTime: 55 },
      { date: "2024-07-22", weightedTotalTime: 56 },
    ],
  },
  {
    participantId: "2",
    participantName: "Bob The Builder",
    trendData: [
      { date: "2024-07-01", weightedTotalTime: 70 },
      { date: "2024-07-08", weightedTotalTime: 65 },
      { date: "2024-07-15", weightedTotalTime: 61 },
      { date: "2024-07-22", weightedTotalTime: 63 },
    ],
  },
];

const chartConfig = {
  weightedTotalTime: {
    label: "Weighted Time (min)",
    color: "hsl(var(--primary))",
  },
} satisfies Record<string, { label: string; color: string }>;


export default function TrendsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [selectedParticipantTrend, setSelectedParticipantTrend] = useState<ParticipantTrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching participants
    const timer = setTimeout(() => {
      setParticipants(mockParticipantsList);
      if (mockParticipantsList.length > 0) {
        const defaultParticipantId = mockParticipantsList[0].id;
        setSelectedParticipantId(defaultParticipantId);
        const trend = mockTrendsData.find(t => t.participantId === defaultParticipantId);
        setSelectedParticipantTrend(trend ? trend.trendData : []);
      }
      setLoading(false);
    }, 1000);
     return () => clearTimeout(timer);
  }, []);

  const handleParticipantChange = (participantId: string) => {
    setSelectedParticipantId(participantId);
    setLoading(true);
    // Simulate fetching trend data for the selected participant
    setTimeout(() => {
        const trend = mockTrendsData.find(t => t.participantId === participantId);
        setSelectedParticipantTrend(trend ? trend.trendData : []);
        setLoading(false);
    }, 500);
  };
  
  const participantName = participants.find(p => p.id === selectedParticipantId)?.name || "Participant";

  return (
    <>
      <PageHeader
        title="Participant Trends"
        description="Analyze individual participant performance over time."
      />
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Select Participant</CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 && loading ? (
                <Skeleton className="h-10 w-full max-w-sm" />
            ) : (
            <Select onValueChange={handleParticipantChange} value={selectedParticipantId || ""}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Select a participant" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
          </CardContent>
        </Card>

        {selectedParticipantId && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Performance Trend: {participantName}</CardTitle>
              <CardDescription>
                Weighted total time over recent recordings (lower is better).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && selectedParticipantTrend.length === 0 ? (
                 <Skeleton className="h-[400px] w-full" />
              ) : selectedParticipantTrend.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={selectedParticipantTrend}
                      margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        label={{ value: 'Time (min)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        type="monotone"
                        dataKey="weightedTotalTime"
                        stroke="var(--color-weightedTotalTime)"
                        strokeWidth={2}
                        dot={{
                          fill: "var(--color-weightedTotalTime)",
                          r: 4,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                 <p className="text-center text-muted-foreground py-8">No trend data available for {participantName}.</p>
              )}
            </CardContent>
          </Card>
        )}
         {!selectedParticipantId && !loading && (
             <p className="text-center text-muted-foreground py-8">Please select a participant to view their trend data.</p>
         )}
      </div>
    </>
  );
}
