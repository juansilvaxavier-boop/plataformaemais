// Tolerância para variações naturais do player (buffering, intervalo do heartbeat).
export const SEEK_TOLERANCE_SECONDS = 5;
// Percentual mínimo assistido para considerar a aula 100% concluída.
export const COMPLETION_THRESHOLD = 0.98;

export type HeartbeatResult =
  | { allowed: false; maxWatchedSeconds: number }
  | { allowed: true; newMax: number; percent: number; willComplete: boolean };

/**
 * Núcleo da validação anti-fraude de reprodução de vídeo: dado o progresso
 * já validado (currentMax) e a posição reportada pelo cliente, decide se o
 * heartbeat é aceito e calcula o novo progresso. Extraído do route handler
 * para ser testável sem precisar de um banco de dados.
 */
export function evaluateHeartbeat(params: {
  currentMax: number;
  positionSeconds: number;
  durationSeconds: number;
}): HeartbeatResult {
  const { currentMax, positionSeconds, durationSeconds } = params;

  if (positionSeconds > currentMax + SEEK_TOLERANCE_SECONDS) {
    return { allowed: false, maxWatchedSeconds: currentMax };
  }

  const newMax = Math.max(currentMax, positionSeconds);
  const percent = durationSeconds > 0 ? Math.min(100, (newMax / durationSeconds) * 100) : 0;
  const willComplete = durationSeconds > 0 && newMax / durationSeconds >= COMPLETION_THRESHOLD;

  return { allowed: true, newMax, percent, willComplete };
}
