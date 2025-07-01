"use client"

import React, { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import type { Participant, Score, Game, LeaderboardEntry, ScoringSettings } from "@/types"
import { getParticipants, getGames, getScores, getScoringSettings } from "@/lib/firestore-services"
import { calculateAllParticipantScores } from "@/lib/data-utils"
import ParticipantCard from "@/components/dashboard/participant-card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/page-header"

const DashboardPage = () => {
  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const { data: allScores = [], isLoading: isLoadingScores } = useQuery<Score[]>({
    queryKey: ["scores"],
    queryFn: getScores,
  });
  
  const { data: scoringSettings, isLoading: isLoadingSettings } = useQuery<ScoringSettings>({
    queryKey: ["scoringSettings"],
    queryFn: getScoringSettings,
  });

  const isLoading = isLoadingParticipants || isLoadingGames || isLoadingScores || isLoadingSettings;

  const leaderboardData = useMemo((): LeaderboardEntry[] => {
    if (isLoading || !participants.length || !games.length || !allScores.length || !scoringSettings) {
      return [];
    }
    const calculated = calculateAllParticipantScores(participants, allScores, games, scoringSettings);
    return calculated.sort((a, b) => a.rank - b.rank);
  }, [participants, games, allScores, scoringSettings, isLoading]);
  
  return (
    <>
      <PageHeader
        title="Panel de Control"
        description="Visualiza el rendimiento y la puntuación total de cada participante de un vistazo."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {leaderboardData.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
            />
          ))}
        </div>
      )}
       { !isLoading && leaderboardData.length === 0 && (
         <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl bg-card border border-border">
            <h3 className="text-xl font-semibold text-foreground">No hay datos para mostrar</h3>
            <p className="mt-2 text-muted-foreground">
                Aún no hay participantes o puntuaciones registradas. <br/> Ve a 'Participantes' y 'Registrar Tiempos' para empezar.
            </p>
         </div>
       )}
    </>
  );
}

export default DashboardPage
