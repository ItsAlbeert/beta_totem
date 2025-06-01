
"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig, Participant, Score, Game, GameCategory, SingleMetricDataPoint } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getParticipants, getScores, getGames } from "@/lib/firestore-services";

const chartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary-foreground))", "hsl(var(--muted-foreground))",
];

const getColor = (index: number) => chartColors[index % chartColors.length];

interface ProcessedPageData {
  participants: Participant[];
  scores: Score[];
  games: Game[];
  latestScoresMap: Map<string, Score>;
  participantsMap: Map<string, Participant>;
  gamesMap: Map<string, Game>;
}

export default function TrendsPage() {
  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: scores = [], isLoading: isLoadingScores } = useQuery<Score[]>({
    queryKey: ["scores"],
    queryFn: getScores,
  });

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const isLoadingOverall = isLoadingParticipants || isLoadingScores || isLoadingGames;

  const processedData = useMemo((): ProcessedPageData | null => {
    if (isLoadingOverall) return null;

    const participantsMap = new Map(participants.map(p => [p.id, p]));
    const gamesMap = new Map(games.map(g => [g.id, g]));

    const latestScoresMap = new Map<string, Score>();
    scores.forEach(score => {
      const existing = latestScoresMap.get(score.participantId);
      if (!existing || new Date(score.recordedAt).getTime() > new Date(existing.recordedAt).getTime()) {
        latestScoresMap.set(score.participantId, score);
      }
    });
    return { participants, scores, games, latestScoresMap, participantsMap, gamesMap };
  }, [participants, scores, games, isLoadingOverall]);


  const categoryTotalTimeChartData = useMemo(() => {
    if (!processedData) return { Physical: [], Mental: [], Extra: [] };
    const { participants, latestScoresMap, participantsMap } = processedData;
    
    const result: { [key in GameCategory]: SingleMetricDataPoint[] } = { Physical: [], Mental: [], Extra: [] };

    (['Physical', 'Mental', 'Extra'] as GameCategory[]).forEach(category => {
      participants.forEach(p => {
        const latestScore = latestScoresMap.get(p.id);
        if (latestScore) {
          let scoreValue: number | null = null;
          if (category === 'Physical') scoreValue = latestScore.physicalTime;
          else if (category === 'Mental') scoreValue = latestScore.mentalTime;
          else if (category === 'Extra' && latestScore.extraTime !== undefined) scoreValue = latestScore.extraTime;
          
          if (scoreValue !== null && scoreValue !== undefined) { 
             result[category].push({ name: participantsMap.get(p.id)?.name || p.id, score: scoreValue });
          }
        }
      });
       result[category].sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity)); 
    });
    return result;
  }, [processedData]);


  const individualGameChartData = useMemo(() => {
    if (!processedData) return {};
    const { participants, games, latestScoresMap, participantsMap } = processedData;
    const result: { [gameId: string]: SingleMetricDataPoint[] } = {};

    games.forEach(game => {
      result[game.id] = [];
      participants.forEach(p => {
        const latestScore = latestScoresMap.get(p.id);
        const gameTime = latestScore?.gameTimes?.[game.id];
        if (gameTime !== undefined && gameTime !== null) { 
          result[game.id].push({ name: participantsMap.get(p.id)?.name || p.id, score: gameTime });
        }
      });
      result[game.id].sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity)); 
    });
    return result;
  }, [processedData]);

  const renderBarChart = (title: string, description: string, data: SingleMetricDataPoint[], dataKey: string = "score", yAxisLabel: string = "Time (min)", chartKeySuffix: string, mainChart: boolean = false) => {
    const chartUniqueKey = `chart-${chartKeySuffix}-${mainChart ? 'main' : 'sub'}`;
    if (isLoadingOverall && data.length === 0) return <Skeleton className={cn(mainChart ? "h-[400px]" : "h-[300px]", "w-full shadow-lg")} key={`${chartUniqueKey}-skeleton`} />;
    if (!isLoadingOverall && data.length === 0) return <p className="text-center text-muted-foreground py-4 col-span-full" key={`${chartUniqueKey}-nodata`}>No data available for this chart.</p>;
    
    const config: ChartConfig = { [dataKey]: { label: yAxisLabel, color: getColor(mainChart ? 0 : Math.floor(Math.random() * 5)) } };

    return (
      <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300", !mainChart && "sm:col-span-1")} key={chartUniqueKey}>
        <CardHeader>
          <CardTitle className={mainChart ? "text-xl" : "text-lg"}>{title}</CardTitle>
          {mainChart && description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className={cn(mainChart ? "h-[350px]" : "h-[250px]", "w-full")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30, top:5, bottom: 20 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" label={{ value: yAxisLabel, position: 'insideBottom', offset: -10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="hsl(var(--muted-foreground))" 
                  tickFormatter={(value) => value.length > 15 ? `${value.substring(0,12)}...` : value}
                  width={100}
                />
                <ChartTooltip cursor={{fill: 'hsl(var(--accent)/0.5)'}} content={<ChartTooltipContent indicator="dashed" />} />
                <Bar dataKey={dataKey} fill={config[dataKey]?.color} radius={4} barSize={mainChart ? 20 : 15} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };
  
  const renderCategorySection = (category: GameCategory, title: string) => {
    if (isLoadingOverall && !processedData) return <Skeleton className="h-[600px] w-full mb-8 shadow-lg" key={`skeleton-cat-${category}`} />;
    
    const categoryGames = processedData?.games.filter(g => g.category === category) || [];
    const categoryTotalData = categoryTotalTimeChartData[category] || [];
    
    return (
      <div className="mb-12" key={`category-section-${category}`}>
        <h2 className="text-3xl font-semibold mb-6 border-b pb-3 text-foreground">{title} Performance</h2>
        {renderBarChart(
          `Overall ${category} Performance`, 
          `Total ${category.toLowerCase()} time for all participants (latest scores). Lower is better.`,
          categoryTotalData,
          "score",
          `${category} Time (min)`,
          `total-${category.toLowerCase()}`,
          true
        )}
        {categoryGames.length > 0 && (
          <>
            <h3 className="text-2xl font-medium mt-10 mb-6 text-foreground/90">Individual {category} Games</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categoryGames.map(game => (
                <div key={game.id}>
                {renderBarChart(
                  game.name,
                  "", 
                  individualGameChartData[game.id] || [],
                  "score",
                  "Time (min)",
                  `game-${game.id}`,
                  false
                )}
                </div>
              ))}
            </div>
          </>
        )}
         {categoryGames.length === 0 && !isLoadingOverall && ( 
             <p className="text-center text-muted-foreground py-4 mt-6">No {category.toLowerCase()} games defined for this category.</p>
        )}
      </div>
    );
  };


  return (
    <>
      <PageHeader
        title="Performance Trends"
        description="Analyze overall category performance and individual game scores based on latest results."
      />
      <div className="space-y-10">
        {isLoadingOverall && !processedData ? (
          <>
            <Skeleton className="h-[600px] w-full mb-8 shadow-lg" key="skeleton-physical" />
            <Skeleton className="h-[600px] w-full mb-8 shadow-lg" key="skeleton-mental" />
            <Skeleton className="h-[600px] w-full shadow-lg" key="skeleton-extra" />
          </>
        ) : (
          <>
            {renderCategorySection('Physical', 'Physical Challenge')}
            {renderCategorySection('Mental', 'Mental Challenge')}
            {renderCategorySection('Extra', 'Extra Bonus')}
          </>
        )}
      </div>
    </>
  );
}
