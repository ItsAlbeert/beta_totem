
import type { Participant, Score, LeaderboardEntry, ExtraChallengeStatus } from "@/types";

const PESO_FISICO = 0.45;
const PESO_MENTAL = 0.40;
const PESO_EXTRA = 0.15;
const PENALIZACION_MAX_EXTRA_MINUTOS = 30; // Max penalty/bonus for extra tasks

// Helper to convert estado_extra to its numeric value
function getExtraNumericValue(status: ExtraChallengeStatus): number {
  switch (status) {
    case 'no_hecho': return 0;
    case 'hecho_a_medias': return 0.5;
    case 'hecho': return 1;
    default: return 0;
  }
}

export const calculateAllParticipantScores = (
  participants: Participant[],
  allScores: Score[] 
): LeaderboardEntry[] => {
  if (!participants.length || !allScores.length) {
    return [];
  }

  // 1. Determine global T_p_min, T_p_max, T_m_min, T_m_max from ALL scores
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
  
  // Handle cases where all times are the same
  const tp_range_is_zero = tp_max === tp_min;
  const tm_range_is_zero = tm_max === tm_min;

  const leaderboardEntries: LeaderboardEntry[] = [];

  participants.forEach(participant => {
    const participantScores = allScores.filter(s => s.participantId === participant.id);
    if (participantScores.length === 0) return; // Skip participant if no scores

    // Get the latest score for this participant
    const latestScore = participantScores.reduce((latest, current) => 
      new Date(current.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? current : latest
    );

    // 2. Calculate S_p (Normalized Physical Score)
    let s_p: number;
    if (tp_range_is_zero) {
      s_p = 100;
    } else {
      s_p = ((tp_max - latestScore.tiempo_fisico) / (tp_max - tp_min)) * 100;
    }
    s_p = Math.max(0, Math.min(100, s_p)); // Ensure score is between 0 and 100

    // 3. Calculate S_m (Normalized Mental Score)
    let s_m: number;
    if (tm_range_is_zero) {
      s_m = 100;
    } else {
      s_m = ((tm_max - latestScore.tiempo_mental) / (tm_max - tm_min)) * 100;
    }
    s_m = Math.max(0, Math.min(100, s_m)); // Ensure score is between 0 and 100

    // 4. Calculate S_e (Normalized Extra Score)
    const ev_normalizado = getExtraNumericValue(latestScore.estado_extra);
    const e_ajuste_minutos = (1 - 2 * ev_normalizado) * PENALIZACION_MAX_EXTRA_MINUTOS;
    // Normalize E to S_e: E from [-PENALIZACION_MAX, +PENALIZACION_MAX] maps to S_e [100, 0]
    // S_e = ( (PENALIZACION_MAX) - E_ajuste ) / ( (PENALIZACION_MAX) - (-PENALIZACION_MAX) ) * 100
    // S_e = (PENALIZACION_MAX - E_ajuste) / (2 * PENALIZACION_MAX) * 100
    let s_e = ((PENALIZACION_MAX_EXTRA_MINUTOS - e_ajuste_minutos) / (2 * PENALIZACION_MAX_EXTRA_MINUTOS)) * 100;
    s_e = Math.max(0, Math.min(100, s_e)); // Ensure score is between 0 and 100

    // 5. Calculate SF (Final Weighted Score)
    const sf = (PESO_FISICO * s_p) + (PESO_MENTAL * s_m) + (PESO_EXTRA * s_e);

    leaderboardEntries.push({
      ...participant,
      rank: 0, // Rank will be assigned after sorting
      latest_tiempo_fisico: latestScore.tiempo_fisico,
      latest_tiempo_mental: latestScore.tiempo_mental,
      latest_estado_extra: latestScore.estado_extra,
      puntuacion_fisica_normalizada: parseFloat(s_p.toFixed(1)),
      puntuacion_mental_normalizada: parseFloat(s_m.toFixed(1)),
      ajuste_extra_minutos: parseFloat(e_ajuste_minutos.toFixed(1)),
      puntuacion_extra_normalizada: parseFloat(s_e.toFixed(1)),
      puntuacion_final_ponderada: parseFloat(sf.toFixed(1)),
      scoreRecordedAt: latestScore.recordedAt,
      gameTimes: latestScore.gameTimes,
    });
  });

  // Sort by SF (descending - higher is better)
  leaderboardEntries.sort((a, b) => b.puntuacion_final_ponderada - a.puntuacion_final_ponderada);

  // Assign ranks
  return leaderboardEntries.map((entry, index) => ({ ...entry, rank: index + 1 }));
};
