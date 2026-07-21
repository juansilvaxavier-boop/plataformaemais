"use client";

import { useEffect, useState } from "react";
import { Button, Textarea } from "@/components/ui";

type Note = { id: string; timestampSeconds: number; content: string };

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function NotesPanel({ lessonId }: { lessonId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/notes`)
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []));
  }, [lessonId]);

  function getCurrentVideoTime(): number {
    const video = document.querySelector("video");
    return video?.currentTime ?? 0;
  }

  async function saveNote() {
    if (!content.trim()) return;
    setSaving(true);
    const timestampSeconds = getCurrentVideoTime();
    const res = await fetch(`/api/lessons/${lessonId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestampSeconds, content }),
    });
    const data = await res.json();
    if (data.note) setNotes((prev) => [...prev, data.note].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
    setContent("");
    setSaving(false);
  }

  function jumpTo(timestampSeconds: number) {
    const video = document.querySelector("video") as HTMLVideoElement | null;
    if (video) video.currentTime = Math.min(timestampSeconds, video.currentTime);
  }

  return (
    <div>
      <h3 className="font-semibold text-slate-800 mb-2 text-sm">Minhas anotações</h3>
      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => jumpTo(n.timestampSeconds)}
            className="w-full text-left text-xs bg-slate-50 hover:bg-slate-100 rounded p-2"
          >
            <span className="text-indigo-600 font-mono mr-2">{formatTime(n.timestampSeconds)}</span>
            {n.content}
          </button>
        ))}
        {notes.length === 0 && <p className="text-xs text-slate-400">Nenhuma anotação ainda.</p>}
      </div>
      <Textarea
        rows={2}
        placeholder="Adicionar anotação no minuto atual..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button size="sm" className="mt-2" disabled={saving} onClick={saveNote}>
        Salvar anotação
      </Button>
    </div>
  );
}
