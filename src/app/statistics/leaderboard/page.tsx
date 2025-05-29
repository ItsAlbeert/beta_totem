"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaderboardEntry, Participant } from "@/types";
import { ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data - replace with actual data fetching
const mockParticipantsList: Participant[] = [
  { id: "1", name: "Alice Wonderland", year: 1, photoUrl: "https://placehold.co/40x40.png" },
  { id: "2", name: "Bob The Builder", year: 2, photoUrl: "https://placehold.co/40x40.png" },
  { id: "3", name: "Charlie Chaplin", year: 3, photoUrl: "https://placehold.co/40x40.png" },
  { id: "4", name: "Diana Prince", year: 1 },
];

const mockScores = [
  { participantId: "1", physicalTime: 30, mentalTime: 10, extraTime: 5 },
  { participantId: "2", physicalTime: 25, mentalTime: 12, extraTime: 0 },
  { participantId: "3", physicalTime: 35, mentalTime: 8, extraTime: 2 },
  { participantId: "4", physicalTime: 28, mentalTime: 11, extraTime: 3 },
];

function calculateWeightedTotalTime(physicalTime: number, mentalTime: number, extraTime: number = 0): number {
  return physicalTime + (mentalTime * 3) - extraTime;
}

const generateLeaderboardData = (): LeaderboardEntry[] => {
  return mockScores
    .map((score, index) => {
      const participant = mockParticipantsList.find(p => p.id === score.participantId);
      if (!participant) return null;
      const weightedTotalTime = calculateWeightedTotalTime(score.physicalTime, score.mentalTime, score.extraTime);
      return {
        ...participant,
        rank: 0, // Placeholder, will be set after sorting
        physicalTime: score.physicalTime,
        mentalTime: score.mentalTime,
        extraTime: score.extraTime,
        weightedTotalTime,
      };
    })
    .filter(Boolean) // Remove nulls if participant not found
    .sort((a, b) => (a!.weightedTotalTime) - (b!.weightedTotalTime)) // Sort by weightedTotalTime (lower is better)
    .map((entry, index) => ({ ...entry!, rank: index + 1 })); // Assign rank
};


export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching and processing data
    const timer = setTimeout(() => {
      setLeaderboardData(generateLeaderboardData());
      setLoading(false);
    }, 1500);
     return () => clearTimeout(timer);
  }, []);

  // TODO: Implement actual sorting logic
  const handleSort = (column: keyof LeaderboardEntry) => {
    console.log("Sorting by", column);
    // Example:
    // const sortedData = [...leaderboardData].sort((a, b) => ...);
    // setLeaderboardData(sortedData);
  };

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
                  <TableHead className="w-[60px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('rank')}>Rank <ArrowDownUp className="ml-2 h-3 w-3" /></Button>
                  </TableHead>
                  <TableHead className="w-[80px]">Photo</TableHead>
                  <TableHead>
                     <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>Name <ArrowDownUp className="ml-2 h-3 w-3" /></Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort('year')}>Year <ArrowDownUp className="ml-2 h-3 w-3" /></Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('physicalTime')}>Physical <ArrowDownUp className="ml-2 h-3 w-3" /></Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('mentalTime')}>Mental <ArrowDownUp className="ml-2 h-3 w-3" /></Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('extraTime')}>Bonus <ArrowDownUp className="ml-2 h-3 w-3" /></Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('weightedTotalTime')}>Total Weighted <ArrowDownUp className="ml-2 h-3 w-3" /></Button>
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
            <p className="text-center text-muted-foreground py-8">No leaderboard data available.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
