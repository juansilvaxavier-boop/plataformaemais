"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { YouTubePlayer } from "./youtube-player";

const HEARTBEAT_INTERVAL_MS = 4000;

type VideoPlayerProps = {
  lessonId: string;
  videoUrl: string;
  hasCaptions: boolean;
  initialMaxWatched: number;
  initialCompleted: boolean;
};

export function VideoPlayer(props: VideoPlayerProps) {
  const youTubeVideoId = extractYouTubeVideoId(props.videoUrl);
  if (youTubeVideoId) {
    return (
      <YouTubePlayer
        lessonId={props.lessonId}
        videoId={youTubeVideoId}
        initialMaxWatched={props.initialMaxWatched}
        initialCompleted={props.initialCompleted}
      />
    );
  }
  return <NativeVideoPlayer {...props} />;
}

function NativeVideoPlayer({
  lessonId,
  videoUrl,
  hasCaptions,
  initialMaxWatched,
  initialCompleted,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchedRef = useRef(initialMaxWatched);
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  async function sendHeartbeat(positionSeconds: number) {
    const res = await fetch(`/api/lessons/${lessonId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionSeconds }),
    });
    const data = await res.json();

    if (res.status === 409) {
      // Salto detectado: o servidor devolve a posição máxima válida.
      const safePosition = data.maxWatchedSeconds ?? maxWatchedRef.current;
      if (videoRef.current) videoRef.current.currentTime = safePosition;
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
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (initialMaxWatched > 0) {
      video.currentTime = Math.min(initialMaxWatched, video.duration || initialMaxWatched);
    }

    let lastSent = 0;
    function onTimeUpdate() {
      const now = Date.now();
      if (now - lastSent >= HEARTBEAT_INTERVAL_MS) {
        lastSent = now;
        sendHeartbeat(video!.currentTime);
      }
    }

    function onSeeking() {
      const tolerance = 5;
      if (video!.currentTime > maxWatchedRef.current + tolerance) {
        video!.currentTime = maxWatchedRef.current;
        setBlockedMessage("Não é possível avançar a barra manualmente. Assista à aula na íntegra.");
        setTimeout(() => setBlockedMessage(null), 4000);
      }
    }

    function onEnded() {
      sendHeartbeat(video!.duration);
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList="nodownload"
        className="w-full rounded-xl bg-black aspect-video"
      >
        {hasCaptions && (
          <track kind="captions" src={`/api/lessons/${lessonId}/captions.vtt`} srcLang="pt" label="Português" default />
        )}
      </video>

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
