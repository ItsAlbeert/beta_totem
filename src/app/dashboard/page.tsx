
"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Participant, Score, Game, LeaderboardEntry, ScoringSettings } from "@/types";
import { getParticipants, getGames, getScores, getScoringSettings } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils"; 
import { ChartContainer, ModernBarChart, ModernPieChart, StatCard } from "@/components/dashboard/modern-charts";
import { Users, Gamepad2, Sigma, Activity, Award } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";


interface DashboardData {
  totalParticipants: number;
  totalGames: number;
  averageTotalPoints: number | null; 
  totalScoresLogged: number;
  topPerformersData: { name: string, 'Puntos Totales': number }[];
  gameCategoryData: { name: string; value: number; color: string; }[];
}

export default function DashboardPage() {
  const { data: participants = [], isLoading: isLoadingParticipants, error: errorParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: games = [], isLoading: isLoadingGames, error: errorGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const { data: allScores = [], isLoading: isLoadingScores, error: errorScores } = useQuery<Score[]>({
    queryKey: ["scores"],
    queryFn: getScores,
  });
  
  const { data: scoringSettings, isLoading: isLoadingSettings, error: errorSettings } = useQuery<ScoringSettings>({
    queryKey: ["scoringSettings"],
    queryFn: getScoringSettings,
  });

  const isLoadingOverall = isLoadingParticipants || isLoadingGames || isLoadingScores || isLoadingSettings;
  const overallError = errorParticipants || errorGames || errorScores || errorSettings;

  const dashboardData = useMemo((): DashboardData | null => {
    if (isLoadingOverall || overallError || !participants.length || !games || !allScores || !scoringSettings) { 
      return null; 
    }

    const totalParticipants = participants.length;
    const totalGames = games.length;
    const totalScoresLogged = allScores.length;

    let leaderboard: LeaderboardEntry[] = [];
    let averageTotalPoints: number | null = null;
    
    if (allScores.length > 0 && participants.length > 0 && games.length > 0) {
        leaderboard = calculateAllParticipantScores(participants, allScores, games, scoringSettings);
        const totalPointsList = leaderboard.map(entry => entry.puntos_total);
        averageTotalPoints = totalPointsList.length > 0 
          ? totalPointsList.reduce((sum, score) => sum + score, 0) / totalPointsList.length 
          : null;
    }
      
    const topPerformersData = leaderboard.slice(0, 5).map(p => ({
        name: p.name.split(' ')[0], // Use first name for brevity
        'Puntos Totales': parseFloat(p.puntos_total.toFixed(1))
    })).reverse();

    const gameCategoryData = [
        { name: 'Físicos', value: games.filter(g => g.category === 'Physical').length, color: '#8B5CF6' },
        { name: 'Mentales', value: games.filter(g => g.category === 'Mental').length, color: '#06B6D4' },
        { name: 'Extras', value: games.filter(g => g.category === 'Extra').length, color: '#10B981' }
    ].filter(item => item.value > 0);


    return {
      totalParticipants,
      totalGames,
      averageTotalPoints,
      totalScoresLogged,
      topPerformersData,
      gameCategoryData
    };
  }, [participants, games, allScores, scoringSettings, isLoadingOverall, overallError]);


  const colorScheme = {
    gradients: {
      purple: "from-purple-500 to-pink-600",
      blue: "from-blue-500 to-cyan-600", 
      green: "from-green-500 to-emerald-600",
      orange: "from-orange-500 to-red-600"
    }
  };

  if (overallError) {
    return <p className="text-destructive text-center py-8">Error al cargar los datos del panel: {(overallError as Error).message}</p>;
  }

  if (isLoadingOverall) {
    return (
      <div>
        <Skeleton className="h-12 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <Skeleton className="h-[376px] w-full rounded-2xl lg:col-span-3" />
            <Skeleton className="h-[376px] w-full rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
          Panel de Control
        </h1>
        <p className="text-gray-400">Estadísticas en tiempo real de la competición ChronoScore.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total de Participantes"
          value={dashboardData?.totalParticipants ?? 0}
          change={2.1} // Placeholder
          gradientColor={colorScheme.gradients.purple}
          icon={<Users className="w-6 h-6 text-white" />}
        />
        <StatCard 
          title="Total de Juegos"
          value={dashboardData?.totalGames ?? 0}
          change={0} // Placeholder
          gradientColor={colorScheme.gradients.blue}
          icon={<Gamepad2 className="w-6 h-6 text-white" />}
        />
        <StatCard 
          title="Media de Puntos Totales"
          value={dashboardData?.averageTotalPoints?.toFixed(1) ?? 'N/A'}
          change={-1.5} // Placeholder
          gradientColor={colorScheme.gradients.orange}
          icon={<Sigma className="w-6 h-6 text-white" />}
        />
        <StatCard 
          title="Puntuaciones Registradas"
          value={dashboardData?.totalScoresLogged ?? 0}
          change={10.3} // Placeholder
          gradientColor={colorScheme.gradients.green}
          icon={<Activity className="w-6 h-6 text-white" />}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
              <ChartContainer title="Mejores Participantes (Puntos Totales)" icon={<Award />}>
                  {dashboardData && dashboardData.topPerformersData.length > 0 ? (
                    <ModernBarChart data={dashboardData.topPerformersData} dataKey="Puntos Totales" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">Aún no hay datos de rendimiento.</div>
                  )}
              </ChartContainer>
          </div>
          <div className="lg:col-span-2">
              <ChartContainer title="Distribución de Juegos" icon={<Gamepad2 />}>
                  {dashboardData && dashboardData.gameCategoryData.length > 0 ? (
                    <ModernPieChart data={dashboardData.gameCategoryData} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No hay juegos definidos.</div>
                  )}
              </ChartContainer>
          </div>
      </div>
    </>
  );
}
