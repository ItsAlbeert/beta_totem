
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
import type { ChartConfig, Participant, Score, Game, PerformanceOverTimeDataPoint, MultiMetricDataPoint, LeaderboardEntry, ScoringSettings } from "@/types";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
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
  scoringSettings: ScoringSettings;
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

    return { participants, allScores, games, participantsMap, gamesMap, scoringSettings };
  }, [participants, allScores, games, scoringSettings, isLoadingOverall, overallError]);


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

  const participantPTotalComparisonChart = useMemo(() => {
    if (!processedData || selectedParticipantIdsForComparison.length === 0 || !processedData.allScores.length || !processedData.scoringSettings) {
      return { chartData: [], chartConfig: {} };
    }
    const { participantsMap, allScores: allScoresList, games: allGamesList, participants: allParticipantsList, scoringSettings: currentSettings } = processedData;
    
    const chartDataPoints: { [participantName: string]: { time: string, value: number }[] } = {};

    selectedParticipantIdsForComparison.forEach(pid => {
      const participantName = participantsMap.get(pid)?.name || pid;
      chartDataPoints[participantName] = [];

      const participantScoresRaw = allScoresList
        .filter(s => s.participantId === pid)
        .sort((a,b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

      participantScoresRaw.forEach(score => {
        // For historical points, we need to calculate P_Total with THIS specific score as the "latest"
        // for THIS participant, considering all other participants' scores up to this point are irrelevant
        // for THIS specific calculation. This is simplified; a true historical comparison would be complex.
        // For simplicity here, we'll use the current global settings but only this score for this participant.
        const tempParticipantArray = allParticipantsList.filter(p => p.id === pid);
        
        // Create a temporary "allScores" array for calculation that only includes this specific score
        // and any previous scores for this participant to establish their own historical context if needed,
        // though the current calculateAllParticipantScores uses only the *absolute* latest.
        // For trend, we need P_Total based on *this* score being the latest.
        const scoresForThisCalculationPoint = [score]; 

        const singleEntryCalculation = calculateAllParticipantScores(tempParticipantArray, scoresForThisCalculationPoint, allGamesList, currentSettings);
        
        if (singleEntryCalculation.length > 0) {
          const p_total = singleEntryCalculation[0].puntos_total;
          chartDataPoints[participantName].push({ 
            time: format(parseISO(score.recordedAt), "d MMM, HH:mm", { locale: es }), 
            value: parseFloat(p_total.toFixed(1)) 
          });
        }
      });
    });
    
    const allTimestamps = Array.from(new Set(Object.values(chartDataPoints).flat().map(dp => dp.time)))
      .sort((a, b) => {
        const dateA = parseISO(allScoresList.find(s => format(parseISO(s.recordedAt), "d MMM, HH:mm", { locale: es }) === a)?.recordedAt || new Date(0).toISOString());
        const dateB = parseISO(allScoresList.find(s => format(parseISO(s.recordedAt), "d MMM, HH:mm", { locale: es }) === b)?.recordedAt || new Date(0).toISOString());
        return dateA.getTime() - dateB.getTime();
      });


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


  const gameComparisonChart = useMemo(() => {
    if (!processedData || selectedGameIdsForComparison.length === 0 || !processedData.allScores.length || !processedData.scoringSettings) {
         return { chartData: [], chartConfig: {} };
    }
    const { participants: allParticipantsList, games: allGamesList, allScores: allScoresList, participantsMap, gamesMap, scoringSettings: currentSettings } = processedData;

    const selectedGames = selectedGameIdsForComparison
        .map(id => gamesMap.get(id))
        .filter(Boolean)
        .filter(game => game!.category === 'Physical' || game!.category === 'Mental') as Game[]; 

    if (selectedGames.length === 0) return { chartData: [], chartConfig: {} };

    const leaderboardForLatestScores = calculateAllParticipantScores(allParticipantsList, allScoresList, allGamesList, currentSettings);

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
      chartConfig[game.name] = { label: `${game.name} (Tiempo)`, color: getColor(index + selectedParticipantIdsForComparison.length) }; 
    });

    return { chartData, chartConfig };
  }, [processedData, selectedGameIdsForComparison, selectedParticipantIdsForComparison.length]);


  const renderLineChart = (title: string, description: string, data: PerformanceOverTimeDataPoint[], config: ChartConfig, yAxisLabel: string = "Puntos (Pᴛ)") => {
    if (isLoadingOverall && (!processedData || !processedData.scoringSettings) && data.length === 0 && selectedParticipantIdsForComparison.length === 0) return <Skeleton className="h-[400px] w-full shadow-lg" />;
    if (!isLoadingOverall && selectedParticipantIdsForComparison.length > 0 && data.length === 0) return <p className="text-center text-muted-foreground py-8">No hay puntuaciones registradas para el/los participante(s) seleccionado(s) o no hay datos para graficar.</p>;
    if (selectedParticipantIdsForComparison.length === 0) return <p className="text-center text-muted-foreground py-8">Selecciona participantes para comparar su tendencia de Puntos Totales (Pᴛ).</p>;
    
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

  const renderGroupedBarChart = (title: string, description: string, data: MultiMetricDataPoint[], config: ChartConfig, yAxisLabel: string = "Tiempo (min)") => {
    if (isLoadingOverall && (!processedData || !processedData.scoringSettings) && data.length === 0 && selectedGameIdsForComparison.length === 0) return <Skeleton className="h-[400px] w-full shadow-lg" />;
    if (!isLoadingOverall && selectedGameIdsForComparison.length > 0 && data.length === 0 ) return <p className="text-center text-muted-foreground py-8">No hay datos para los juegos seleccionados o participantes con puntuaciones en esos juegos.</p>;
    if (selectedGameIdsForComparison.length === 0) return <p className="text-center text-muted-foreground py-8">Selecciona juegos Físicos/Mentales para comparar tiempos brutos de rendimiento.</p>;

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
    return <p className="text-destructive text-center py-8">Error al cargar los datos de comparativas: {(overallError as Error).message}</p>;
  }

  return (
    <>
      <PageHeader
        title="Comparativas"
        description="Selecciona participantes o juegos abajo para comparaciones específicas."
      />
      
      {isLoadingOverall && (!processedData || !processedData.scoringSettings) ? (
        <div className="space-y-8">
            <Skeleton className="h-[600px] w-full shadow-lg" />
            <Skeleton className="h-[600px] w-full shadow-lg" />
        </div>
      ) : (
      <div className="space-y-10">
        <div>
          <h3 className="text-2xl font-semibold mb-3 text-foreground">Tendencia de Puntos Totales (Pᴛ) por Participante</h3>
          <p className="text-sm text-muted-foreground mb-4">Compara las tendencias de Puntos Totales (Pᴛ) para los participantes seleccionados a través de todos sus registros de puntuación. Más Pᴛ es mejor.</p>
          <div className="mb-6 p-4 border rounded-md bg-card shadow-sm">
            <h4 className="text-md font-semibold mb-3 text-card-foreground/90">Seleccionar Participantes:</h4>
            {processedData && processedData.participants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedData.participants.map((p) => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <Checkbox id={`compare-trend-${p.id}`} checked={selectedParticipantIdsForComparison.includes(p.id)} onCheckedChange={(checked) => handleParticipantSelection(p.id, !!checked)} />
                    <Label htmlFor={`compare-trend-${p.id}`} className="text-sm font-normal cursor-pointer hover:text-primary transition-colors">{p.name}</Label>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No hay participantes disponibles.</p>}
          </div>
          {renderLineChart(
            "Tendencia de Puntos Totales (Pᴛ) por Participante", 
            "",
            participantPTotalComparisonChart.chartData,
            participantPTotalComparisonChart.chartConfig,
            "Puntos Totales (Pᴛ)"
          )}
        </div>

        <div>
          <h3 className="text-2xl font-semibold mb-3 text-foreground">Comparativa de Rendimiento en Juegos (Tiempos Brutos)</h3>
          <p className="text-sm text-muted-foreground mb-4">Compara los tiempos brutos de rendimiento de los participantes en los juegos Físicos/Mentales seleccionados (basado en las últimas puntuaciones). Menor tiempo es mejor.</p>
          <div className="mb-6 p-4 border rounded-md bg-card shadow-sm">
            <h4 className="text-md font-semibold mb-3 text-card-foreground/90">Seleccionar Juegos Físicos/Mentales:</h4>
            {processedData && processedData.games.filter(g => g.category === 'Physical' || g.category === 'Mental').length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedData.games.filter(g => g.category === 'Physical' || g.category === 'Mental').map((g) => (
                  <div key={g.id} className="flex items-center space-x-2">
                    <Checkbox id={`compare-game-${g.id}`} checked={selectedGameIdsForComparison.includes(g.id)} onCheckedChange={(checked) => handleGameSelection(g.id, !!checked)} />
                    <Label htmlFor={`compare-game-${g.id}`} className="text-sm font-normal cursor-pointer hover:text-primary transition-colors">{g.name} <span className="text-xs text-muted-foreground">({g.category === 'Physical' ? 'Físico' : 'Mental'})</span></Label>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No hay juegos Físicos o Mentales disponibles para comparación.</p>}
          </div>
          {renderGroupedBarChart(
            "Comparativa de Rendimiento en Juegos (Tiempos Brutos)", 
            "", 
            gameComparisonChart.chartData,
            gameComparisonChart.chartConfig,
            "Tiempo (min)"
          )}
        </div>
      </div>
      )}
    </>
  );
}
