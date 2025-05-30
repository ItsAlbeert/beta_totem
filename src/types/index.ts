
export interface Participant {
  id: string;
  name: string;
  year: 1 | 2 | 3;
  photoUrl?: string;
}

export interface Score {
  id: string;
  participantId: string;
  physicalTime: number;
  mentalTime: number;
  extraTime?: number;
  weightedTotalTime: number;
  recordedAt: Date;
}

// For mocked data with participant details embedded
export interface LeaderboardEntry extends Participant {
  rank: number;
  physicalTime: number;
  mentalTime: number;
  extraTime?: number;
  weightedTotalTime: number;
}

export interface ParticipantTrendDataPoint {
  time: string; // e.g., "09:00", "10:00"
  physicalTime: number | null;
  mentalTime: number | null;
  weightedTotalTime: number;
}

export interface ParticipantTrend {
  participantId: string;
  participantName: string;
  trendData: ParticipantTrendDataPoint[];
}
