
export type GameCategory = 'Physical' | 'Mental' | 'Extra';

export interface Game {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
}

export interface Participant {
  id: string;
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
  gameTimes?: { [gameId: string]: number }; // Explicitly add gameTimes here
  weightedTotalTime: number;
  scoreRecordedAt: string; // To know when this score was from
}

// For trends page, simplified to plot values over time (timestamps of recordings)
export interface TrendDataPoint {
  time: string; // Formatted timestamp of when the score was recorded
  [participantName: string]: number | string | null; // participantName: scoreValue
}

// The config for charts remains the same
export interface ChartConfig {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<string, string> } // Adjusted theme type
  );
}

