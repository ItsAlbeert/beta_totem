
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
  photoUrl?: string; // Stays as string, for data URL or Firebase Storage URL
}

// For data stored/retrieved from Firestore
export interface Score {
  id: string; // Firestore document ID
  participantId: string;
  physicalTime: number; 
  mentalTime: number;   
  extraTime?: number;    
  gameTimes?: { [gameId: string]: number }; 
  weightedTotalTime: number;
  recordedAt: string; // ISO string date (converted from Firestore Timestamp)
}

// For leaderboard display, combining participant and their latest score details
export interface LeaderboardEntry extends Participant {
  rank: number;
  physicalTime: number;
  mentalTime: number;
  extraTime?: number;
  gameTimes?: { [gameId: string]: number };
  weightedTotalTime: number;
  scoreRecordedAt: string; // ISO string
}

export interface PerformanceOverTimeDataPoint {
  time: string; // Formatted timestamp (e.g., "MMM d, HH:mm")
  [participantName: string]: number | string | null; 
}

export interface SingleMetricDataPoint {
  name: string; 
  score: number | null; 
}

export interface MultiMetricDataPoint {
  name: string; 
  [gameName: string]: number | string | null | undefined; 
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
