
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaderboardEntry, Participant, Score } from "@/types";
import { ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants";
const SCORES_STORAGE_KEY = "chronoScoreScores";

type SortableColumn = keyof Pick<LeaderboardEntry, 'rank' | 'name' | 'year' | 'physicalTime' | 'mentalTime' | 'extraTime' | 'weightedTotalTime'>;
type SortDirection = 'asc' | 'desc';

const getStoredParticipants = (): Participant[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const getStoredScores = (): Score[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SCORES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortableColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const participants = getStoredParticipants();
    const scores = getStoredScores();

    const processedData: LeaderboardEntry[] = participants.map(participant => {
      const participantScores = scores.filter(s => s.participantId === participant.id);
      if (participantScores.length === 0) return null;

      // Find the latest score for this participant
      const latestScore = participantScores.reduce((latest, current) => 
        new Date(current.recordedAt) > new Date(latest.recordedAt) ? current : latest
      );
      
      return {
        ...participant,
        rank: 0, // Placeholder, will be set after initial sort
        physicalTime: latestScore.physicalTime,
        mentalTime: latestScore.mentalTime,
        extraTime: latestScore.extraTime || 0,
        weightedTotalTime: latestScore.weightedTotalTime,
        scoreRecordedAt: latestScore.recordedAt,
      };
    }).filter(Boolean) as LeaderboardEntry[]; // Filter out nulls (participants with no scores)

    // Initial sort by weightedTotalTime (lower is better) to set ranks
    processedData.sort((a, b) => a.weightedTotalTime - b.weightedTotalTime);
    const rankedData = processedData.map((entry, index) => ({ ...entry, rank: index + 1 }));
    
    setLeaderboardData(rankedData);
    setLoading(false);

     // Listener for storage changes to re-fetch and re-process
     const handleStorageChange = (event: StorageEvent) => {
        if (event.key === PARTICIPANTS_STORAGE_KEY || event.key === SCORES_STORAGE_KEY) {
            setLoading(true); // Indicate data is being refreshed
            const updatedParticipants = getStoredParticipants();
            const updatedScores = getStoredScores();
            const newProcessedData = updatedParticipants.map(p => {
                const pScores = updatedScores.filter(s => s.participantId === p.id);
                if (pScores.length === 0) return null;
                const latestPScore = pScores.reduce((l, c) => new Date(c.recordedAt) > new Date(l.recordedAt) ? c : l);
                return {
                    ...p, rank: 0, physicalTime: latestPScore.physicalTime, mentalTime: latestPScore.mentalTime,
                    extraTime: latestPScore.extraTime || 0, weightedTotalTime: latestPScore.weightedTotalTime,
                    scoreRecordedAt: latestPScore.recordedAt,
                };
            }).filter(Boolean) as LeaderboardEntry[];
            newProcessedData.sort((a, b) => a.weightedTotalTime - b.weightedTotalTime);
            const newRankedData = newProcessedData.map((entry, index) => ({ ...entry, rank: index + 1 }));
            setLeaderboardData(newRankedData);
            // Re-apply current sort after data update
            handleSort(sortColumn, true); // Pass true to avoid toggling direction
            setLoading(false);
        }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);

  }, [sortColumn, sortDirection]); // sortColumn/Direction removed from deps as initial load sort is fixed

  const handleSort = (column: SortableColumn, maintainDirection = false) => {
    let direction = sortDirection;
    if (sortColumn === column && !maintainDirection) {
      direction = sortDirection === 'asc' ? 'desc' : 'asc';
    } else if (!maintainDirection) {
      direction = 'asc'; // Default to ascending for new column
    }
    
    setSortColumn(column);
    setSortDirection(direction);

    const sortedData = [...leaderboardData].sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      // Ensure numbers, handling potential undefined for extraTime
      valA = (valA === undefined ? -Infinity : valA) as number;
      valB = (valB === undefined ? -Infinity : valB) as number;
      
      return direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    setLeaderboardData(sortedData);
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
        description="Overall participant rankings based on weighted total time."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Current Standings</CardTitle>
          <CardDescription>
            Participants are ranked by their weighted total time (lower is better).
            Click column headers to sort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow key={entry.id}>
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
