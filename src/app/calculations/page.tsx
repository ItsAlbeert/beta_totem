
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaderboardEntry, Participant, Score, Game, ExtraChallengeStatus } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { getParticipants, getScores, getGames } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CalculationsPage() {
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

  const isLoadingOverall = isLoadingParticipants || isLoadingScores || isLoadingGames;
  const overallError = errorParticipants || errorScores || errorGames;

  const calculationData = React.useMemo(() => {
    if (isLoadingOverall || overallError || !participants.length || !allScores.length || !games.length) return [];
    // We use calculateAllParticipantScores as it already processes latest scores and calculates all point values
    return calculateAllParticipantScores(participants, allScores, games);
  }, [participants, allScores, games, isLoadingOverall, overallError]);

  const getExtraGameStatusText = (status: ExtraChallengeStatus | undefined): string => {
    if (!status) return "N/A";
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Capitalize each word
  }

  if (overallError) {
    return <p className="text-destructive text-center py-8">Error loading calculation data: {(overallError as Error).message}</p>;
  }

  return (
    <>
      <PageHeader
        title="Score Calculation Breakdown"
        description="Transparent view of how raw times and extra statuses translate to final scores."
      />
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Detailed Calculations</CardTitle>
          <CardDescription>
            This table shows the latest raw inputs and corresponding calculated scores for each participant. All scores are out of 100, where higher is better.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOverall && !calculationData.length ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">T<sub className="lowercase">Physical</sub> (min)</TableHead>
                    <TableHead className="text-center">S<sub className="lowercase">Physical</sub></TableHead>
                    <TableHead className="text-center">T<sub className="lowercase">Mental</sub> (min)</TableHead>
                    <TableHead className="text-center">S<sub className="lowercase">Mental</sub></TableHead>
                    <TableHead className="text-center">Extra Statuses</TableHead>
                    <TableHead className="text-center">E<sub className="lowercase">Adjust</sub> (min)</TableHead>
                    <TableHead className="text-center">S<sub className="lowercase">Extra</sub></TableHead>
                    <TableHead className="text-center font-semibold">Score Final (SF)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculationData.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.rank}</TableCell>
                      <TableCell>
                        <Avatar>
                          <AvatarImage src={entry.photoUrl || undefined} alt={entry.name} data-ai-hint="person face"/>
                          <AvatarFallback>{entry.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>{entry.name} <span className="text-xs text-muted-foreground">(Y{entry.year})</span></TableCell>
                      <TableCell className="text-center">{entry.latest_tiempo_fisico.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{entry.puntuacion_fisica_normalizada.toFixed(1)}</TableCell>
                      <TableCell className="text-center">{entry.latest_tiempo_mental.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{entry.puntuacion_mental_normalizada.toFixed(1)}</TableCell>
                      <TableCell className="text-center text-xs">
                        {games.filter(g => g.category === 'Extra').length > 0 ? (
                            games.filter(g => g.category === 'Extra').map(extraGame => (
                                <div key={extraGame.id}>
                                    {extraGame.name}: {getExtraGameStatusText(entry.latest_extra_game_statuses?.[extraGame.id])}
                                </div>
                            ))
                        ) : "No Extra Games Defined"}
                      </TableCell>
                      <TableCell className="text-center">{entry.ajuste_extra_minutos.toFixed(1)}</TableCell>
                      <TableCell className="text-center">{entry.puntuacion_extra_normalizada.toFixed(1)}</TableCell>
                      <TableCell className="text-center font-semibold">{entry.puntuacion_final_ponderada.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {calculationData.length === 0 && !isLoadingOverall && !overallError && (
            <p className="text-center text-muted-foreground py-8">No calculation data available. Add participants and record their scores.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

