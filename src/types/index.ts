
export interface Participant {
  id: string;
  name: string;
  year: 1 | 2 | 3;
  photoUrl?: string;
}

export interface Score {
  id: string; // Unique ID for the score entry
  participantId: string;
  physicalTime: number;
  mentalTime: number;
  extraTime?: number;
  weightedTotalTime: number;
  recordedAt: string; // ISO string date
}

// For leaderboard display, combining participant and their latest score details
export interface LeaderboardEntry extends Participant {
  rank: number;
  physicalTime: number;
  mentalTime: number;
  extraTime?: number;
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

// Kept existing types from trends page for potential future use or if structure is similar
export interface ParticipantTrendDataPoint {
  time: string; // e.g., "09:00", "10:00" or a full timestamp
  physicalTime: number | null;
  mentalTime: number | null;
  weightedTotalTime: number;
}

export interface ParticipantTrend {
  participantId: string;
  participantName: string;
  trendData: ParticipantTrendDataPoint[];
}
