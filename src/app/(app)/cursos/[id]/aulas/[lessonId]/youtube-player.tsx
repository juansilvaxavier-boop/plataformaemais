"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

const HEARTBEAT_INTERVAL_MS = 4000;

// Tipagem mínima da IFrame Player API do YouTube (carregada via script externo).
type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
  });
  return youtubeApiPromise;
}

export function YouTubePlayer({
  lessonId,
  videoId,
  initialMaxWatched,
  initialCompleted,
}: {
  lessonId: string;
  videoId: string;
  initialMaxWatched: number;
  initialCompleted: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const maxWatchedRef = useRef(initialMaxWatched);
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  // A mesma rota de heartbeat usada pelo player nativo: o servidor é a única
  // fonte de verdade sobre o progresso (evaluateHeartbeat), então aqui só
  // reportamos a posição atual e corrigimos o player quando o servidor rejeita
  // um salto (HTTP 409).
  const sendHeartbeat = useCallback(
    async (positionSeconds: number) => {
      const res = await fetch(`/api/lessons/${lessonId}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionSeconds }),
      });
      const data = await res.json();

      if (res.status === 409) {
        const safePosition = data.maxWatchedSeconds ?? maxWatchedRef.current;
        playerRef.current?.seekTo(safePosition, true);
        setBlockedMessage(data.error ?? "Avanço bloqueado. Assista à aula continuamente.");
        setTimeout(() => setBlockedMessage(null), 4000);
        return;
      }

      maxWatchedRef.current = Math.max(maxWatchedRef.current, data.progress?.maxWatchedSeconds ?? 0);

      if (data.progress?.completed && !completed) {
        setCompleted(true);
        if (data.newBadges?.length) setNewBadges(data.newBadges);
        router.refresh();
      }
    },
    [lessonId, completed, router]
  );

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (event) => {
            if (initialMaxWatched > 0) {
              event.target.seekTo(initialMaxWatched, true);
            }
          },
          onStateChange: (event) => {
            if (window.YT && event.data === window.YT.PlayerState.ENDED) {
              sendHeartbeat(event.target.getDuration());
            }
          },
        },
      });

      pollTimer = setInterval(() => {
        const player = playerRef.current;
        if (!player) return;
        sendHeartbeat(player.getCurrentTime());
      }, HEARTBEAT_INTERVAL_MS);
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div>
      <div className="w-full rounded-xl overflow-hidden bg-black aspect-video">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {blockedMessage && (
        <div className="mt-2 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2">
          {blockedMessage}
        </div>
      )}

      {completed && (
        <div className="mt-2 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <CheckCircle2 size={16} /> Aula concluída (100% reproduzido).
        </div>
      )}

      {newBadges.length > 0 && (
        <div className="mt-2 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-3 py-2">
          🏆 Nova(s) conquista(s): {newBadges.join(", ")}
        </div>
      )}
    </div>
  );
}
