
import type { Participant, Score, LeaderboardEntry, Game, ExtraGameStatusDetail, ExtraGameType } from "@/types";

// Scoring constants for P_fisico
const T_P_THRESHOLD_1_DEFAULT = 220; // Time in minutes for 100 points
const T_P_THRESHOLD_2_DEFAULT = 360; // Time in minutes for 30 points
const P_FISICO_MAX_POINTS_DEFAULT = 100;
const P_FISICO_MIN_POINTS_DEFAULT = 30;

// Scoring constants for P_mental
const T_M_THRESHOLD_1_DEFAULT = 50;  // Time in minutes for 100 points
const T_M_THRESHOLD_2_DEFAULT = 120; // Time in minutes for 30 points
const P_MENTAL_MAX_POINTS_DEFAULT = 100;
const P_MENTAL_MIN_POINTS_DEFAULT = 30;

// Scoring constants for P_extras
const P_EXTRAS_MAX_CAP_DEFAULT = 30;
const P_EXTRAS_MIN_CAP_DEFAULT = -10;

const EXTRA_GAME_POINTS_VALUES: Record<ExtraGameType, Record<ExtraGameStatusDetail, number>> = {
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
        return;
    }

    const latestScore = participantScores.reduce((latest, current) => 
      new Date(current.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? current : latest
    );

    // Calculate P_fisico
    let p_fisico: number;
    const tp = latestScore.tiempo_fisico;
    if (tp <= T_P_THRESHOLD_1_DEFAULT) {
      p_fisico = P_FISICO_MAX_POINTS_DEFAULT;
    } else if (tp >= T_P_THRESHOLD_2_DEFAULT) {
      p_fisico = P_FISICO_MIN_POINTS_DEFAULT;
    } else {
      const rate_fisico = (P_FISICO_MAX_POINTS_DEFAULT - P_FISICO_MIN_POINTS_DEFAULT) / (T_P_THRESHOLD_2_DEFAULT - T_P_THRESHOLD_1_DEFAULT);
      p_fisico = P_FISICO_MAX_POINTS_DEFAULT - (tp - T_P_THRESHOLD_1_DEFAULT) * rate_fisico;
    }
    p_fisico = roundToOneDecimal(p_fisico);

    // Calculate P_mental
    let p_mental: number;
    const tm = latestScore.tiempo_mental;
    if (tm <= T_M_THRESHOLD_1_DEFAULT) {
      p_mental = P_MENTAL_MAX_POINTS_DEFAULT;
    } else if (tm >= T_M_THRESHOLD_2_DEFAULT) {
      p_mental = P_MENTAL_MIN_POINTS_DEFAULT;
    } else {
      const rate_mental = (P_MENTAL_MAX_POINTS_DEFAULT - P_MENTAL_MIN_POINTS_DEFAULT) / (T_M_THRESHOLD_2_DEFAULT - T_M_THRESHOLD_1_DEFAULT);
      p_mental = P_MENTAL_MAX_POINTS_DEFAULT - (tm - T_M_THRESHOLD_1_DEFAULT) * rate_mental;
    }
    p_mental = roundToOneDecimal(p_mental);
    
    // Calculate P_extras
    let p_extras_cruda = 0;
    const individual_extra_game_points: { [gameId: string]: number } = {};

    definedExtraGames.forEach(extraGame => {
      const status = latestScore.extraGameDetailedStatuses?.[extraGame.id] || 'no_hecho'; 
      const gameType = extraGame.extraType || 'opcional'; 
      const pointsForThisGame = EXTRA_GAME_POINTS_VALUES[gameType][status];
      p_extras_cruda += pointsForThisGame;
      individual_extra_game_points[extraGame.id] = pointsForThisGame;
    });

    const p_extras = roundToOneDecimal(Math.max(P_EXTRAS_MIN_CAP_DEFAULT, Math.min(p_extras_cruda, P_EXTRAS_MAX_CAP_DEFAULT)));
    p_extras_cruda = roundToOneDecimal(p_extras_cruda);

    // Calculate P_total
    const p_total = roundToOneDecimal(p_fisico + p_mental + p_extras);

    leaderboardEntries.push({
      ...participant,
      rank: 0, 
      latest_tiempo_fisico: latestScore.tiempo_fisico,
      latest_tiempo_mental: latestScore.tiempo_mental,
      latest_extra_game_detailed_statuses: latestScore.extraGameDetailedStatuses || {},
      latestScoreId: latestScore.id, // Store the ID of the latest score
      
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
    if (a.latest_tiempo_fisico !== b.latest_tiempo_fisico) {
        return a.latest_tiempo_fisico - b.latest_tiempo_fisico;
    }
    return a.latest_tiempo_mental - b.latest_tiempo_mental;
  });

  return leaderboardEntries.map((entry, index) => ({ ...entry, rank: index + 1 }));
};

    