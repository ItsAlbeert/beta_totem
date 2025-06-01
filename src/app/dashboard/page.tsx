
"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { Participant, Score, Game, LeaderboardEntry } from "@/types";
import { Icons } from "@/components/icons";
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";

const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants";
const SCORES_STORAGE_KEY = "chronoScoreScores";
const GAMES_STORAGE_KEY = "chronoScoreGames";

interface DashboardData {
  totalParticipants: number;
  totalGames: number;
  averageWeightedTime: number | null;
  topPerformers: LeaderboardEntry[];
  recentScores: (Score & { participantName?: string })[];
  totalScoresLogged: number;
}

const getStoredData = <T,>(key: string, defaultValue: T[] = []): T[] => {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  try {
    return stored ? JSON.parse(stored) as T[] : defaultValue;
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage`, e);
    localStorage.removeItem(key); // Clear corrupted data
    return defaultValue;
  }
};

const processLeaderboardData = (
  participants: Participant[],
  scores: Score[]
): LeaderboardEntry[] => {
  const processedData = participants
    .map((participant) => {
      const participantScores = scores.filter((s) => s.participantId === participant.id);
      if (participantScores.length === 0) return null;
      const latestScore = participantScores.reduce((latest, current) =>
        new Date(current.recordedAt) > new Date(latest.recordedAt) ? current : latest
      );
      return {
        ...participant,
        rank: 0, // Rank will be assigned after sorting
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

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const fetchData = () => {
    setLoading(true);
    const participants = getStoredData<Participant>(PARTICIPANTS_STORAGE_KEY);
    const scores = getStoredData<Score>(SCORES_STORAGE_KEY);
    const games = getStoredData<Game>(GAMES_STORAGE_KEY);
    const participantsMap = new Map(participants.map(p => [p.id, p]));

    const totalParticipants = participants.length;
    const totalGames = games.length;
    const totalScoresLogged = scores.length;

    const leaderboard = processLeaderboardData(participants, scores);
    const topPerformers = leaderboard.slice(0, 3);

    const latestScores = leaderboard.map(entry => entry.weightedTotalTime);
    const averageWeightedTime = latestScores.length > 0 
      ? latestScores.reduce((sum, time) => sum + time, 0) / latestScores.length 
      : null;

    const recentScores = [...scores]
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 5)
      .map(score => ({
        ...score,
        participantName: participantsMap.get(score.participantId)?.name || "Unknown",
      }));

    setDashboardData({
      totalParticipants,
      totalGames,
      averageWeightedTime,
      topPerformers,
      recentScores,
      totalScoresLogged,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchData(); // Initial fetch
    
    // Listen for storage changes to re-fetch data
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === PARTICIPANTS_STORAGE_KEY ||
        event.key === SCORES_STORAGE_KEY ||
        event.key === GAMES_STORAGE_KEY
      ) {
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string; value: string | number | null; icon: Icons.Icon; description?: string, isLoading?: boolean }) => (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/4 mb-2" />
            {description && <Skeleton className="h-4 w-1/2" />}
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground">{value ?? 'N/A'}</div>
            {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Competition Dashboard"
        description={`Overview of ChronoScore activities. Current time: ${currentTime.toLocaleTimeString()}`}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        <StatCard 
          title="Total Participants" 
          value={dashboardData?.totalParticipants ?? 0} 
          icon={Icons.Users} 
          description="Currently registered competitors."
          isLoading={loading}
        />
        <StatCard 
          title="Total Games" 
          value={dashboardData?.totalGames ?? 0} 
          icon={Icons.Gamepad2}
          description="Defined games for the competition."
          isLoading={loading}
        />
        <StatCard 
          title="Average Weighted Time" 
          value={dashboardData?.averageWeightedTime !== null ? `${dashboardData?.averageWeightedTime?.toFixed(2)} min` : 'N/A'} 
          icon={Icons.Sigma}
          description="Avg. of latest weighted scores."
          isLoading={loading}
        />
        <StatCard 
          title="Scores Logged" 
          value={dashboardData?.totalScoresLogged ?? 0} 
          icon={Icons.Activity}
          description="Total scores recorded so far."
          isLoading={loading}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icons.Award className="mr-2 h-6 w-6 text-yellow-500" /> Top Performers
            </CardTitle>
            <CardDescription>Top 3 participants by latest weighted total time.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : dashboardData && dashboardData.topPerformers.length > 0 ? (
              <ul className="space-y-3">
                {dashboardData.topPerformers.map((performer, index) => (
                  <li key={performer.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors">
                    <span className={`text-lg font-semibold w-6 text-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                      {performer.rank}
                    </span>
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={performer.photoUrl || undefined} alt={performer.name} data-ai-hint="person face" />
                      <AvatarFallback>{performer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{performer.name}</p>
                      <p className="text-sm text-muted-foreground">Weighted Time: {performer.weightedTotalTime} min</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-4">No performance data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icons.CalendarClock className="mr-2 h-6 w-6 text-blue-500" /> Recent Activity
            </CardTitle>
            <CardDescription>Last 5 scores recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
               <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : dashboardData && dashboardData.recentScores.length > 0 ? (
              <ScrollArea className="h-[280px]">
                <ul className="space-y-2 pr-3">
                  {dashboardData.recentScores.map((score) => (
                    <li key={score.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors">
                      <div>
                        <p className="font-medium text-foreground">
                          {score.participantName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Score: {score.weightedTotalTime} min
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(score.recordedAt), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-4">No scores recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
