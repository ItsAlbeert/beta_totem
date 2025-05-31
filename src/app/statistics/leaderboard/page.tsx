
"use client";

import React, { useEffect, useState } from "react"; // Added React import
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaderboardEntry, Participant, Score, Game, GameCategory } from "@/types";
import { ArrowDownUp, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants";
const SCORES_STORAGE_KEY = "chronoScoreScores";
const GAMES_STORAGE_KEY = "chronoScoreGames";

type SortableColumn = keyof Pick<LeaderboardEntry, 'rank' | 'name' | 'year' | 'physicalTime' | 'mentalTime' | 'extraTime' | 'weightedTotalTime'>;
type SortDirection = 'asc' | 'desc';

const getStoredParticipants = (): Participant[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const getStoredScores = (): Score[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SCORES_STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const getStoredGames = (): Game[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(GAMES_STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const processLeaderboardData = (
  participants: Participant[],
  scores: Score[]
): LeaderboardEntry[] => {
  const processedData: LeaderboardEntry[] = participants
    .map((participant) => {
      const participantScores = scores.filter(
        (s) => s.participantId === participant.id
      );
      if (participantScores.length === 0) return null;

      const latestScore = participantScores.reduce((latest, current) =>
        new Date(current.recordedAt) > new Date(latest.recordedAt)
          ? current
          : latest
      );

      return {
        ...participant,
        rank: 0,
        physicalTime: latestScore.physicalTime,
        mentalTime: latestScore.mentalTime,
        extraTime: latestScore.extraTime || 0,
        weightedTotalTime: latestScore.weightedTotalTime,
        scoreRecordedAt: latestScore.recordedAt,
        gameTimes: latestScore.gameTimes,
      };
    })
    .filter(Boolean) as LeaderboardEntry[];

  processedData.sort((a, b) => a.weightedTotalTime - b.weightedTotalTime);
  return processedData.map((entry, index) => ({ ...entry, rank: index + 1 }));
};

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortableColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  const fetchDataAndProcess = () => {
    setLoading(true);
    const participants = getStoredParticipants();
    const scores = getStoredScores();
    const games = getStoredGames();
    setAllGames(games);
    const rankedData = processLeaderboardData(participants, scores);
    setLeaderboardData(rankedData);
    // Preserve current sort if data is just being refreshed
    if (leaderboardData.length > 0) {
        handleSort(sortColumn, true, rankedData); // Pass new data to sort
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDataAndProcess();

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === PARTICIPANTS_STORAGE_KEY ||
        event.key === SCORES_STORAGE_KEY ||
        event.key === GAMES_STORAGE_KEY
      ) {
        fetchDataAndProcess();
        setExpandedParticipantId(null); // Collapse on data change
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); // Initial fetch

  const handleSort = (column: SortableColumn, maintainDirection = false, dataToSort?: LeaderboardEntry[]) => {
    const currentData = dataToSort || leaderboardData;
    if(currentData.length === 0) return;

    let direction = sortDirection;
    if (sortColumn === column && !maintainDirection) {
      direction = sortDirection === 'asc' ? 'desc' : 'asc';
    } else if (!maintainDirection) {
      direction = 'asc';
    }
    
    setSortColumn(column);
    setSortDirection(direction);
    setExpandedParticipantId(null); // Collapse on sort

    const sortedData = [...currentData].sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = (valA === undefined ? (direction === 'asc' ? Infinity : -Infinity) : valA) as number;
      valB = (valB === undefined ? (direction === 'asc' ? Infinity : -Infinity) : valB) as number;
      
      return direction === 'asc' ? valA - valB : valB - valA;
    });
    setLeaderboardData(sortedData);
  };

  const toggleExpandParticipant = (participantId: string) => {
    setExpandedParticipantId(prevId => prevId === participantId ? null : participantId);
  };

  const SortableButton = ({ column, children }: { column: SortableColumn, children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" onClick={() => handleSort(column)}>
      {children}
      {sortColumn === column && <ArrowDownUp className="ml-2 h-3 w-3 opacity-50" />}
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="Overall participant rankings based on weighted total time. Click rows for game details."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Current Standings</CardTitle>
          <CardDescription>
            Participants are ranked by their weighted total time (lower is better).
            Click column headers to sort or participant rows to see game time breakdowns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && leaderboardData.length === 0 ? ( // Show skeleton only on initial load and if no data yet
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" /> // Taller for potential expanded view
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]"></TableHead> {/* For expand icon */}
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
                        className={cn("cursor-pointer", expandedParticipantId === entry.id && "bg-muted/30")}
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
                      <TableCell className="text-right">{entry.physicalTime} min</TableCell>
                      <TableCell className="text-right">{entry.mentalTime} min</TableCell>
                      <TableCell className="text-right">{entry.extraTime || 0} min</TableCell>
                      <TableCell className="text-right font-semibold">{entry.weightedTotalTime} min</TableCell>
                    </TableRow>
                    {expandedParticipantId === entry.id && (
                      <TableRow className="bg-muted/10 hover:bg-muted/20">
                        <TableCell colSpan={9} className="p-0"> {/* Increased colSpan */}
                          <div className="p-4 pl-[70px]"> {/* Indent past expand icon and rank */}
                            <h4 className="text-md font-semibold mb-2">Game Breakdown (Latest Score on {new Date(entry.scoreRecordedAt).toLocaleDateString()}):</h4>
                            {(['Physical', 'Mental', 'Extra'] as GameCategory[]).map(category => {
                              const categoryGames = Object.entries(entry.gameTimes || {})
                                .map(([gameId, time]) => {
                                  const gameDetails = allGames.find(g => g.id === gameId);
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
                                      <li key={game.name}>{game.name}: {game.time} min</li>
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
          {leaderboardData.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-8">No leaderboard data available. Add participants and record their times.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
