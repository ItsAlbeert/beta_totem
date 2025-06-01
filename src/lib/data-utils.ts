
// src/lib/data-utils.ts
import type { Participant, Score, LeaderboardEntry } from "@/types";

export const processLeaderboardData = (
  participants: Participant[],
  scores: Score[] // Scores now have recordedAt as ISO string from Firestore service
): LeaderboardEntry[] => {
  const processedData = participants
    .map((participant) => {
      const participantScores = scores.filter((s) => s.participantId === participant.id);
      if (participantScores.length === 0) return null;
      
      // Find the latest score
      const latestScore = participantScores.reduce((latest, current) => {
        // Ensure recordedAt are actual Date objects for comparison
        const latestDate = new Date(latest.recordedAt);
        const currentDate = new Date(current.recordedAt);
        return currentDate.getTime() > latestDate.getTime() ? current : latest;
      });
      
      return {
        ...participant,
        rank: 0, // Rank will be assigned after sorting
        physicalTime: latestScore.physicalTime,
        mentalTime: latestScore.mentalTime,
        extraTime: latestScore.extraTime || 0,
        weightedTotalTime: latestScore.weightedTotalTime,
        scoreRecordedAt: latestScore.recordedAt, // This is already an ISO string
        gameTimes: latestScore.gameTimes,
      };
    })
    .filter(Boolean) as LeaderboardEntry[]; // Filter out nulls and assert type

  // Sort by weightedTotalTime (lower is better)
  processedData.sort((a, b) => a.weightedTotalTime - b.weightedTotalTime);

  // Assign ranks
  return processedData.map((entry, index) => ({ ...entry, rank: index + 1 }));
};
