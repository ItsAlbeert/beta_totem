
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaderboardEntry, Participant, Score, Game, GameCategory, ExtraChallengeStatus } from "@/types";
import { ArrowDownUp, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getParticipants, getScores, getGames } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils";

type SortableColumn = keyof Pick<LeaderboardEntry, 
  'rank' | 
  'name' | 
  'year' | 
  'puntuacion_fisica_normalizada' | 
  'puntuacion_mental_normalizada' | 
  'puntuacion_extra_normalizada' | 
  'puntuacion_final_ponderada'
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
    
    const isRankOrSF = column === 'rank' || column === 'puntuacion_final_ponderada';
    
    return [...data].sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      if (column === 'name') {
        return direction === 'asc' ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      }
      
      valA = (valA === undefined || valA === null ? (direction === 'asc' ? Infinity : -Infinity) : valA) as number;
      valB = (valB === undefined || valB === null ? (direction === 'asc' ? Infinity : -Infinity) : valB) as number;
      
      if (column === 'rank') {
        return direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
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
    let direction: SortDirection = sortDirection;
     if (sortColumn === column) {
      direction = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      if (column.startsWith('puntuacion_')) {
        direction = 'desc';
      } else {
        direction = 'asc';
      }
    }
    setSortColumn(column);
    setSortDirection(direction);
    setExpandedParticipantId(null); 
  };

  const toggleExpandParticipant = (participantId: string) => {
    setExpandedParticipantId(prevId => prevId === participantId ? null : participantId);
  };

  const SortableButton = ({ column, children }: { column: SortableColumn, children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" onClick={() => handleSort(column)} className="px-1">
      {children}
      {sortColumn === column && <ArrowDownUp className="ml-1 h-3 w-3 opacity-50" />}
    </Button>
  );

  if (overallError) {
    return <p className="text-destructive text-center py-8">Error loading data: {(overallError as Error).message}</p>;
  }

  const getExtraGameStatusText = (status: ExtraChallengeStatus | undefined): string => {
    if (!status) return "N/A";
    return status.replace('_', ' ');
  }

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="Overall participant rankings based on final weighted score (SF). Higher is better. Click rows for game details."
      />
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Current Standings</CardTitle>
          <CardDescription>
            Participants are ranked by their Puntuación Final (SF). Higher scores are better.
            Click column headers to sort or participant rows to see game time breakdowns.
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
                    <SortableButton column="rank">Rank</SortableButton>
                  </TableHead>
                  <TableHead className="w-[80px]">Photo</TableHead>
                  <TableHead>
                     <SortableButton column="name">Name</SortableButton>
                  </TableHead>
                  <TableHead>
                    <SortableButton column="year">Year</SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="puntuacion_fisica_normalizada">S_Physical</SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="puntuacion_mental_normalizada">S_Mental</SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="puntuacion_extra_normalizada">S_Extra</SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="puntuacion_final_ponderada">Score Final (SF)</SortableButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow 
                        onClick={() => toggleExpandParticipant(entry.id)} 
                        className={cn("cursor-pointer", expandedParticipantId === entry.id && "bg-muted/30 hover:bg-muted/40 transition-colors")}
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
                      <TableCell className="text-right">{entry.puntuacion_fisica_normalizada.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{entry.puntuacion_mental_normalizada.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{entry.puntuacion_extra_normalizada.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-semibold">{entry.puntuacion_final_ponderada.toFixed(1)}</TableCell>
                    </TableRow>
                    {expandedParticipantId === entry.id && (
                      <TableRow className="bg-muted/10 hover:bg-muted/20 transition-colors">
                        <TableCell colSpan={9} className="p-0">
                          <div className="p-4 pl-[70px] border-l-4 border-primary/30"> 
                            <h4 className="text-md font-semibold mb-2">Breakdown (Latest Score on {new Date(entry.scoreRecordedAt).toLocaleDateString()}):</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <p>Raw Physical Time: <span className="font-medium">{entry.latest_tiempo_fisico.toFixed(2)} min</span></p>
                                <p>Raw Mental Time: <span className="font-medium">{entry.latest_tiempo_mental.toFixed(2)} min</span></p>
                                <p>Extra Adjustment: <span className="font-medium">{entry.ajuste_extra_minutos.toFixed(1)} min</span></p>
                            </div>
                            
                            {/* Physical and Mental Game Times */}
                            {entry.gameTimes && Object.keys(entry.gameTimes).length > 0 && games.length > 0 && (
                                <div className="mt-3">
                                <h5 className="text-sm font-medium text-primary mb-1">Individual Game Times (logged):</h5>
                                {(['Physical', 'Mental'] as GameCategory[]).map(category => {
                                  const categoryGames = Object.entries(entry.gameTimes || {})
                                    .map(([gameId, time]) => {
                                      const gameDetails = games.find(g => g.id === gameId);
                                      // Ensure we only show games that match the category and have a time
                                      if (gameDetails && gameDetails.category === category && typeof time === 'number') {
                                        return { name: gameDetails.name, time };
                                      }
                                      return null;
                                    })
                                    .filter(Boolean) as { name: string; time: number }[];

                                  if (categoryGames.length === 0) return null;

                                  return (
                                    <div key={category} className="mb-2">
                                      <h6 className="text-xs font-semibold text-muted-foreground mb-0.5">{category} Games:</h6>
                                      <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground/80">
                                        {categoryGames.map(game => (
                                          <li key={game.name}>{game.name}: {game.time.toFixed(2)} min</li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })}
                                </div>
                            )}
                             {(!entry.gameTimes || Object.keys(entry.gameTimes).length === 0) && (
                                <p className="text-sm text-muted-foreground mt-2">No specific Physical/Mental game times were logged for this score entry.</p>
                            )}

                            {/* Extra Game Statuses */}
                            {games.filter(g => g.category === 'Extra').length > 0 && (
                                <div className="mt-3">
                                    <h5 className="text-sm font-medium text-primary mb-1">Extra Game Statuses:</h5>
                                    <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground/80">
                                        {games.filter(g => g.category === 'Extra').map(extraGame => (
                                            <li key={extraGame.id}>
                                                {extraGame.name}: {getExtraGameStatusText(entry.latest_extra_game_statuses?.[extraGame.id])}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {games.filter(g => g.category === 'Extra').length === 0 && (
                                 <p className="text-sm text-muted-foreground mt-2">No Extra games defined in the system.</p>
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
            <p className="text-center text-muted-foreground py-8">No leaderboard data available. Add participants and record their scores.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
