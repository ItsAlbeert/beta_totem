
"use client"

import React, { useState, useMemo } from "react"
import type { Metadata } from "next"
import { useQuery } from "@tanstack/react-query"

import type { Participant, Score, Game, LeaderboardEntry, ScoringSettings } from "@/types"
import { getParticipants, getGames, getScores, getScoringSettings } from "@/lib/firestore-services"
import { calculateAllParticipantScores } from "@/lib/data-utils"
import ParticipantCard from "@/components/dashboard/participant-card"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Visualización del rendimiento de los participantes.",
}

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
    return calculateAllParticipantScores(participants, allScores, games, scoringSettings);
  }, [participants, games, allScores, scoringSettings, isLoading]);
  
  const [selectedMetric, setSelectedMetric] = useState("Total");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="space-y-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Dashboard de Participantes
        </h1>
        <p className="text-muted-foreground">
          Visualiza el rendimiento de cada participante. Selecciona una métrica para ver la puntuación correspondiente.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[180px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {leaderboardData.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              selectedMetric={selectedMetric}
              onMetricSelect={setSelectedMetric}
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
    </div>
  );
}

export default DashboardPage
