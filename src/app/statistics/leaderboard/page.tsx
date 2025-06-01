
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaderboardEntry, Participant, Score, Game, GameCategory } from "@/types";
import { ArrowDownUp, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getParticipants, getScores, getGames } from "@/lib/firestore-services";
import { processLeaderboardData } from "@/lib/data-utils";

type SortableColumn = keyof Pick<LeaderboardEntry, 'rank' | 'name' | 'year' | 'physicalTime' | 'mentalTime' | 'extraTime' | 'weightedTotalTime'>;
type SortDirection = 'asc' | 'desc';

export default function LeaderboardPage() {
  const [sortColumn, setSortColumn] = useState<SortableColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: scores = [], isLoading: isLoadingScores } = useQuery<Score[]>({
    queryKey: ["scores"],
    queryFn: getScores,
  });
  
  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const isLoadingOverall = isLoadingParticipants || isLoadingScores || isLoadingGames;

  const applySort = useCallback((data: LeaderboardEntry[], column: SortableColumn, direction: SortDirection) => {
    if(data.length === 0) return data;
    
    return [...data].sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = (valA === undefined || valA === null ? (direction === 'asc' ? Infinity : -Infinity) : valA) as number;
      valB = (valB === undefined || valB === null ? (direction === 'asc' ? Infinity : -Infinity) : valB) as number;
      
      return direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, []);
  
  const leaderboardData = useMemo(() => {
    if (isLoadingOverall || !participants.length || !scores.length) return [];
    const processed = processLeaderboardData(participants, scores);
    return applySort(processed, sortColumn, sortDirection);
  }, [participants, scores, isLoadingOverall, sortColumn, sortDirection, applySort]);


  const handleSort = (column: SortableColumn) => {
    let direction = sortDirection;
    if (sortColumn === column) {
      direction = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      direction = 'asc';
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

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="Overall participant rankings based on weighted total time. Click rows for game details."
      />
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Current Standings</CardTitle>
          <CardDescription>
            Participants are ranked by their weighted total time (lower is better).
            Click column headers to sort or participant rows to see game time breakdowns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOverall ? (
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
                    <SortableButton column="physicalTime">Physical</SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="mentalTime">Mental</SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="extraTime">Bonus</SortableButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableButton column="weightedTotalTime">Total Weighted</SortableButton>
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
                      <TableCell className="text-right">{entry.physicalTime.toFixed(2)} min</TableCell>
                      <TableCell className="text-right">{entry.mentalTime.toFixed(2)} min</TableCell>
                      <TableCell className="text-right">{(entry.extraTime || 0).toFixed(2)} min</TableCell>
                      <TableCell className="text-right font-semibold">{entry.weightedTotalTime.toFixed(2)} min</TableCell>
                    </TableRow>
                    {expandedParticipantId === entry.id && (
                      <TableRow className="bg-muted/10 hover:bg-muted/20 transition-colors">
                        <TableCell colSpan={9} className="p-0">
                          <div className="p-4 pl-[70px] border-l-4 border-primary/30"> 
                            <h4 className="text-md font-semibold mb-2">Game Breakdown (Latest Score on {new Date(entry.scoreRecordedAt).toLocaleDateString()}):</h4>
                            {(['Physical', 'Mental', 'Extra'] as GameCategory[]).map(category => {
                              const categoryGames = Object.entries(entry.gameTimes || {})
                                .map(([gameId, time]) => {
                                  const gameDetails = games.find(g => g.id === gameId);
                                  if (gameDetails && gameDetails.category === category && typeof time === 'number') {
                                    return { name: gameDetails.name, time };
                                  }
                                  return null;
                                })
                                .filter(Boolean) as { name: string; time: number }[];

                              if (categoryGames.length === 0) return null;

                              return (
                                <div key={category} className="mb-3">
                                  <h5 className="text-sm font-medium text-primary mb-1">{category} Games:</h5>
                                  <ul className="list-disc pl-6 space-y-0.5 text-sm text-foreground/80">
                                    {categoryGames.map(game => (
                                      <li key={game.name}>{game.name}: {game.time.toFixed(2)} min</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                            {(!entry.gameTimes || Object.keys(entry.gameTimes).length === 0) && (
                                <p className="text-sm text-muted-foreground">No specific game times recorded for this score entry.</p>
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
          {leaderboardData.length === 0 && !isLoadingOverall && (
            <p className="text-center text-muted-foreground py-8">No leaderboard data available. Add participants and record their times.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
