
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Participant, Score, Game, LeaderboardEntry } from "@/types";
import { Icons } from "@/components/icons";
import { formatDistanceToNowStrict } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";
import { getParticipants, getGames, getScores, getRecentScores } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils"; // Updated import

interface DashboardData {
  totalParticipants: number;
  totalGames: number;
  averageFinalScore: number | null; // Changed from averageWeightedTime
  topPerformers: LeaderboardEntry[]; // LeaderboardEntry now uses the new scoring system
  recentScoresData: (Score & { participantName?: string, finalScoreDisplay?: string })[]; // Added finalScoreDisplay
  totalScoresLogged: number;
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState<string>(""); 

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timerId = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
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
    queryKey: ["recentScores"], // This will fetch raw scores
    queryFn: () => getRecentScores(5),
  });

  const isLoadingOverall = isLoadingParticipants || isLoadingGames || isLoadingScores || isLoadingRecentScores;
  const overallError = errorParticipants || errorGames || errorScores || errorRecentScores;


  const dashboardData = useMemo((): DashboardData | null => {
    if (isLoadingOverall || overallError || !participants.length) { // Check for participants presence
      return null; 
    }

    const participantsMap = new Map(participants.map(p => [p.id, p.name]));
    const totalParticipants = participants.length;
    const totalGames = games.length;
    const totalScoresLogged = allScores.length;

    let topPerformers: LeaderboardEntry[] = [];
    let averageFinalScore: number | null = null;

    if (allScores.length > 0 && participants.length > 0) {
        const leaderboard = calculateAllParticipantScores(participants, allScores);
        topPerformers = leaderboard.slice(0, 3);

        const finalScoresList = leaderboard.map(entry => entry.puntuacion_final_ponderada);
        averageFinalScore = finalScoresList.length > 0 
        ? finalScoresList.reduce((sum, score) => sum + score, 0) / finalScoresList.length 
        : null;
    }
      
    // For recent scores, we can display the raw times or a placeholder if SF isn't calculated for them individually here
    const recentScoresData = recentScoresRaw.map(score => ({
        ...score,
        participantName: participantsMap.get(score.participantId) || "Unknown",
        // SF is calculated globally, so for recent raw scores, we might not have it easily
        // We can show raw times or a note.
        finalScoreDisplay: `T_F: ${score.tiempo_fisico.toFixed(1)}, T_M: ${score.tiempo_mental.toFixed(1)}, Extra: ${score.estado_extra.replace('_', ' ')}`
    }));


    return {
      totalParticipants,
      totalGames,
      averageFinalScore,
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
    return <p className="text-destructive text-center py-8">Error loading dashboard data: {(overallError as Error).message}</p>;
  }

  return (
    <>
      <PageHeader
        title="Competition Dashboard"
        description={currentTime ? `Overview of ChronoScore activities. Current time: ${currentTime}` : "Loading time..."}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        <StatCard 
          title="Total Participants" 
          value={dashboardData?.totalParticipants ?? 0} 
          icon={Icons.Users} 
          description="Currently registered competitors."
          isLoading={isLoadingOverall}
        />
        <StatCard 
          title="Total Games" 
          value={dashboardData?.totalGames ?? 0} 
          icon={Icons.Gamepad2}
          description="Defined games for the competition."
          isLoading={isLoadingOverall}
        />
        <StatCard 
          title="Average Final Score (SF)" 
          value={dashboardData?.averageFinalScore !== null && dashboardData?.averageFinalScore !== undefined ? `${dashboardData.averageFinalScore.toFixed(1)} pts` : 'N/A'} 
          icon={Icons.Sigma}
          description="Avg. of final weighted scores (SF)."
          isLoading={isLoadingOverall}
        />
        <StatCard 
          title="Scores Logged" 
          value={dashboardData?.totalScoresLogged ?? 0} 
          icon={Icons.Activity}
          description="Total raw scores recorded so far."
          isLoading={isLoadingOverall}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icons.Award className="mr-2 h-6 w-6 text-yellow-500" /> Top Performers
            </CardTitle>
            <CardDescription>Top 3 participants by Final Score (SF). Higher is better.</CardDescription>
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
                      <p className="text-sm text-muted-foreground">Score Final (SF): {performer.puntuacion_final_ponderada.toFixed(1)} pts</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-4">No performance data yet. Add scores to see rankings.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icons.CalendarClock className="mr-2 h-6 w-6 text-blue-500" /> Recent Activity
            </CardTitle>
            <CardDescription>Last 5 raw scores recorded.</CardDescription>
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
                         {score.finalScoreDisplay}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(score.recordedAt), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-4">No scores recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
