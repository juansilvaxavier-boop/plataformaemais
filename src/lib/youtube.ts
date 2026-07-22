const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

/**
 * Extrai o ID de um vídeo do YouTube a partir de qualquer formato comum de
 * URL (watch, youtu.be, embed, shorts). Vídeos "não listados" (o equivalente
 * a "privado com link") funcionam normalmente em iframes, pois o YouTube só
 * bloqueia embed de vídeos totalmente privados (restritos à conta do dono).
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!YOUTUBE_HOSTS.has(parsed.hostname)) return null;

  if (parsed.hostname.endsWith("youtu.be")) {
    const id = parsed.pathname.slice(1);
    return id || null;
  }

  if (parsed.pathname.startsWith("/embed/")) {
    return parsed.pathname.replace("/embed/", "") || null;
  }

  if (parsed.pathname.startsWith("/shorts/")) {
    return parsed.pathname.replace("/shorts/", "") || null;
  }

  return parsed.searchParams.get("v");
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}
