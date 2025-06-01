
export type GameCategory = 'Physical' | 'Mental' | 'Extra';

export interface Game {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
}

export interface Participant {
  id:string;
  name: string;
  year: 1 | 2 | 3;
  photoUrl?: string;
}

export interface Score {
  id: string; // Unique ID for the score entry
  participantId: string;
  physicalTime: number; // Total physical time
  mentalTime: number;   // Total mental time
  extraTime?: number;    // Total extra time
  gameTimes?: { [gameId: string]: number }; // Time for each specific game, gameId is key
  weightedTotalTime: number;
  recordedAt: string; // ISO string date
}

// For leaderboard display, combining participant and their latest score details
export interface LeaderboardEntry extends Participant {
  rank: number;
  physicalTime: number;
  mentalTime: number;
  extraTime?: number;
  gameTimes?: { [gameId: string]: number };
  weightedTotalTime: number;
  scoreRecordedAt: string; // To know when this score was from
}

// For Participant Performance Over Time (Line Chart in Comparisons)
// X-axis: time (recordedAt), Series: participant names, Values: score (e.g., weightedTotalTime)
export interface PerformanceOverTimeDataPoint {
  time: string; // Formatted timestamp (e.g., "MMM d, HH:mm")
  [participantName: string]: number | string | null; // participantName: scoreValue
}

// For Single Metric Bar Charts (e.g., Total Physical Time per Participant, or Single Game Time per Participant)
// X-axis: participant names, Y-axis: score
export interface SingleMetricDataPoint {
  name: string; // Participant name
  score: number | null; // The metric value (e.g., physical time, game time)
}

// For Multi-Metric Grouped Bar Charts (e.g., Comparing multiple games for all participants)
// X-axis: participant names, Grouped Bars: selected games, Y-axis: score
export interface MultiMetricDataPoint {
  name: string; // Participant name
  [gameName: string]: number | string | null | undefined; // gameName: scoreValue for that game
}


export interface ChartConfig {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<string, string> }
  );
}
