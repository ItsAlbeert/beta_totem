
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
  date: string; // Or Date object
  physicalTime: number;
  mentalTime: number;
  weightedTotalTime: number;
}

export interface ParticipantTrend {
  participantId: string;
  participantName: string;
  trendData: ParticipantTrendDataPoint[];
}
