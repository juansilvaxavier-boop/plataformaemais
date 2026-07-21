export type CaptionSegment = { start: number; end: number; text: string };

/**
 * Gera legendas automáticas (best-effort) distribuindo o texto da transcrição
 * proporcionalmente à duração do vídeo, sem depender de um serviço externo de ASR.
 * Quando um provedor de transcrição/tempo real estiver disponível, basta substituir
 * esta função por segmentos com timestamps precisos.
 */
export function generateNaiveCaptionSegments(
  transcript: string,
  durationSeconds: number
): CaptionSegment[] {
  const sentences = transcript
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0 || durationSeconds <= 0) return [];

  const totalChars = sentences.reduce((acc, s) => acc + s.length, 0);
  let cursor = 0;
  const segments: CaptionSegment[] = [];

  for (const sentence of sentences) {
    const share = sentence.length / totalChars;
    const length = Math.max(1, share * durationSeconds);
    const start = cursor;
    const end = Math.min(durationSeconds, cursor + length);
    segments.push({ start, end, text: sentence });
    cursor = end;
  }

  return segments;
}

function formatVttTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s
    .toFixed(3)
    .padStart(6, "0")}`;
}

export function segmentsToVtt(segments: CaptionSegment[]): string {
  const cues = segments
    .map(
      (seg) => `${formatVttTimestamp(seg.start)} --> ${formatVttTimestamp(seg.end)}\n${seg.text}`
    )
    .join("\n\n");
  return `WEBVTT\n\n${cues}\n`;
}
