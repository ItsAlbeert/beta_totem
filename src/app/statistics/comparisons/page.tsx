
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
import type { ChartConfig, Participant, Score, Game, MultiMetricDataPoint, ScoringSettings } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getParticipants, getScores, getGames, getScoringSettings } from "@/lib/firestore-services";
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
  leaderboardData: MultiMetricDataPoint[];
  scoringSettings: ScoringSettings;
}

export default function ComparisonsPage() {
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);

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

  const { data: scoringSettings, isLoading: isLoadingSettings, error: errorSettings } = useQuery<ScoringSettings>({
    queryKey: ["scoringSettings"],
    queryFn: getScoringSettings,
  });

  const isLoadingOverall = isLoadingParticipants || isLoadingScores || isLoadingGames || isLoadingSettings;
  const overallError = errorParticipants || errorScores || errorGames || errorSettings;

  const processedData = useMemo((): ProcessedPageData | null => {
    if (isLoadingOverall || overallError || !participants.length || !allScores.length || !games.length || !scoringSettings) return null;

    const participantsMap = new Map(participants.map(p => [p.id, p]));
    const gamesMap = new Map(games.map(g => [g.id, g]));
    const leaderboardData = calculateAllParticipantScores(participants, allScores, games, scoringSettings);

    return { participants, allScores, games, participantsMap, gamesMap, leaderboardData, scoringSettings };
  }, [participants, allScores, games, scoringSettings, isLoadingOverall, overallError]);


  const handleParticipantSelection = (participantId: string, checked: boolean) => {
    setSelectedParticipantIds(prev =>
      checked ? [...prev, participantId] : prev.filter(id => id !== participantId)
    );
  };

  const handleGameSelection = (gameId: string, checked: boolean) => {
    setSelectedGameIds(prev =>
      checked ? [...prev, gameId] : prev.filter(id => id !== gameId)
    );
  };
  
  const comparisonChart = useMemo(() => {
    if (!processedData || selectedParticipantIds.length === 0 || selectedGameIds.length === 0) {
      return { chartData: [], chartConfig: {} };
    }
    
    const { leaderboardData, gamesMap } = processedData;

    const selectedParticipantsData = leaderboardData.filter(entry => selectedParticipantIds.includes(entry.id));

    const selectedGames = selectedGameIds
        .map(id => gamesMap.get(id))
        .filter(Boolean)
        .filter(game => game!.category === 'Physical' || game!.category === 'Mental') as Game[]; 

    if (selectedParticipantsData.length === 0 || selectedGames.length === 0) {
      return { chartData: [], chartConfig: {} };
    }
    
    const chartData: MultiMetricDataPoint[] = selectedParticipantsData.map(entry => {
      const participantName = entry.name;
      const dataPoint: MultiMetricDataPoint = { name: participantName };
      selectedGames.forEach(game => {
        dataPoint[game.id] = entry.gameTimes?.[game.id] ?? null; 
      });
      return dataPoint;
    });
    
    const chartConfig: ChartConfig = {};
    selectedGames.forEach((game, index) => {
      chartConfig[game.id] = { label: game.name, color: getColor(index) }; 
    });

    return { chartData, chartConfig };
  }, [processedData, selectedParticipantIds, selectedGameIds]);


  if (overallError) {
    return <p className="text-destructive text-center py-8">Error al cargar los datos de comparativas: {(overallError as Error).message}</p>;
  }
  
  const physicalAndMentalGames = games.filter(g => g.category === 'Physical' || g.category === 'Mental');

  return (
    <>
      <PageHeader
        title="Comparativas de Rendimiento"
        description="Compara los tiempos brutos (en minutos) de participantes específicos en los juegos seleccionados. Menor tiempo es mejor."
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Selection Panel */}
        <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Panel de Selección</CardTitle>
            <CardDescription>Elige qué quieres comparar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-md font-semibold text-card-foreground/90">Participantes</h4>
              {isLoadingParticipants ? <Skeleton className="h-24 w-full" /> : participants.length > 0 ? (
                <ScrollArea className="h-48 pr-4">
                  <div className="flex flex-col gap-3">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center space-x-2">
                        <Checkbox id={`compare-p-${p.id}`} checked={selectedParticipantIds.includes(p.id)} onCheckedChange={(checked) => handleParticipantSelection(p.id, !!checked)} />
                        <Label htmlFor={`compare-p-${p.id}`} className="text-sm font-normal cursor-pointer hover:text-primary transition-colors">{p.name}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : <p className="text-sm text-muted-foreground">No hay participantes disponibles.</p>}
            </div>
            
            <div className="space-y-3">
              <h4 className="text-md font-semibold text-card-foreground/90">Juegos (Físicos/Mentales)</h4>
              {isLoadingGames ? <Skeleton className="h-24 w-full" /> : physicalAndMentalGames.length > 0 ? (
                <ScrollArea className="h-48 pr-4">
                  <div className="flex flex-col gap-3">
                    {physicalAndMentalGames.map((g) => (
                      <div key={g.id} className="flex items-center space-x-2">
                        <Checkbox id={`compare-g-${g.id}`} checked={selectedGameIds.includes(g.id)} onCheckedChange={(checked) => handleGameSelection(g.id, !!checked)} />
                        <Label htmlFor={`compare-g-${g.id}`} className="text-sm font-normal cursor-pointer hover:text-primary transition-colors">{g.name}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : <p className="text-sm text-muted-foreground">No hay juegos Físicos o Mentales para comparar.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Chart Panel */}
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 min-h-[500px]">
          <CardHeader>
            <CardTitle>Gráfica de Comparación de Tiempos</CardTitle>
            <CardDescription>Tiempos en minutos. Una barra más baja indica un mejor rendimiento.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOverall ? (
              <Skeleton className="h-[400px] w-full" />
            ) : selectedParticipantIds.length === 0 || selectedGameIds.length === 0 ? (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-center text-muted-foreground">Selecciona al menos un participante y un juego para ver la comparativa.</p>
              </div>
            ) : comparisonChart.chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-center text-muted-foreground">No hay datos de tiempo registrados para la selección actual.</p>
              </div>
            ) : (
              <ChartContainer config={comparisonChart.chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChart.chartData} margin={{ top: 5, right: 30, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tickFormatter={(value) => value.length > 10 ? `${value.substring(0,7)}...` : value} stroke="hsl(var(--muted-foreground))" angle={-30} textAnchor="end" height={60} />
                    <YAxis label={{ value: "Tiempo (min)", angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', dx: -10 }} stroke="hsl(var(--muted-foreground))" domain={[0, 'auto']}/>
                    <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    {Object.keys(comparisonChart.chartConfig).map((gameId) => (
                      <Bar key={gameId} dataKey={gameId} fill={`var(--color-${gameId})`} radius={4} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
