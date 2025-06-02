
import type { Participant, Score, LeaderboardEntry, Game, ExtraGameStatusDetail, ExtraGameType, ScoringSettings } from "@/types";

const roundToOneDecimal = (num: number): number => parseFloat(num.toFixed(1));

export const calculateAllParticipantScores = (
  participants: Participant[],
  allScores: Score[],
  allGames: Game[],
  settings: ScoringSettings // Added scoring settings parameter
): LeaderboardEntry[] => {
  if (!participants.length || !settings) {
    return [];
  }

  const { physical: physicalSettings, mental: mentalSettings, extras: extrasSettings } = settings;

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
    if (tp <= physicalSettings.threshold1) {
      p_fisico = physicalSettings.maxPoints;
    } else if (tp >= physicalSettings.threshold2) {
      p_fisico = physicalSettings.minPoints;
    } else {
      // Linear interpolation
      const rate_fisico = (physicalSettings.maxPoints - physicalSettings.minPoints) / (physicalSettings.threshold2 - physicalSettings.threshold1);
      p_fisico = physicalSettings.maxPoints - (tp - physicalSettings.threshold1) * rate_fisico;
    }
    p_fisico = roundToOneDecimal(Math.max(physicalSettings.minPoints, Math.min(p_fisico, physicalSettings.maxPoints)));


    // Calculate P_mental
    let p_mental: number;
    const tm = latestScore.tiempo_mental;
    if (tm <= mentalSettings.threshold1) {
      p_mental = mentalSettings.maxPoints;
    } else if (tm >= mentalSettings.threshold2) {
      p_mental = mentalSettings.minPoints;
    } else {
      const rate_mental = (mentalSettings.maxPoints - mentalSettings.minPoints) / (mentalSettings.threshold2 - mentalSettings.threshold1);
      p_mental = mentalSettings.maxPoints - (tm - mentalSettings.threshold1) * rate_mental;
      // This is equivalent to: P_mental = mentalSettings.maxPoints + mentalSettings.minPoints - mentalSettings.threshold1 - tm; if rate is 1
      // Or more generally, 100 - 1*(Tm-50) => 150 - Tm if max=100, min=30, t1=50, t2=120. (70/70 = 1)
      // Using your formula: 100 - ( (Tm - 50) * ( (100-30) / (120-50) ) ) -> 100 - ( (Tm-50) * 1) = 150 - Tm
    }
     p_mental = roundToOneDecimal(Math.max(mentalSettings.minPoints, Math.min(p_mental, mentalSettings.maxPoints)));


    // Calculate P_extras
    let p_extras_cruda = 0;
    const individual_extra_game_points: { [gameId: string]: number } = {};

    definedExtraGames.forEach(extraGame => {
      const status = latestScore.extraGameDetailedStatuses?.[extraGame.id] || 'no_hecho'; 
      const gameType = extraGame.extraType || 'opcional'; 
      let pointsForThisGame = 0;

      if (gameType === 'opcional') {
        pointsForThisGame = extrasSettings.points.opcional[status];
      } else if (gameType === 'obligatoria') {
        pointsForThisGame = extrasSettings.points.obligatoria[status];
      }
      
      p_extras_cruda += pointsForThisGame;
      individual_extra_game_points[extraGame.id] = pointsForThisGame;
    });

    const p_extras = roundToOneDecimal(Math.max(extrasSettings.capMin, Math.min(p_extras_cruda, extrasSettings.capMax)));
    const p_extras_cruda_rounded = roundToOneDecimal(p_extras_cruda);

    // Calculate P_total
    const p_total = roundToOneDecimal(p_fisico + p_mental + p_extras);

    leaderboardEntries.push({
      ...participant,
      rank: 0, 
      latest_tiempo_fisico: latestScore.tiempo_fisico,
      latest_tiempo_mental: latestScore.tiempo_mental,
      latest_extra_game_detailed_statuses: latestScore.extraGameDetailedStatuses || {},
      latestScoreId: latestScore.id, 
      
      puntos_fisico: p_fisico,
      puntos_mental: p_mental,
      puntos_extras: p_extras,
      puntos_extras_cruda: p_extras_cruda_rounded,
      puntos_total: p_total,
      individual_extra_game_points: individual_extra_game_points,

      scoreRecordedAt: latestScore.recordedAt,
      gameTimes: latestScore.gameTimes,
    });
  });

  leaderboardEntries.sort((a, b) => {
    if (b.puntos_total !== a.puntos_total) {
      return b.puntos_total - a.puntos_total; // Higher total points is better
    }
    // Tie-breaking logic (optional, can be expanded)
    if (b.puntos_fisico !== a.puntos_fisico) {
      return b.puntos_fisico - a.puntos_fisico;
    }
    if (b.puntos_mental !== a.puntos_mental) {
      return b.puntos_mental - a.puntos_mental;
    }
     // If still tied, lower physical time is better (higher S_p implies lower T_p if not at caps)
    if (a.latest_tiempo_fisico !== b.latest_tiempo_fisico) {
        return a.latest_tiempo_fisico - b.latest_tiempo_fisico;
    }
     // Finally, lower mental time is better
    return a.latest_tiempo_mental - b.latest_tiempo_mental;
  });

  return leaderboardEntries.map((entry, index) => ({ ...entry, rank: index + 1 }));
};
    
