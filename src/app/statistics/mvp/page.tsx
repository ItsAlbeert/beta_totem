
"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCalculatedLeaderboardData, getGames } from "@/lib/firestore-services";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardEntry, Game } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Medal, Trophy } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface MvpResult {
  participant: LeaderboardEntry;
  value: number;
}

const getRankIndicator = (rank: number) => {
  if (rank === 0) return <Trophy className="w-6 h-6 text-yellow-400" />;
  if (rank === 1) return <Trophy className="w-6 h-6 text-gray-400" />;
  if (rank === 2) return <Trophy className="w-6 h-6 text-amber-600" />;
  return null;
};

const MvpParticipantRow = ({ participant, value, rank, unit }: { participant: LeaderboardEntry, value: number, rank: number, unit: string }) => (
  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
    <div className="flex items-center gap-3">
        <span className="w-6 text-center">{getRankIndicator(rank)}</span>
        <Avatar className="h-9 w-9">
            <AvatarImage src={participant.photoUrl} alt={participant.name} data-ai-hint="person face" />
            <AvatarFallback>{participant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
            <p className="font-medium text-foreground">{participant.name}</p>
            <p className="text-xs text-muted-foreground">Año {participant.year}</p>
        </div>
    </div>
    <div className="text-right">
        <p className="font-semibold text-primary">{value.toFixed(1)} <span className="text-xs text-muted-foreground">{unit}</span></p>
    </div>
  </div>
);


export default function MvpPage() {
  const { data: leaderboardData = [], isLoading: isLoadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboardData"],
    queryFn: getCalculatedLeaderboardData,
  });

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const isLoading = isLoadingLeaderboard || isLoadingGames;

  const mvpData = useMemo(() => {
    if (!leaderboardData.length || !games.length) {
      return { topPhysical: [], topMental: [], topPerGame: {} };
    }

    // Top 3 by category points
    const topPhysical = [...leaderboardData]
      .sort((a, b) => b.puntos_fisico - a.puntos_fisico)
      .slice(0, 3)
      .map(p => ({ participant: p, value: p.puntos_fisico }));

    const topMental = [...leaderboardData]
      .sort((a, b) => b.puntos_mental - a.puntos_mental)
      .slice(0, 3)
      .map(p => ({ participant: p, value: p.puntos_mental }));
    
    // Top 3 per individual game time
    const topPerGame: { [gameId: string]: MvpResult[] } = {};
    const physicalAndMentalGames = games.filter(g => g.category === 'Physical' || g.category === 'Mental');

    physicalAndMentalGames.forEach(game => {
      const participantsWithTime = leaderboardData
        .filter(p => p.gameTimes && p.gameTimes[game.id] != null)
        .sort((a, b) => (a.gameTimes![game.id]!) - (b.gameTimes![game.id]!))
        .slice(0, 3)
        .map(p => ({
          participant: p,
          value: p.gameTimes![game.id]!,
        }));
      if (participantsWithTime.length > 0) {
        topPerGame[game.id] = participantsWithTime;
      }
    });

    return { topPhysical, topMental, topPerGame };
  }, [leaderboardData, games]);

  const physicalAndMentalGames = useMemo(() => games.filter(g => g.category === 'Physical' || g.category === 'Mental'), [games]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="MVP - Jugadores Más Valiosos" description="Reconocimiento a los mejores rendimientos." />
        <div className="space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  if (leaderboardData.length === 0) {
    return (
        <>
            <PageHeader title="MVP - Jugadores Más Valiosos" description="Reconocimiento a los mejores rendimientos." />
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl bg-card border border-border">
                <h3 className="text-xl font-semibold text-foreground">No hay datos para mostrar</h3>
                <p className="mt-2 text-muted-foreground">
                    No hay suficientes datos de participantes o puntuaciones para determinar los MVPs.
                </p>
            </div>
        </>
    );
  }

  return (
    <>
      <PageHeader
        title="MVP - Jugadores Más Valiosos"
        description="Reconocimiento a los mejores rendimientos por categoría general y por cada juego individual."
      >
        <Award className="w-8 h-8 text-primary" />
      </PageHeader>

      <div className="space-y-12">
        {/* General Category MVPs */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6">MVPs por Ámbito General</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Medal className="text-purple-400" />Rendimiento Físico (Puntos)</CardTitle>
                <CardDescription>Top 3 participantes con más Puntos Físicos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {mvpData.topPhysical.length > 0 ? (
                  mvpData.topPhysical.map((mvp, index) => (
                    <MvpParticipantRow key={mvp.participant.id} participant={mvp.participant} value={mvp.value} rank={index} unit="pts" />
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No hay datos suficientes.</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Medal className="text-cyan-400" />Rendimiento Mental (Puntos)</CardTitle>
                 <CardDescription>Top 3 participantes con más Puntos Mentales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                 {mvpData.topMental.length > 0 ? (
                  mvpData.topMental.map((mvp, index) => (
                    <MvpParticipantRow key={mvp.participant.id} participant={mvp.participant} value={mvp.value} rank={index} unit="pts" />
                  ))
                ) : (
                   <p className="text-muted-foreground text-center py-4">No hay datos suficientes.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Individual Game MVPs */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6">MVPs por Juego Individual (Mejor Tiempo)</h2>
          {physicalAndMentalGames.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4">
                {physicalAndMentalGames.map(game => {
                    const gameMvps = mvpData.topPerGame[game.id];
                    return (
                        <AccordionItem value={game.id} key={game.id} className="border-b-0">
                            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                                <AccordionTrigger className="text-lg font-semibold px-6 py-4 hover:no-underline">
                                    <div className="flex items-center gap-4">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs",
                                            game.category === 'Physical' ? 'bg-purple-900/50 text-purple-300' : 'bg-cyan-900/50 text-cyan-300'
                                        )}>{game.category === 'Physical' ? 'Físico' : 'Mental'}</span>
                                        {game.name}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                {gameMvps && gameMvps.length > 0 ? (
                                    gameMvps.map((mvp, index) => (
                                        <MvpParticipantRow key={mvp.participant.id} participant={mvp.participant} value={mvp.value} rank={index} unit="min" />
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">No se han registrado tiempos para este juego.</p>
                                )}
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    )
                })}
            </Accordion>
          ) : (
             <p className="text-muted-foreground text-center py-8">No hay juegos físicos o mentales definidos.</p>
          )}
        </div>
      </div>
    </>
  );
}
