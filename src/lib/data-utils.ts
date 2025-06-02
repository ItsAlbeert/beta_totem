
import type { Participant, Score, LeaderboardEntry, Game, ExtraGameStatusDetail, ExtraGameType } from "@/types";

// Scoring constants for P_fisico
const T_P_THRESHOLD_1 = 220; // Time in minutes for 100 points
const T_P_THRESHOLD_2 = 360; // Time in minutes for 30 points
const P_FISICO_MAX_POINTS = 100;
const P_FISICO_MIN_POINTS = 30;
const P_FISICO_RATE = (P_FISICO_MAX_POINTS - P_FISICO_MIN_POINTS) / (T_P_THRESHOLD_2 - T_P_THRESHOLD_1); // 70 / 140 = 0.5

// Scoring constants for P_mental
const T_M_THRESHOLD_1 = 50;  // Time in minutes for 100 points
const T_M_THRESHOLD_2 = 120; // Time in minutes for 30 points
const P_MENTAL_MAX_POINTS = 100;
const P_MENTAL_MIN_POINTS = 30;
const P_MENTAL_RATE = (P_MENTAL_MAX_POINTS - P_MENTAL_MIN_POINTS) / (T_M_THRESHOLD_2 - T_M_THRESHOLD_1); // 70 / 70 = 1.0

// Scoring constants for P_extras
const P_EXTRAS_MAX_CAP = 30;
const P_EXTRAS_MIN_CAP = -10;

const EXTRA_GAME_POINTS: Record<ExtraGameType, Record<ExtraGameStatusDetail, number>> = {
  opcional: {
    muy_bien: 10,
    regular: 6,
    no_hecho: 0,
  },
  obligatoria: {
    muy_bien: 10,
    regular: 6,
    no_hecho: -10,
  },
};

const roundToOneDecimal = (num: number): number => parseFloat(num.toFixed(1));

export const calculateAllParticipantScores = (
  participants: Participant[],
  allScores: Score[],
  allGames: Game[]
): LeaderboardEntry[] => {
  if (!participants.length) {
    return [];
  }

  const definedExtraGames = allGames.filter(game => game.category === 'Extra');

  const leaderboardEntries: LeaderboardEntry[] = [];

  participants.forEach(participant => {
    const participantScores = allScores.filter(s => s.participantId === participant.id);
    if (participantScores.length === 0) {
        // Participant has no scores, maybe add them with 0s or skip
        // For now, skipping participants with no scores.
        return;
    }

    const latestScore = participantScores.reduce((latest, current) => 
      new Date(current.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? current : latest
    );

    // Calculate P_fisico
    let p_fisico: number;
    const tp = latestScore.tiempo_fisico;
    if (tp <= T_P_THRESHOLD_1) {
      p_fisico = P_FISICO_MAX_POINTS;
    } else if (tp >= T_P_THRESHOLD_2) {
      p_fisico = P_FISICO_MIN_POINTS;
    } else {
      p_fisico = P_FISICO_MAX_POINTS - (tp - T_P_THRESHOLD_1) * P_FISICO_RATE;
    }
    p_fisico = roundToOneDecimal(p_fisico);

    // Calculate P_mental
    let p_mental: number;
    const tm = latestScore.tiempo_mental;
    if (tm <= T_M_THRESHOLD_1) {
      p_mental = P_MENTAL_MAX_POINTS;
    } else if (tm >= T_M_THRESHOLD_2) {
      p_mental = P_MENTAL_MIN_POINTS;
    } else {
      // P_mental = P_MENTAL_MAX_POINTS - (tm - T_M_THRESHOLD_1) * P_MENTAL_RATE; 
      // The formula 150 - Tm is equivalent and simpler for the 50-120 range
      p_mental = P_MENTAL_MAX_POINTS + T_M_THRESHOLD_1 * P_MENTAL_RATE - tm * P_MENTAL_RATE; // 100 + 50*1 - tm*1 = 150 - tm
    }
    p_mental = roundToOneDecimal(p_mental);
    
    // Calculate P_extras
    let p_extras_cruda = 0;
    const individual_extra_game_points: { [gameId: string]: number } = {};

    definedExtraGames.forEach(extraGame => {
      const status = latestScore.extraGameDetailedStatuses?.[extraGame.id] || 'no_hecho'; // Default to 'no_hecho'
      const gameType = extraGame.extraType || 'opcional'; // Default to 'opcional' if somehow undefined
      const pointsForThisGame = EXTRA_GAME_POINTS[gameType][status];
      p_extras_cruda += pointsForThisGame;
      individual_extra_game_points[extraGame.id] = pointsForThisGame;
    });

    const p_extras = roundToOneDecimal(Math.max(P_EXTRAS_MIN_CAP, Math.min(p_extras_cruda, P_EXTRAS_MAX_CAP)));
    p_extras_cruda = roundToOneDecimal(p_extras_cruda);


    // Calculate P_total
    const p_total = roundToOneDecimal(p_fisico + p_mental + p_extras);

    leaderboardEntries.push({
      ...participant,
      rank: 0, // Rank will be assigned after sorting
      latest_tiempo_fisico: latestScore.tiempo_fisico,
      latest_tiempo_mental: latestScore.tiempo_mental,
      latest_extra_game_detailed_statuses: latestScore.extraGameDetailedStatuses,
      
      puntos_fisico: p_fisico,
      puntos_mental: p_mental,
      puntos_extras: p_extras,
      puntos_extras_cruda: p_extras_cruda,
      puntos_total: p_total,
      individual_extra_game_points: individual_extra_game_points,

      scoreRecordedAt: latestScore.recordedAt,
      gameTimes: latestScore.gameTimes,
    });
  });

  // Sort by P_total descending. Then by P_fisico, then P_mental for tie-breaking.
  leaderboardEntries.sort((a, b) => {
    if (b.puntos_total !== a.puntos_total) {
      return b.puntos_total - a.puntos_total;
    }
    if (b.puntos_fisico !== a.puntos_fisico) {
      return b.puntos_fisico - a.puntos_fisico;
    }
    if (b.puntos_mental !== a.puntos_mental) {
      return b.puntos_mental - a.puntos_mental;
    }
    // Could add more tie-breakers, e.g. less time in physical, then mental.
    if (a.latest_tiempo_fisico !== b.latest_tiempo_fisico) {
        return a.latest_tiempo_fisico - b.latest_tiempo_fisico;
    }
    return a.latest_tiempo_mental - b.latest_tiempo_mental;
  });

  return leaderboardEntries.map((entry, index) => ({ ...entry, rank: index + 1 }));
};
