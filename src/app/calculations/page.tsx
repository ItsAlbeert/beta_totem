
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CalculationBreakdownEntry, Participant, Score, Game, ExtraGameStatusDetail, ExtraGameType } from "@/types"; // Using CalculationBreakdownEntry
import { Skeleton } from "@/components/ui/skeleton";
import { getParticipants, getScores, getGames } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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

  const calculationData = React.useMemo((): CalculationBreakdownEntry[] => {
    if (isLoadingOverall || overallError || !participants.length || !allScores.length || !games.length) return [];
    return calculateAllParticipantScores(participants, allScores, games) as CalculationBreakdownEntry[];
  }, [participants, allScores, games, isLoadingOverall, overallError]);

  const getExtraGameStatusText = (status: ExtraGameStatusDetail | undefined): string => {
    if (!status) return "N/A";
    switch (status) {
      case 'muy_bien': return 'Muy Bien';
      case 'regular': return 'Regular';
      case 'no_hecho': return 'No Hecho';
      default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getExtraGamePointsText = (points: number | undefined): string => {
    if (points === undefined) return "N/A";
    return points >= 0 ? `+${points.toFixed(1)}` : points.toFixed(1);
  };

  if (overallError) {
    return <p className="text-destructive text-center py-8">Error al cargar los datos de cálculo: {(overallError as Error).message}</p>;
  }

  const definedExtraGames = games.filter(g => g.category === 'Extra');

  return (
    <>
      <PageHeader
        title="Desglose del Cálculo de Puntuaciones"
        description="Visión transparente de cómo los datos brutos se traducen en puntuaciones finales según el sistema actual."
      />
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Cálculos Detallados (Nuevo Sistema)</CardTitle>
          <CardDescription>
            P<sub>Físico</sub> (máx 100, mín 30), P<sub>Mental</sub> (máx 100, mín 30), P<sub>Extras</sub> (máx +30, mín -10). P<sub>Total</sub> = Suma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOverall && !calculationData.length ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" /> 
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-[75vh] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Clasif.</TableHead>
                    <TableHead className="w-[60px]">Foto</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-center">T<sub>Físico</sub> (min)</TableHead>
                    <TableHead className="text-center">P<sub>Físico</sub></TableHead>
                    <TableHead className="text-center">T<sub>Mental</sub> (min)</TableHead>
                    <TableHead className="text-center">P<sub>Mental</sub></TableHead>
                    <TableHead className="min-w-[200px]">Estado y Puntos de Juegos Extra</TableHead>
                    <TableHead className="text-center">P<sub>Extras</sub> (Cruda)</TableHead>
                    <TableHead className="text-center">P<sub>Extras</sub> (Final)</TableHead>
                    <TableHead className="text-center font-semibold">P<sub>Total</sub></TableHead>
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
                      <TableCell>{entry.name} <span className="text-xs text-muted-foreground">(Año {entry.year})</span></TableCell>
                      <TableCell className="text-center">{entry.latest_tiempo_fisico.toFixed(2)}</TableCell>
                      <TableCell className="text-center text-lg font-medium">{entry.puntos_fisico.toFixed(1)}</TableCell>
                      <TableCell className="text-center">{entry.latest_tiempo_mental.toFixed(2)}</TableCell>
                      <TableCell className="text-center text-lg font-medium">{entry.puntos_mental.toFixed(1)}</TableCell>
                      <TableCell className="text-xs">
                        {definedExtraGames.length > 0 ? (
                            definedExtraGames.map(extraGame => (
                                <div key={extraGame.id} className="flex justify-between items-center py-0.5">
                                    <span>
                                      {extraGame.name} ({extraGame.extraType || 'opcional'}): 
                                      <Badge variant={entry.latest_extra_game_detailed_statuses?.[extraGame.id] === 'muy_bien' ? 'default' : entry.latest_extra_game_detailed_statuses?.[extraGame.id] === 'regular' ? 'secondary' : 'outline'} className="ml-1 text-xs">
                                        {getExtraGameStatusText(entry.latest_extra_game_detailed_statuses?.[extraGame.id])}
                                      </Badge>
                                    </span>
                                    <span className="font-medium ml-2">
                                      {getExtraGamePointsText(entry.individual_extra_game_points?.[extraGame.id])}
                                    </span>
                                </div>
                            ))
                        ) : "Sin Juegos Extra"}
                      </TableCell>
                      <TableCell className="text-center">{entry.puntos_extras_cruda.toFixed(1)}</TableCell>
                      <TableCell className="text-center text-lg font-medium">{entry.puntos_extras.toFixed(1)}</TableCell>
                      <TableCell className="text-center text-xl font-bold text-primary">{entry.puntos_total.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {calculationData.length === 0 && !isLoadingOverall && !overallError && (
            <p className="text-center text-muted-foreground py-8">No hay datos de cálculo disponibles. Añade participantes y registra sus puntuaciones.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
