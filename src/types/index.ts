
export type GameCategory = 'Physical' | 'Mental' | 'Extra';
export type ExtraGameType = 'opcional' | 'obligatoria';
export type ExtraGameStatusDetail = 'muy_bien' | 'regular' | 'no_hecho';

export interface Game {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
  extraType?: ExtraGameType; // Only relevant if category is 'Extra'
}

export interface Participant {
  id:string;
  name: string;
  year: 1 | 2 | 3;
  photoUrl?: string;
}

// For data stored/retrieved from Firestore
export interface Score {
  id: string; // Firestore document ID
  participantId: string;
  
  tiempo_fisico: number;   // Raw physical time in minutes for all physical challenges
  tiempo_mental: number;   // Raw mental time in minutes for all mental challenges
  
  // Status for each individual extra game, identified by gameId
  extraGameDetailedStatuses?: { [gameId: string]: ExtraGameStatusDetail }; 

  gameTimes?: { [gameId: string]: number }; // Optional: individual game times for Physical/Mental (for breakdown, not direct scoring)
  recordedAt: string; // ISO string date (converted from Firestore Timestamp)

  // Calculated scores based on the new system (will be calculated on the fly by data-utils)
  // These are now primarily in LeaderboardEntry after calculation
  puntos_fisico?: number;     // P_fisico (e.g., 30-100)
  puntos_mental?: number;     // P_mental (e.g., 30-100)
  puntos_extras?: number;     // P_extras (e.g., -10 to 30)
  puntos_total?: number;      // P_total = P_fisico + P_mental + P_extras
}

// For leaderboard display, combining participant and their calculated scores
export interface LeaderboardEntry extends Participant {
  rank: number;
  
  // Raw inputs from latest score
  latest_tiempo_fisico: number;
  latest_tiempo_mental: number;
  latest_extra_game_detailed_statuses?: { [gameId: string]: ExtraGameStatusDetail }; 
  latestScoreId?: string; // ID of the latest score document
  
  // Calculated points from latest score
  puntos_fisico: number;     // P_fisico
  puntos_mental: number;     // P_mental
  puntos_extras: number;     // P_extras (capped)
  puntos_extras_cruda: number; // Raw sum of extra points before capping (useful for display in calculations)
  puntos_total: number;      // P_total

  // Detailed points for each extra game for drilldown
  individual_extra_game_points?: { [gameId: string]: number };

  scoreRecordedAt: string; // ISO string of the latest score
  gameTimes?: { [gameId: string]: number }; // From latest score for Physical/Mental games breakdown
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

// Type for the detailed breakdown in calculations page
export interface CalculationBreakdownEntry extends LeaderboardEntry {
    // Inherits all from LeaderboardEntry
    // Add any specific fields if needed for the calculation page that aren't in LeaderboardEntry
}

// Scoring Settings
export interface ScoringThresholds {
  threshold1: number; // Time for max points
  threshold2: number; // Time for min points
  maxPoints: number;
  minPoints: number;
}

export interface ExtraGamePointsValue {
  muy_bien: number;
  regular: number;
  no_hecho: number;
}

export interface ExtraScoringSettings {
  capMax: number;
  capMin: number;
  points: {
    opcional: ExtraGamePointsValue;
    obligatoria: ExtraGamePointsValue;
  };
}

export interface ScoringSettings {
  id?: string; // Document ID, typically 'scoring_rules'
  physical: ScoringThresholds;
  mental: ScoringThresholds;
  extras: ExtraScoringSettings;
}
    
