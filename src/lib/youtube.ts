/**
 * Extrai o ID de um vídeo do YouTube a partir de qualquer formato comum de
 * URL (watch, youtu.be, embed, shorts, live), com ou sem protocolo/www.
 *
 * Importante (limitação da própria plataforma, não do código): o YouTube só
 * permite embutir vídeos com visibilidade "Não listado" ou "Público". Um
 * vídeo marcado como "Privado" nunca é reproduzível fora do youtube.com pela
 * conta do dono — para usar aqui, o vídeo precisa estar como "Não listado".
 */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Aceita URLs coladas sem protocolo (ex.: "www.youtube.com/watch?v=...").
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const isYouTubeHost = hostname === "youtube.com" || hostname.endsWith(".youtube.com");
  const isShortHost = hostname === "youtu.be" || hostname.endsWith(".youtu.be");
  if (!isYouTubeHost && !isShortHost) return null;

  const cleanId = (segment: string | null) => {
    if (!segment) return null;
    const id = segment.replace(/\/+$/, "");
    return id || null;
  };

  if (isShortHost) {
    return cleanId(parsed.pathname.slice(1));
  }

  for (const prefix of ["/embed/", "/shorts/", "/live/"]) {
    if (parsed.pathname.startsWith(prefix)) {
      return cleanId(parsed.pathname.slice(prefix.length));
    }
  }

  return parsed.searchParams.get("v");
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}
