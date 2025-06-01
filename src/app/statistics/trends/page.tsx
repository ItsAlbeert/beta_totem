
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
import type { ChartConfig, Participant, Score, Game, GameCategory, SingleMetricDataPoint, LeaderboardEntry } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  leaderboardForLatestScores: LeaderboardEntry[]; 
  participantsMap: Map<string, Participant>;
  gamesMap: Map<string, Game>;
}

export default function TrendsPage() {
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
    
    const leaderboardForLatestScores = calculateAllParticipantScores(participants, allScores, games);

    return { participants, allScores, games, leaderboardForLatestScores, participantsMap, gamesMap };
  }, [participants, allScores, games, isLoadingOverall, overallError]);


  const categoryNormalizedScoreChartData = useMemo(() => {
    if (!processedData) return { Physical: [], Mental: [], Extra: [] };
    const { leaderboardForLatestScores, participantsMap } = processedData;
    
    const result: { [key in GameCategory | string]: SingleMetricDataPoint[] } = { Physical: [], Mental: [], Extra: [] };

    leaderboardForLatestScores.forEach(entry => {
      const participantName = participantsMap.get(entry.id)?.name || entry.id;
      result.Physical.push({ name: participantName, score: entry.puntuacion_fisica_normalizada });
      result.Mental.push({ name: participantName, score: entry.puntuacion_mental_normalizada });
      result.Extra.push({ name: participantName, score: entry.puntuacion_extra_normalizada });
    });

    Object.keys(result).forEach(cat => {
        (result[cat as GameCategory] as SingleMetricDataPoint[]).sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
    });
    return result;
  }, [processedData]);

  const individualGameChartData = useMemo(() => {
    if (!processedData) return {};
    const { games: allGames, leaderboardForLatestScores, participantsMap } = processedData; // Renamed games to allGames for clarity
    const result: { [gameId: string]: SingleMetricDataPoint[] } = {};

    allGames.filter(game => game.category === 'Physical' || game.category === 'Mental').forEach(game => {
      result[game.id] = [];
      leaderboardForLatestScores.forEach(entry => {
        const gameTime = entry.gameTimes?.[game.id];
        if (gameTime !== undefined && gameTime !== null) { 
          result[game.id].push({ name: participantsMap.get(entry.id)?.name || entry.id, score: gameTime });
        }
      });
      result[game.id].sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity)); 
    });
    return result;
  }, [processedData]);


  const renderBarChart = (
    title: string, 
    description: string, 
    data: SingleMetricDataPoint[], 
    dataKey: string = "score", 
    yAxisLabel: string = "Score (pts)", 
    chartKeySuffix: string, 
    mainChart: boolean = false,
    lowerIsBetter: boolean = false 
  ) => {
    const chartUniqueKey = `chart-${chartKeySuffix}-${mainChart ? 'main' : 'sub'}`;
    if (isLoadingOverall && !processedData && data.length === 0) return <Skeleton className={cn(mainChart ? "h-[400px]" : "h-[300px]", "w-full shadow-lg")} key={`${chartUniqueKey}-skeleton`} />;
    if (!isLoadingOverall && data.length === 0) return <p className="text-center text-muted-foreground py-4 col-span-full" key={`${chartUniqueKey}-nodata`}>No data available for this chart.</p>;
    
    const config: ChartConfig = { [dataKey]: { label: yAxisLabel, color: getColor(mainChart ? 0 : Math.floor(Math.random() * 5) + 1) } };

    return (
      <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300", !mainChart && "sm:col-span-1")} key={chartUniqueKey}>
        <CardHeader>
          <CardTitle className={mainChart ? "text-xl" : "text-lg"}>{title}</CardTitle>
          {mainChart && description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className={cn(mainChart ? "h-[350px]" : "h-[250px]", "w-full")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30, top:5, bottom: 35 /* Increased bottom margin */ }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                    type="number" 
                    stroke="hsl(var(--muted-foreground))" 
                    label={{ value: yAxisLabel, position: 'insideBottom', offset: -15 /* Adjusted offset */, fill: 'hsl(var(--muted-foreground))' }} 
                    domain={lowerIsBetter ? ['auto', 'auto'] : [0, 'auto']} // Adjusted domain for lowerIsBetter
                />
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
  
  const renderCategorySection = (category: GameCategory, titleSuffix: string) => {
    if (isLoadingOverall && !processedData) return <Skeleton className="h-[600px] w-full mb-8 shadow-lg" key={`skeleton-cat-${category}`} />;
    
    const categoryGames = processedData?.games.filter(g => g.category === category) || [];
    const categoryTotalData = categoryNormalizedScoreChartData[category] || [];
    
    const yAxisLabel = category === 'Extra' ? `${category} Score (S_e)` : `${category} Score (S_${category.substring(0,1).toLowerCase()})`;
    const description = category === 'Extra' 
      ? `Normalized ${category.toLowerCase()} score (0-100) from status. Higher is better.`
      : `Normalized ${category.toLowerCase()} score (0-100) from total time. Higher is better.`;

    return (
      <div className="mb-12" key={`category-section-${category}`}>
        <h2 className="text-3xl font-semibold mb-6 border-b pb-3 text-foreground">{titleSuffix} Performance (Normalized Scores)</h2>
        {renderBarChart(
          `Overall ${category} Normalized Score`, 
          description,
          categoryTotalData,
          "score",
          yAxisLabel,
          `total-norm-${category.toLowerCase()}`,
          true,
          false 
        )}

        {/* Individual game charts for Physical and Mental categories only */}
        { (category === 'Physical' || category === 'Mental') && categoryGames.length > 0 && (
          <>
            <h3 className="text-2xl font-medium mt-10 mb-6 text-foreground/90">Individual {category} Games (Raw Times)</h3>
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
                  false,
                  true 
                )}
                </div>
              ))}
            </div>
          </>
        )}
         { (category === 'Physical' || category === 'Mental') && categoryGames.length === 0 && !isLoadingOverall && !overallError && ( 
             <p className="text-center text-muted-foreground py-4 mt-6">No {category.toLowerCase()} games defined for this category.</p>
        )}
        { category === 'Extra' && categoryGames.length === 0 && !isLoadingOverall && !overallError && (
            <p className="text-center text-muted-foreground py-4 mt-6">No Extra games defined. Add 'Extra' category games on the Games page to see status-based scores here.</p>
        )}
         { category === 'Extra' && categoryGames.length > 0 && (
            <p className="text-center text-muted-foreground py-4 mt-6">Individual 'Extra' game statuses are part of the overall S_e calculation. View detailed statuses in the Leaderboard.</p>
        )}
      </div>
    );
  };

  if (overallError) {
    return <p className="text-destructive text-center py-8">Error loading trends data: {(overallError as Error).message}</p>;
  }

  return (
    <>
      <PageHeader
        title="Performance Trends"
        description="Analyze overall category normalized scores and individual game raw times based on latest results."
      />
      <div className="space-y-10">
        {isLoadingOverall && !processedData ? (
          <>
            <Skeleton className="h-[600px] w-full mb-8 shadow-lg" key="skeleton-physical-norm" />
            <Skeleton className="h-[600px] w-full mb-8 shadow-lg" key="skeleton-mental-norm" />
            <Skeleton className="h-[600px] w-full shadow-lg" key="skeleton-extra-norm" />
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
