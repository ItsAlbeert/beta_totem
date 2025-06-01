
import type { Participant, Score, LeaderboardEntry, ExtraChallengeStatus, Game } from "@/types";

const PESO_FISICO = 0.45;
const PESO_MENTAL = 0.40;
const PESO_EXTRA = 0.15;
const PENALIZACION_MAX_EXTRA_MINUTOS = 30; // Max penalty/bonus for extra tasks

function getExtraNumericValue(status: ExtraChallengeStatus | undefined): number {
  if (status === undefined) return 0; // Default to 'no_hecho' if status is missing
  switch (status) {
    case 'no_hecho': return 0;
    case 'hecho_a_medias': return 0.5;
    case 'hecho': return 1;
    default: return 0;
  }
}

export const calculateAllParticipantScores = (
  participants: Participant[],
  allScores: Score[],
  allGames: Game[] // Pass all defined games to know N for extra challenges
): LeaderboardEntry[] => {
  if (!participants.length || !allScores.length) {
    return [];
  }

  let tp_min = Infinity;
  let tp_max = -Infinity;
  let tm_min = Infinity;
  let tm_max = -Infinity;

  allScores.forEach(score => {
    if (score.tiempo_fisico < tp_min) tp_min = score.tiempo_fisico;
    if (score.tiempo_fisico > tp_max) tp_max = score.tiempo_fisico;
    if (score.tiempo_mental < tm_min) tm_min = score.tiempo_mental;
    if (score.tiempo_mental > tm_max) tm_max = score.tiempo_mental;
  });
  
  const tp_range_is_zero = tp_max === tp_min;
  const tm_range_is_zero = tm_max === tm_min;

  const definedExtraGames = allGames.filter(game => game.category === 'Extra');
  const N_extra_challenges = definedExtraGames.length > 0 ? definedExtraGames.length : 1; // Avoid division by zero if no extra games defined. Default to 1.


  const leaderboardEntries: LeaderboardEntry[] = [];

  participants.forEach(participant => {
    const participantScores = allScores.filter(s => s.participantId === participant.id);
    if (participantScores.length === 0) return;

    const latestScore = participantScores.reduce((latest, current) => 
      new Date(current.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? current : latest
    );

    let s_p: number;
    if (tp_range_is_zero) {
      s_p = (latestScore.tiempo_fisico <= tp_min) ? 100 : 0; // If all same, 100 if at min, else 0 (though this case is rare if range is zero)
    } else {
      s_p = ((tp_max - latestScore.tiempo_fisico) / (tp_max - tp_min)) * 100;
    }
    s_p = Math.max(0, Math.min(100, s_p));

    let s_m: number;
    if (tm_range_is_zero) {
      s_m = (latestScore.tiempo_mental <= tm_min) ? 100 : 0;
    } else {
      s_m = ((tm_max - latestScore.tiempo_mental) / (tm_max - tm_min)) * 100;
    }
    s_m = Math.max(0, Math.min(100, s_m));

    let EV_total = 0;
    if (latestScore.extraGameStatuses && definedExtraGames.length > 0) {
      definedExtraGames.forEach(extraGame => {
        const status = latestScore.extraGameStatuses?.[extraGame.id];
        EV_total += getExtraNumericValue(status);
      });
    }
    // If no extra games defined, or no statuses, EV_total remains 0.
    // N_extra_challenges will be at least 1.
    const EV_normalizado = definedExtraGames.length > 0 ? EV_total / N_extra_challenges : 0;


    const e_ajuste_minutos = (1 - 2 * EV_normalizado) * PENALIZACION_MAX_EXTRA_MINUTOS;
    let s_e = ((PENALIZACION_MAX_EXTRA_MINUTOS - e_ajuste_minutos) / (2 * PENALIZACION_MAX_EXTRA_MINUTOS)) * 100;
    s_e = Math.max(0, Math.min(100, s_e));

    const sf = (PESO_FISICO * s_p) + (PESO_MENTAL * s_m) + (PESO_EXTRA * s_e);

    leaderboardEntries.push({
      ...participant,
      rank: 0,
      latest_tiempo_fisico: latestScore.tiempo_fisico,
      latest_tiempo_mental: latestScore.tiempo_mental,
      latest_extra_game_statuses: latestScore.extraGameStatuses,
      puntuacion_fisica_normalizada: parseFloat(s_p.toFixed(1)),
      puntuacion_mental_normalizada: parseFloat(s_m.toFixed(1)),
      ajuste_extra_minutos: parseFloat(e_ajuste_minutos.toFixed(1)),
      puntuacion_extra_normalizada: parseFloat(s_e.toFixed(1)),
      puntuacion_final_ponderada: parseFloat(sf.toFixed(1)),
      scoreRecordedAt: latestScore.recordedAt,
      gameTimes: latestScore.gameTimes,
    });
  });

  leaderboardEntries.sort((a, b) => b.puntuacion_final_ponderada - a.puntuacion_final_ponderada);

  return leaderboardEntries.map((entry, index) => ({ ...entry, rank: index + 1 }));
};
