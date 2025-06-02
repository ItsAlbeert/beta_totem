
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaderboardEntry, Participant, Score, Game, GameCategory, ExtraGameStatusDetail, ExtraGameType } from "@/types";
import { ArrowDownUp, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getParticipants, getScores, getGames } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils";

type SortableColumn = keyof Pick<LeaderboardEntry, 
  'rank' | 
  'name' | 
  'year' | 
  'puntos_fisico' | 
  'puntos_mental' | 
  'puntos_extras' | 
  'puntos_total'
>;
type SortDirection = 'asc' | 'desc';

export default function LeaderboardPage() {
  const [sortColumn, setSortColumn] = useState<SortableColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

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

  const applySort = useCallback((data: LeaderboardEntry[], column: SortableColumn, direction: SortDirection) => {
    if(data.length === 0) return data;
        
    return [...data].sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      if (column === 'name') {
        return direction === 'asc' ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      }
      
      valA = (valA === undefined || valA === null ? (direction === 'asc' ? Infinity : -Infinity) : valA) as number;
      valB = (valB === undefined || valB === null ? (direction === 'asc' ? Infinity : -Infinity) : valB) as number;
      
      if (column === 'rank') { 
        return (valA as number) - (valB as number);
      }
      return direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, []);
  
  const leaderboardData = useMemo(() => {
    if (isLoadingOverall || overallError || !participants.length || !allScores.length || !games.length) return [];
    const processed = calculateAllParticipantScores(participants, allScores, games);
    return applySort(processed, sortColumn, sortDirection);
  }, [participants, allScores, games, isLoadingOverall, overallError, sortColumn, sortDirection, applySort]);


  const handleSort = (column: SortableColumn) => {
    let newDirection: SortDirection = 'asc'; 
    if (column.startsWith('puntos_') || column === 'year') {
      newDirection = 'desc'; 
    }

    if (sortColumn === column) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    setSortColumn(column);
    setSortDirection(newDirection);
    setExpandedParticipantId(null); 
  };

  const toggleExpandParticipant = (participantId: string) => {
    setExpandedParticipantId(prevId => prevId === participantId ? null : participantId);
  };

  const SortableButton = ({ column, children }: { column: SortableColumn, children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" onClick={() => handleSort(column)} className="px-1 hover:bg-primary/10">
      {children}
      {sortColumn === column && <ArrowDownUp className="ml-1 h-3 w-3 opacity-70" />}
    </Button>
  );
  
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
    return <p className="text-destructive text-center py-8">Error al cargar datos: {(overallError as Error).message}</p>;
  }

  const definedExtraGames = games.filter(g => g.category === 'Extra');

  return (
    <>
      <PageHeader
        title="Clasificación"
        description="Clasificación general de participantes basada en Puntos Totales (Pᴛ). Más alto es mejor. Haz clic en las filas para ver detalles."
      />
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Posiciones Actuales</CardTitle>
          <CardDescription>
            Los participantes se clasifican por sus Puntos Totales (Pᴛ). Haz clic en las cabeceras para ordenar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOverall && !leaderboardData.length ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]"></TableHead> 
                  <TableHead className="w-[80px]">
                    <SortableButton column="rank">Clasif.</SortableButton>
                  </TableHead>
                  <TableHead className="w-[80px]">Foto</TableHead>
                  <TableHead>
                     <SortableButton column="name">Nombre</SortableButton>
                  </TableHead>
                  <TableHead>
                    <SortableButton column="year">Año</SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="puntos_fisico">P<sub>Físico</sub></SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="puntos_mental">P<sub>Mental</sub></SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="puntos_extras">P<sub>Extras</sub></SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="puntos_total">P<sub>Total</sub></SortableButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow 
                        onClick={() => toggleExpandParticipant(entry.id)} 
                        className={cn("cursor-pointer hover:bg-muted/50", expandedParticipantId === entry.id && "bg-muted/30 hover:bg-muted/40 transition-colors")}
                    >
                      <TableCell className="text-center">
                        {expandedParticipantId === entry.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-bold">{entry.rank}</TableCell>
                      <TableCell>
                        <Avatar>
                          <AvatarImage src={entry.photoUrl || undefined} alt={entry.name} data-ai-hint="person face" />
                          <AvatarFallback>{entry.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell>{entry.year}</TableCell>
                      <TableCell className="text-right">{entry.puntos_fisico.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{entry.puntos_mental.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{entry.puntos_extras.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{entry.puntos_total.toFixed(1)}</TableCell>
                    </TableRow>
                    {expandedParticipantId === entry.id && (
                      <TableRow className="bg-muted/10 hover:bg-muted/20 transition-colors">
                        <TableCell colSpan={9} className="p-0">
                          <div className="p-4 pl-[70px] border-l-4 border-primary/30 space-y-3"> 
                            <h4 className="text-md font-semibold mb-2">Desglose (Última Puntuación del {new Date(entry.scoreRecordedAt).toLocaleDateString('es-ES')}):</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <p>Tiempo Físico Bruto: <span className="font-medium">{entry.latest_tiempo_fisico.toFixed(2)} min</span> → P<sub>Físico</sub>: <span className="font-medium">{entry.puntos_fisico.toFixed(1)} pts</span></p>
                                <p>Tiempo Mental Bruto: <span className="font-medium">{entry.latest_tiempo_mental.toFixed(2)} min</span> → P<sub>Mental</sub>: <span className="font-medium">{entry.puntos_mental.toFixed(1)} pts</span></p>
                            </div>
                            
                            {definedExtraGames.length > 0 && (
                                <div>
                                    <h5 className="text-sm font-medium text-primary mb-1">Estados y Puntos de Juegos Extra:</h5>
                                    <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground/80">
                                        {definedExtraGames.map(extraGame => (
                                            <li key={extraGame.id}>
                                                {extraGame.name} <span className="text-xs">({extraGame.extraType === 'obligatoria' ? 'obligatoria' : 'opcional'})</span>: 
                                                <Badge variant={entry.latest_extra_game_detailed_statuses?.[extraGame.id] === 'muy_bien' ? 'default' : entry.latest_extra_game_detailed_statuses?.[extraGame.id] === 'regular' ? 'secondary' : 'outline'} className="ml-1 text-xs">
                                                    {getExtraGameStatusText(entry.latest_extra_game_detailed_statuses?.[extraGame.id])}
                                                </Badge>
                                                <span className="font-medium ml-2">
                                                   → {getExtraGamePointsText(entry.individual_extra_game_points?.[extraGame.id])} pts
                                                </span>
                                            </li>
                                        ))}
                                        <li className="font-semibold">Subtotal Extras (Bruto): {entry.puntos_extras_cruda.toFixed(1)} pts</li>
                                        <li className="font-semibold">P<sub>Extras</sub> Final (Limitado): {entry.puntos_extras.toFixed(1)} pts</li>
                                    </ul>
                                </div>
                            )}
                            {definedExtraGames.length === 0 && (
                                 <p className="text-sm text-muted-foreground mt-2">No hay juegos Extra definidos en el sistema.</p>
                            )}

                            {entry.gameTimes && Object.keys(entry.gameTimes).length > 0 && (
                                <div className="mt-2">
                                <h5 className="text-sm font-medium text-primary mb-1">Tiempos Individuales de Juegos (registrados):</h5>
                                {(['Physical', 'Mental'] as GameCategory[]).map(category => {
                                  const categoryGamesTimes = Object.entries(entry.gameTimes || {})
                                    .map(([gameId, time]) => {
                                      const gameDetails = games.find(g => g.id === gameId);
                                      if (gameDetails && gameDetails.category === category && typeof time === 'number') {
                                        return { name: gameDetails.name, time };
                                      }
                                      return null;
                                    })
                                    .filter(Boolean) as { name: string; time: number }[];

                                  if (categoryGamesTimes.length === 0) return null;

                                  return (
                                    <div key={category} className="mb-1">
                                      <h6 className="text-xs font-semibold text-muted-foreground mb-0.5">Juegos {category === 'Physical' ? 'Físicos' : 'Mentales'}:</h6>
                                      <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground/80">
                                        {categoryGamesTimes.map(game => (
                                          <li key={game.name}>{game.name}: {game.time.toFixed(2)} min</li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })}
                                </div>
                            )}
                            {(!entry.gameTimes || Object.keys(entry.gameTimes).length === 0) && (
                                <p className="text-sm text-muted-foreground mt-2">No se registraron tiempos específicos de juegos Físicos/Mentales para esta entrada.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
          {leaderboardData.length === 0 && !isLoadingOverall && !overallError && (
            <p className="text-center text-muted-foreground py-8">No hay datos de clasificación disponibles. Añade participantes y registra sus puntuaciones.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
