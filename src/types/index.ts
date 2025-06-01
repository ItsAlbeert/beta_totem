
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
  
  tiempo_fisico: number;   // Raw physical time in minutes
  tiempo_mental: number;   // Raw mental time in minutes
  
  // New: Status for each individual extra game
  extraGameStatuses?: { [gameId: string]: ExtraChallengeStatus }; 

  gameTimes?: { [gameId: string]: number }; // Optional: individual game times for Physical/Mental
  recordedAt: string; // ISO string date (converted from Firestore Timestamp)

  // Calculated scores (will be calculated on the fly)
  puntuacion_fisica_normalizada?: number; // S_p
  puntuacion_mental_normalizada?: number; // S_m
  ajuste_extra_minutos?: number; // E (for extra challenges)
  puntuacion_extra_normalizada?: number; // S_e
  puntuacion_final_ponderada?: number;  // SF
}

// For leaderboard display, combining participant and their calculated scores
export interface LeaderboardEntry extends Participant {
  rank: number;
  
  latest_tiempo_fisico: number;
  latest_tiempo_mental: number;
  // Store the processed extra game statuses for display if needed
  latest_extra_game_statuses?: { [gameId: string]: ExtraChallengeStatus }; 
  
  puntuacion_fisica_normalizada: number; // S_p
  puntuacion_mental_normalizada: number; // S_m
  ajuste_extra_minutos: number;          // E
  puntuacion_extra_normalizada: number;  // S_e
  puntuacion_final_ponderada: number;   // SF

  scoreRecordedAt: string; // ISO string of the latest score
  gameTimes?: { [gameId: string]: number }; // From latest score for Physical/Mental games
}

export interface PerformanceOverTimeDataPoint {
  time: string; 
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
