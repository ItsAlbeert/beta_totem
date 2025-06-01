
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

export type ExtraChallengeStatus = 'no_hecho' | 'hecho_a_medias' | 'hecho';

// For data stored/retrieved from Firestore
export interface Score {
  id: string; // Firestore document ID
  participantId: string;
  
  // Raw inputs for the new scoring system
  tiempo_fisico: number;   // Raw physical time in minutes
  tiempo_mental: number;   // Raw mental time in minutes
  estado_extra: ExtraChallengeStatus; // Status of the extra challenge(s)

  gameTimes?: { [gameId: string]: number }; // Optional: individual game times, not used in SF calculation
  recordedAt: string; // ISO string date (converted from Firestore Timestamp)

  // Calculated scores based on the new system (will be calculated on the fly, not stored in Firestore directly with raw input)
  // These fields might be added when processing data for display rather than storing them back if they depend on global min/max
  puntuacion_fisica_normalizada?: number; // S_p
  puntuacion_mental_normalizada?: number; // S_m
  ajuste_extra_minutos?: number; // E
  puntuacion_extra_normalizada?: number; // S_e
  puntuacion_final_ponderada?: number;  // SF
}

// For leaderboard display, combining participant and their calculated scores
export interface LeaderboardEntry extends Participant {
  rank: number;
  
  // Raw times from latest score for reference (optional, SF is primary)
  latest_tiempo_fisico: number;
  latest_tiempo_mental: number;
  latest_estado_extra: ExtraChallengeStatus;
  
  // Calculated scores
  puntuacion_fisica_normalizada: number; // S_p
  puntuacion_mental_normalizada: number; // S_m
  ajuste_extra_minutos: number;          // E
  puntuacion_extra_normalizada: number;  // S_e
  puntuacion_final_ponderada: number;   // SF

  scoreRecordedAt: string; // ISO string of the latest score
  gameTimes?: { [gameId: string]: number }; // From latest score
}

export interface PerformanceOverTimeDataPoint {
  time: string; // Formatted timestamp (e.g., "MMM d, HH:mm") or score instance identifier
  [participantNameOrScoreKey: string]: number | string | null; 
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
