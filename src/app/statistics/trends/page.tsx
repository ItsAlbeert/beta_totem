
"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import type { ChartConfig, Participant, Score, Game, GameCategory, SingleMetricDataPoint, LeaderboardEntry, ScoringSettings } from "@/types";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { getParticipants, getScores, getGames, getScoringSettings } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils";
import { TrendingUp, Trophy, Timer, Target, Activity, Users, Zap } from "lucide-react";

// --- New Modern Components & Data Processing ---

const modernChartColors = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444",
  "#6366F1", "#EC4899", "#14B8A6", "#F97316"
];

const getColor = (index: number) => modernChartColors[index % modernChartColors.length];

const ModernTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-2xl">
        <p className="text-muted-foreground text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-foreground font-medium" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            {entry.name.includes('Tiempo') ? ' min' : ' pts'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ icon: Icon, title, value, colorClass }: {
  icon: React.ElementType, title: string, value: string, colorClass: string
}) => (
  <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
      <p className="text-foreground text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

interface ProcessedPageData {
  participants: Participant[];
  allScores: Score[]; 
  games: Game[];
  leaderboardForLatestScores: LeaderboardEntry[]; 
  participantsMap: Map<string, Participant>;
  gamesMap: Map<string, Game>;
  scoringSettings: ScoringSettings;
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
    
    const leaderboardForLatestScores = calculateAllParticipantScores(participants, allScores, games, scoringSettings);

    return { participants, allScores, games, leaderboardForLatestScores, participantsMap, gamesMap, scoringSettings };
  }, [participants, allScores, games, scoringSettings, isLoadingOverall, overallError]);

  const radarData = useMemo(() => {
    if (!processedData) return [];
    return processedData.leaderboardForLatestScores.slice(0, 5).map(entry => ({
      subject: processedData.participantsMap.get(entry.id)?.name.split(' ')[0] || entry.id,
      'P. Físico': entry.puntos_fisico || 0,
      'P. Mental': entry.puntos_mental || 0,
      'P. Extras': entry.puntos_extras || 0,
      fullMark: 100,
    }));
  }, [processedData]);

  const progressAreaData = useMemo(() => {
    if (!processedData) return [];
    return processedData.leaderboardForLatestScores.map((entry, index) => ({
      name: processedData.participantsMap.get(entry.id)?.name.split(' ')[0] || entry.id,
      posicion: index + 1,
      'Puntos Físico': entry.puntos_fisico || 0,
      'Puntos Mental': entry.puntos_mental || 0,
      'Puntos Extra': entry.puntos_extras || 0,
    }));
  }, [processedData]);

  const statsData = useMemo(() => {
    if (!processedData) return null;
    const { leaderboardForLatestScores } = processedData;
    const totalParticipants = leaderboardForLatestScores.length;
    if (totalParticipants === 0) return { totalParticipants: 0, avgPhysical: '0', avgMental: '0', maxTotal: '0' };
    
    const avgPhysical = leaderboardForLatestScores.reduce((sum, entry) => sum + (entry.puntos_fisico || 0), 0) / totalParticipants;
    const avgMental = leaderboardForLatestScores.reduce((sum, entry) => sum + (entry.puntos_mental || 0), 0) / totalParticipants;
    const maxTotal = Math.max(...leaderboardForLatestScores.map(entry => entry.puntos_total || 0));
    
    return {
      totalParticipants,
      avgPhysical: avgPhysical.toFixed(1),
      avgMental: avgMental.toFixed(1),
      maxTotal: maxTotal.toFixed(1)
    };
  }, [processedData]);
  
  const categoryPointsChartData = useMemo(() => {
    if (!processedData) return { Physical: [], Mental: [], Extra: [] };
    const { leaderboardForLatestScores, participantsMap } = processedData;
    const result: { [key in GameCategory | string]: SingleMetricDataPoint[] } = { Physical: [], Mental: [], Extra: [] };
    leaderboardForLatestScores.forEach(entry => {
      const participantName = participantsMap.get(entry.id)?.name || entry.id;
      result.Physical.push({ name: participantName, score: entry.puntos_fisico });
      result.Mental.push({ name: participantName, score: entry.puntos_mental });
      result.Extra.push({ name: participantName, score: entry.puntos_extras });
    });
    Object.keys(result).forEach(cat => {
        (result[cat as GameCategory] as SingleMetricDataPoint[]).sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity)); 
    });
    return result;
  }, [processedData]);

  const individualGameTimeChartData = useMemo(() => {
    if (!processedData) return {};
    const { games: allGamesList, leaderboardForLatestScores, participantsMap } = processedData;
    const result: { [gameId: string]: SingleMetricDataPoint[] } = {};
    allGamesList.filter(game => game.category === 'Physical' || game.category === 'Mental').forEach(game => {
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

  const renderModernBarChart = (
    title: string, 
    data: SingleMetricDataPoint[], 
    dataKey: string = "score", 
    yAxisLabel: string = "Puntos", 
    color: string,
    lowerIsBetter: boolean = false
  ) => {
    if (isLoadingOverall && data.length === 0) return <Skeleton className="h-[300px] w-full" />;
    if (!isLoadingOverall && data.length === 0) return <div className="flex items-center justify-center h-[300px] text-muted-foreground">No hay datos</div>;
    
    const config: ChartConfig = { [dataKey]: { label: yAxisLabel, color } };
    const gradientId = `gradient-${dataKey}-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 20 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" domain={lowerIsBetter ? ['dataMin', 'auto'] : [0, 'auto']} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} tickFormatter={(value) => value.length > 10 ? `${value.substring(0,8)}...` : value} />
                <ChartTooltip cursor={{ fill: 'hsl(var(--accent)/0.5)' }} content={<ModernTooltip />} />
                <Bar dataKey={dataKey} fill={`url(#${gradientId})`} radius={[0, 6, 6, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };
  
  const renderCategorySection = (category: GameCategory, title: string, icon: React.ElementType, mainColor: string) => {
    const categoryGames = processedData?.games.filter(g => g.category === category) || [];
    const mainChartData = categoryPointsChartData[category] || [];
    const isTimeBased = category === 'Physical' || category === 'Mental';

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg bg-gradient-to-br ${mainColor}`}>
            {React.createElement(icon, { className: "w-6 h-6 text-white" })}
          </div>
          <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {renderModernBarChart(
            `Puntos Generales ${category === 'Physical' ? 'Físicos (Pғ)' : category === 'Mental' ? 'Mentales (Pᴍ)' : 'Extra (Pᴇ)'}`,
            mainChartData,
            "score",
            "Puntos",
            getColor(category === 'Physical' ? 0 : category === 'Mental' ? 1 : 2)
          )}

          {isTimeBased && categoryGames.length > 0 && 
            renderModernBarChart(
              `Mejores Tiempos: ${categoryGames[0].name}`,
              individualGameTimeChartData[categoryGames[0].id] || [],
              "score",
              "Tiempo (min)",
              getColor(category === 'Physical' ? 5 : 6),
              true
            )
          }
        </div>
        
        {isTimeBased && categoryGames.length > 1 &&
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {categoryGames.slice(1).map((game, index) =>
              renderModernBarChart(
                `Tiempos: ${game.name}`,
                individualGameTimeChartData[game.id] || [],
                "score",
                "Tiempo (min)",
                getColor(category === 'Physical' ? 7 + index : 9 + index),
                true
              )
            )}
          </div>
        }
         {category === 'Extra' && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Los estados individuales y sus puntos se detallan en <strong>Clasificación</strong> y <strong>Cálculos</strong>.
            </p>
        )}
      </div>
    );
  };

  if (overallError) {
    return <p className="text-destructive text-center py-8">Error al cargar datos: {(overallError as Error).message}</p>;
  }
  
  if (isLoadingOverall || !processedData) {
     return (
       <>
        <PageHeader title="Análisis de Tendencias" description="Visualización avanzada del rendimiento."/>
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-[450px] w-full rounded-2xl" />
                <Skeleton className="h-[450px] w-full rounded-2xl" />
            </div>
        </div>
       </>
     )
  }

  return (
    <>
      <PageHeader
        title="Análisis de Tendencias"
        description="Visualización avanzada del rendimiento por categorías con gráficas interactivas y estadísticas detalladas."
      />
      
      <div className="space-y-12">
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={Users} title="Participantes Activos" value={statsData.totalParticipants.toString()} colorClass="bg-gradient-to-r from-blue-500 to-cyan-600" />
            <StatCard icon={Timer} title="Promedio Puntos Físicos" value={`${statsData.avgPhysical} pts`} colorClass="bg-gradient-to-r from-purple-500 to-pink-600" />
            <StatCard icon={Activity} title="Promedio Puntos Mentales" value={`${statsData.avgMental} pts`} colorClass="bg-gradient-to-r from-green-500 to-emerald-600" />
            <StatCard icon={Trophy} title="Puntuación Total Máxima" value={`${statsData.maxTotal} pts`} colorClass="bg-gradient-to-r from-orange-500 to-red-600" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" />Distribución de Puntos por Categoría</CardTitle>
              <CardDescription>Comparación acumulativa de puntos físicos, mentales y extra entre participantes.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[400px] w-full">
                <ResponsiveContainer>
                  <AreaChart data={progressAreaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaColor1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/></linearGradient>
                      <linearGradient id="areaColor2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/><stop offset="95%" stopColor="#06B6D4" stopOpacity={0.1}/></linearGradient>
                      <linearGradient id="areaColor3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => value.length > 10 ? `${value.substring(0,8)}...` : value} />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ModernTooltip />} />
                    <Area type="monotone" dataKey="Puntos Físico" stackId="1" stroke="#8B5CF6" fill="url(#areaColor1)" />
                    <Area type="monotone" dataKey="Puntos Mental" stackId="1" stroke="#06B6D4" fill="url(#areaColor2)" />
                    <Area type="monotone" dataKey="Puntos Extra" stackId="1" stroke="#10B981" fill="url(#areaColor3)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2"><Target className="w-5 h-5 text-purple-500" />Análisis Top 5 Participantes</CardTitle>
               <CardDescription>Rendimiento multidimensional de los mejores participantes.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[400px] w-full">
                <ResponsiveContainer>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" className="text-xs" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <ChartTooltip content={<ModernTooltip />} />
                    <Radar name="P. Físico" dataKey="P. Físico" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                    <Radar name="P. Mental" dataKey="P. Mental" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.4} />
                    <Radar name="P. Extras" dataKey="P. Extras" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {processedData && (
          <div className="space-y-12 mt-12">
            {renderCategorySection('Physical', 'Rendimiento Físico', Timer, 'from-purple-500 to-pink-600')}
            {renderCategorySection('Mental', 'Rendimiento Mental', Activity, 'from-blue-500 to-cyan-600')}
            {renderCategorySection('Extra', 'Puntos Extra', Zap, 'from-green-500 to-emerald-600')}
          </div>
        )}
      </div>
    </>
  );
}
