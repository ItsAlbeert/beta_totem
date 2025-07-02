
"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { LeaderboardEntry } from "@/types"
import { getCalculatedLeaderboardData } from "@/lib/firestore-services"
import ParticipantCard from "@/components/dashboard/participant-card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/page-header"

const DashboardPage = () => {
  const { data: leaderboardData = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboardData"],
    queryFn: getCalculatedLeaderboardData,
  });

  return (
    <>
      <PageHeader
        title="General"
        description="Visualiza el rendimiento y la puntuación total de cada participante de un vistazo."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[300px] rounded-xl" />
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
