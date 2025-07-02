
"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCalculatedLeaderboardData, getGames } from "@/lib/firestore-services";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardEntry, Game } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Award, Star } from "lucide-react";

const WinnerHighlight = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
    <Icon className="h-5 w-5 text-primary" />
    <span className="text-sm text-foreground">{text}</span>
  </div>
);

export default function WinnersPage() {
  const { data: leaderboardData = [], isLoading: isLoadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboardData"],
    queryFn: getCalculatedLeaderboardData,
  });

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const isLoading = isLoadingLeaderboard || isLoadingGames;

  const winner = useMemo(() => {
    if (isLoading || leaderboardData.length === 0) return null;
    return leaderboardData[0];
  }, [isLoading, leaderboardData]);

  const winnerHighlights = useMemo(() => {
    if (!winner || !leaderboardData || !games.length) return { bestAt: [], muyBienIn: [] };

    const physicalAndMentalGames = games.filter(g => g.category === 'Physical' || g.category === 'Mental');
    const bestAt: string[] = [];
    
    physicalAndMentalGames.forEach(game => {
      const timesForGame = leaderboardData
        .map(p => p.gameTimes?.[game.id])
        .filter((t): t is number => t != null && t > 0);

      if (timesForGame.length === 0) return;

      const bestTime = Math.min(...timesForGame);
      const winnerTime = winner.gameTimes?.[game.id];

      if (winnerTime === bestTime) {
        bestAt.push(game.name);
      }
    });

    const extraGames = games.filter(g => g.category === 'Extra');
    const muyBienIn: string[] = [];
    
    extraGames.forEach(game => {
      if (winner.latest_extra_game_detailed_statuses?.[game.id] === 'muy_bien') {
        muyBienIn.push(game.name);
      }
    });

    return { bestAt, muyBienIn };
  }, [winner, leaderboardData, games]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Ganadores Totem" description="Celebrando al máximo campeón de la competición." />
        <Card className="max-w-2xl mx-auto p-8 text-center">
            <Skeleton className="h-40 w-40 rounded-full mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto mt-6" />
            <Skeleton className="h-12 w-32 mx-auto mt-2" />
            <Skeleton className="h-6 w-full mt-8" />
            <div className="space-y-3 mt-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </Card>
      </>
    );
  }

  if (!winner) {
    return (
      <>
        <PageHeader title="Ganadores Totem" description="Celebrando al máximo campeón de la competición." />
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl bg-card border border-border">
          <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">El Trono está Vacío</h3>
          <p className="mt-2 text-muted-foreground">
            La competición aún está en marcha. ¡Aún no hay un ganador definido!
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ganadores Totem"
        description="Celebrando al máximo campeón de la competición."
      />

      <Card className="max-w-3xl mx-auto shadow-2xl overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card to-background">
        <div className="p-8 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 to-transparent -z-10"></div>
          
          <div className="relative inline-block">
             <Avatar className="h-40 w-40 border-4 border-primary shadow-lg mx-auto">
                <AvatarImage src={winner.photoUrl} alt={winner.name} data-ai-hint="person portrait" />
                <AvatarFallback className="text-6xl">{winner.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Trophy className="w-12 h-12 text-yellow-400 absolute -top-4 -right-4 transform rotate-12" strokeWidth={1.5} />
          </div>

          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">
            {winner.name}
          </h2>
          <p className="text-lg text-muted-foreground">Año {winner.year} - {winner.gender}</p>

          <div className="mt-4 inline-flex items-baseline gap-2 bg-primary/10 px-6 py-2 rounded-full">
            <span className="text-5xl font-bold text-primary">{winner.puntos_total.toFixed(1)}</span>
            <span className="text-xl text-primary/80">Puntos</span>
          </div>
        </div>

        <div className="bg-muted/30 p-8 border-t border-border">
          <h3 className="text-xl font-bold text-center mb-6">Actuación Destacada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {winnerHighlights.bestAt.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Mejor Tiempo en Pruebas</h4>
                    {winnerHighlights.bestAt.map(gameName => (
                        <WinnerHighlight key={gameName} icon={Award} text={gameName} />
                    ))}
                </div>
            )}
             {winnerHighlights.muyBienIn.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Excelente en Extras</h4>
                    {winnerHighlights.muyBienIn.map(gameName => (
                        <WinnerHighlight key={gameName} icon={Star} text={gameName} />
                    ))}
                </div>
            )}
            {winnerHighlights.bestAt.length === 0 && winnerHighlights.muyBienIn.length === 0 && (
                <p className="text-muted-foreground text-center col-span-full">
                    No se han registrado hazañas individuales destacadas para el ganador.
                </p>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
