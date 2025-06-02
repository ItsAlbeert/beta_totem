
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Participant, Score, Game, LeaderboardEntry, ExtraGameStatusDetail } from "@/types";
import { Icons } from "@/components/icons";
import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from "@/components/ui/scroll-area";
import { getParticipants, getGames, getScores, getRecentScores } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils"; 

interface DashboardData {
  totalParticipants: number;
  totalGames: number;
  averageTotalPoints: number | null; 
  topPerformers: LeaderboardEntry[]; 
  recentScoresData: (Score & { participantName?: string, scoreSummary?: string })[]; 
  totalScoresLogged: number;
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState<string>(""); 

  useEffect(() => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString('es-ES'));
    const timerId = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('es-ES')), 1000);
    return () => clearInterval(timerId);
  }, []);

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
  
  const { data: recentScoresRaw = [], isLoading: isLoadingRecentScores, error: errorRecentScores } = useQuery<Score[]>({
    queryKey: ["recentScores"],
    queryFn: () => getRecentScores(5),
  });

  const isLoadingOverall = isLoadingParticipants || isLoadingGames || isLoadingScores || isLoadingRecentScores;
  const overallError = errorParticipants || errorGames || errorScores || errorRecentScores;


  const dashboardData = useMemo((): DashboardData | null => {
    if (isLoadingOverall || overallError || !participants.length || !games || !allScores) { 
      return null; 
    }

    const participantsMap = new Map(participants.map(p => [p.id, p.name]));
    const totalParticipants = participants.length;
    const totalGames = games.length;
    const totalScoresLogged = allScores.length;

    let topPerformers: LeaderboardEntry[] = [];
    let averageTotalPoints: number | null = null;

    if (allScores.length > 0 && participants.length > 0 && games.length > 0) {
        const leaderboard = calculateAllParticipantScores(participants, allScores, games);
        topPerformers = leaderboard.slice(0, 3);

        const totalPointsList = leaderboard.map(entry => entry.puntos_total);
        averageTotalPoints = totalPointsList.length > 0 
        ? totalPointsList.reduce((sum, score) => sum + score, 0) / totalPointsList.length 
        : null;
    }
      
    const recentScoresData = recentScoresRaw.map(score => {
        let extraSummary = "N/A";
        if (score.extraGameDetailedStatuses) {
            const statuses = Object.values(score.extraGameDetailedStatuses);
            const muyBienCount = statuses.filter(s => s === 'muy_bien').length;
            const regularCount = statuses.filter(s => s === 'regular').length;
            const noHechoCount = statuses.filter(s => s === 'no_hecho').length;
            const totalExtraEntries = statuses.length;

            if (totalExtraEntries > 0) {
                 extraSummary = `${muyBienCount} MB, ${regularCount} R, ${noHechoCount} NH`;
            } else {
                extraSummary = "Sin datos de juegos extra";
            }
        }

        return {
            ...score,
            participantName: participantsMap.get(score.participantId) || "Desconocido",
            scoreSummary: `P_F: ${score.puntos_fisico?.toFixed(1) ?? 'N/A'}, P_M: ${score.puntos_mental?.toFixed(1) ?? 'N/A'}, Extras: ${extraSummary}, P_Total: ${score.puntos_total?.toFixed(1) ?? 'N/A'}`
        };
    });


    return {
      totalParticipants,
      totalGames,
      averageTotalPoints,
      topPerformers,
      recentScoresData,
      totalScoresLogged,
    };
  }, [participants, games, allScores, recentScoresRaw, isLoadingOverall, overallError]);


  const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string; value: string | number | null; icon: Icons.Icon; description?: string, isLoading?: boolean }) => (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/4 mb-2" />
            {description && <Skeleton className="h-4 w-1/2" />}
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground">{value === null || value === undefined ? 'N/A' : value}</div>
            {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (overallError) {
    return <p className="text-destructive text-center py-8">Error al cargar los datos del panel: {(overallError as Error).message}</p>;
  }

  return (
    <>
      <PageHeader
        title="Panel de Control de la Competición"
        description={currentTime ? `Resumen de actividades de ChronoScore. Hora actual: ${currentTime}` : "Cargando hora..."}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        <StatCard 
          title="Total de Participantes" 
          value={dashboardData?.totalParticipants ?? 0} 
          icon={Icons.Users} 
          description="Competidores registrados actualmente."
          isLoading={isLoadingOverall}
        />
        <StatCard 
          title="Total de Juegos" 
          value={dashboardData?.totalGames ?? 0} 
          icon={Icons.Gamepad2}
          description="Juegos definidos para la competición."
          isLoading={isLoadingOverall}
        />
        <StatCard 
          title="Media de Puntos Totales (Pᴛ)" 
          value={dashboardData?.averageTotalPoints !== null && dashboardData?.averageTotalPoints !== undefined ? `${dashboardData.averageTotalPoints.toFixed(1)} pts` : 'N/A'} 
          icon={Icons.Sigma}
          description="Media de los puntos totales finales (Pᴛ)."
          isLoading={isLoadingOverall}
        />
        <StatCard 
          title="Puntuaciones Registradas" 
          value={dashboardData?.totalScoresLogged ?? 0} 
          icon={Icons.Activity}
          description="Total de puntuaciones brutas registradas."
          isLoading={isLoadingOverall}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icons.Award className="mr-2 h-6 w-6 text-yellow-500" /> Mejores Participantes
            </CardTitle>
            <CardDescription>Top 3 participantes por Puntos Totales (Pᴛ). Más alto es mejor.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOverall && !dashboardData ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : dashboardData && dashboardData.topPerformers.length > 0 ? (
              <ul className="space-y-3">
                {dashboardData.topPerformers.map((performer, index) => (
                  <li key={performer.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors">
                    <span className={`text-lg font-semibold w-6 text-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                      {performer.rank}
                    </span>
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={performer.photoUrl || undefined} alt={performer.name} data-ai-hint="person face" />
                      <AvatarFallback>{performer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{performer.name}</p>
                      <p className="text-sm text-muted-foreground">Puntos Totales (Pᴛ): {performer.puntos_total.toFixed(1)} pts</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-4">Aún no hay datos de rendimiento. Añade puntuaciones para ver la clasificación.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icons.CalendarClock className="mr-2 h-6 w-6 text-blue-500" /> Actividad Reciente
            </CardTitle>
            <CardDescription>Últimas 5 puntuaciones brutas registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOverall && !dashboardData ? (
               <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : dashboardData && dashboardData.recentScoresData.length > 0 ? (
              <ScrollArea className="h-[280px]">
                <ul className="space-y-2 pr-3">
                  {dashboardData.recentScoresData.map((score) => (
                    <li key={score.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors">
                      <div>
                        <p className="font-medium text-foreground">
                          {score.participantName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                         {score.scoreSummary}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {score.recordedAt ? formatDistanceToNowStrict(new Date(score.recordedAt), { addSuffix: true, locale: es }) : 'Fecha inválida'}
                      </p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-4">Aún no se han registrado puntuaciones.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
