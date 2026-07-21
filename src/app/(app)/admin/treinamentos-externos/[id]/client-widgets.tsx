"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Input, Select } from "@/components/ui";
import { Upload, Loader2 } from "lucide-react";
import {
  addParticipant,
  removeParticipant,
  updateParticipantCompletion,
  setExternalTrainingCompetencies,
  setExternalTrainingStatus,
} from "../actions";
import type { ExternalTrainingStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";

export function AddParticipantForm({
  trainingId,
  candidates,
}: {
  trainingId: string;
  candidates: { id: string; name: string; email: string }[];
}) {
  const [userId, setUserId] = useState(candidates[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  if (candidates.length === 0) {
    return <p className="text-xs text-slate-400">Todos os colaboradores ativos já foram adicionados.</p>;
  }

  return (
    <div className="flex gap-2">
      <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.email})
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => addParticipant(trainingId, userId))}
      >
        Adicionar
      </Button>
    </div>
  );
}

type Participant = {
  id: string;
  userName: string;
  attended: boolean;
  certificateUrl: string | null;
  notes: string | null;
};

export function ParticipantRow({
  trainingId,
  participant,
}: {
  trainingId: string;
  participant: Participant;
}) {
  const [attended, setAttended] = useState(participant.attended);
  const [certificateUrl, setCertificateUrl] = useState(participant.certificateUrl ?? "");
  const [notes, setNotes] = useState(participant.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function save(nextAttended: boolean) {
    setAttended(nextAttended);
    startTransition(async () => {
      await updateParticipantCompletion(trainingId, participant.id, {
        attended: nextAttended,
        certificateUrl,
        notes,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setCertificateUrl(data.url);
        startTransition(async () => {
          await updateParticipantCompletion(trainingId, participant.id, {
            attended,
            certificateUrl: data.url,
            notes,
          });
        });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={attended}
            disabled={isPending}
            onChange={(e) => save(e.target.checked)}
          />
          {participant.userName}
          {attended && <span className="text-xs text-emerald-600 font-normal">Presença confirmada</span>}
        </label>
        <RemoveButton trainingId={trainingId} participantId={participant.id} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex gap-1">
          <Input
            placeholder="URL do certificado/comprovante"
            value={certificateUrl}
            onChange={(e) => setCertificateUrl(e.target.value)}
            onBlur={() =>
              startTransition(async () => {
                await updateParticipantCompletion(trainingId, participant.id, {
                  attended,
                  certificateUrl,
                  notes,
                });
              })
            }
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 px-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Enviar arquivo"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
        <Input
          placeholder="Observações"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() =>
            startTransition(async () => {
              await updateParticipantCompletion(trainingId, participant.id, {
                attended,
                certificateUrl,
                notes,
              });
            })
          }
        />
      </div>
      {saved && <p className="text-xs text-emerald-600">Salvo.</p>}
    </div>
  );
}

function RemoveButton({ trainingId, participantId }: { trainingId: string; participantId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => removeParticipant(trainingId, participantId))}
      className="text-slate-400 hover:text-red-600"
    >
      <Trash2 size={14} />
    </button>
  );
}

export function CompetencyForm({
  trainingId,
  skills,
  initial,
}: {
  trainingId: string;
  skills: { id: string; name: string }[];
  initial: { skillId: string; level: number }[];
}) {
  const [entries, setEntries] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(skillId: string) {
    const exists = entries.find((e) => e.skillId === skillId);
    const next = exists ? entries.filter((e) => e.skillId !== skillId) : [...entries, { skillId, level: 3 }];
    setEntries(next);
    startTransition(() => setExternalTrainingCompetencies(trainingId, next));
  }

  function updateLevel(skillId: string, level: number) {
    const next = entries.map((e) => (e.skillId === skillId ? { ...e, level } : e));
    setEntries(next);
    startTransition(() => setExternalTrainingCompetencies(trainingId, next));
  }

  if (skills.length === 0) {
    return <p className="text-xs text-slate-400">Cadastre competências em Administração → Matriz de Competências.</p>;
  }

  return (
    <div className="space-y-2">
      {skills.map((s) => {
        const entry = entries.find((e) => e.skillId === s.id);
        return (
          <div key={s.id} className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={isPending}
              onClick={() => toggle(s.id)}
              className={`px-2 py-1 rounded-full border ${
                entry ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300"
              }`}
            >
              {s.name}
            </button>
            {entry && (
              <select
                value={entry.level}
                onChange={(e) => updateLevel(s.id, Number(e.target.value))}
                className="border border-slate-300 rounded px-1 py-0.5"
              >
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Nível {lvl}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatusSelect({ trainingId, status }: { trainingId: string; status: ExternalTrainingStatus }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => setExternalTrainingStatus(trainingId, e.target.value as ExternalTrainingStatus))
      }
      className="text-sm rounded border border-slate-300 px-2 py-1.5 bg-white disabled:opacity-50"
    >
      <option value="AGENDADO">Agendado</option>
      <option value="REALIZADO">Realizado</option>
      <option value="CANCELADO">Cancelado</option>
    </select>
  );
}
