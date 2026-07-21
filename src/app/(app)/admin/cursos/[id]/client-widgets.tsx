"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { Button, Input, Label, Textarea } from "@/components/ui";
import {
  setCoursePublished,
  setCourseTargetRoles,
  setCourseTargetDepartments,
  updateLessonTranscript,
  runLessonSummary,
  runAIQuizGeneration,
  createManualQuiz,
  setCourseCompetencies,
} from "../actions";
import { Plus, Trash2 } from "lucide-react";

const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: "Colaborador",
  INSTRUCTOR: "Instrutor",
  MANAGER: "Gestor",
  ADMIN: "Administrador",
};

export function PublishToggle({ courseId, published }: { courseId: string; published: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant={published ? "secondary" : "primary"}
      disabled={isPending}
      onClick={() => startTransition(() => setCoursePublished(courseId, !published))}
    >
      {published ? "Despublicar" : "Publicar curso"}
    </Button>
  );
}

export function TargetRolesForm({
  courseId,
  selected,
}: {
  courseId: string;
  selected: Role[];
}) {
  const [values, setValues] = useState<Role[]>(selected);
  const [isPending, startTransition] = useTransition();

  function toggle(role: Role) {
    const next = values.includes(role) ? values.filter((r) => r !== role) : [...values, role];
    setValues(next);
    startTransition(() => setCourseTargetRoles(courseId, next));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
        <button
          key={role}
          type="button"
          disabled={isPending}
          onClick={() => toggle(role)}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            values.includes(role)
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-600 border-slate-300"
          }`}
        >
          {ROLE_LABEL[role]}
        </button>
      ))}
    </div>
  );
}

export function TargetDepartmentsForm({
  courseId,
  departments,
  selected,
}: {
  courseId: string;
  departments: { id: string; name: string }[];
  selected: string[];
}) {
  const [values, setValues] = useState<string[]>(selected);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    const next = values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
    setValues(next);
    startTransition(() => setCourseTargetDepartments(courseId, next));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {departments.map((d) => (
        <button
          key={d.id}
          type="button"
          disabled={isPending}
          onClick={() => toggle(d.id)}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            values.includes(d.id)
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-600 border-slate-300"
          }`}
        >
          {d.name}
        </button>
      ))}
      {departments.length === 0 && <p className="text-xs text-slate-400">Nenhum departamento cadastrado.</p>}
    </div>
  );
}

export function TranscriptEditor({
  courseId,
  lessonId,
  initialTranscript,
  initialSummary,
}: {
  courseId: string;
  lessonId: string;
  initialTranscript: string;
  initialSummary: string;
}) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-indigo-600 hover:underline"
      >
        {open ? "Fechar transcrição/IA" : "Transcrição & IA"}
      </button>
      {open && (
        <div className="mt-2 space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <Label>Transcrição (usada pelo assistente de IA, legendas e geração de quiz)</Label>
          <Textarea
            rows={5}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Cole aqui a transcrição do vídeo..."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(() => updateLessonTranscript(courseId, lessonId, transcript))
              }
            >
              Salvar e reindexar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const s = await runLessonSummary(courseId, lessonId);
                  setSummary(s);
                })
              }
            >
              Gerar resumo executivo (IA)
            </Button>
          </div>
          {summary && (
            <div className="text-xs bg-white border border-slate-200 rounded p-2 whitespace-pre-wrap">
              {summary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AIQuizButton({
  courseId,
  moduleId,
  lessonId,
}: {
  courseId: string;
  moduleId: string;
  lessonId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        size="sm"
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await runAIQuizGeneration(courseId, moduleId, lessonId, 70);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erro ao gerar quiz.");
            }
          })
        }
      >
        Gerar quiz com IA a partir da transcrição
      </Button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

type DraftQuestion = { text: string; options: string[]; correct: number };

export function ManualQuizForm({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { text: "", options: ["", ""], correct: 0 },
  ]);

  function addQuestion() {
    setQuestions((qs) => [...qs, { text: "", options: ["", ""], correct: 0 }]);
  }

  function removeQuestion(idx: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function addOption(idx: number) {
    updateQuestion(idx, { options: [...questions[idx].options, ""] });
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Criar quiz manualmente
      </Button>
    );
  }

  return (
    <form action={createManualQuiz} className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <div className="grid grid-cols-2 gap-2">
        <Input
          name="title"
          placeholder="Título do quiz"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Input
          name="passingScore"
          type="number"
          min={0}
          max={100}
          value={passingScore}
          onChange={(e) => setPassingScore(Number(e.target.value))}
        />
      </div>

      {questions.map((q, idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded p-2 space-y-2">
          <div className="flex gap-2 items-start">
            <Textarea
              name="questionText"
              rows={2}
              value={q.text}
              onChange={(e) => updateQuestion(idx, { text: e.target.value })}
              placeholder={`Pergunta ${idx + 1}`}
              required
            />
            <button type="button" onClick={() => removeQuestion(idx)} className="text-slate-400 hover:text-red-600 mt-1">
              <Trash2 size={16} />
            </button>
          </div>
          {q.options.map((opt, oIdx) => (
            <div key={oIdx} className="flex items-center gap-2">
              <input
                type="radio"
                name={`question-${idx}-correct`}
                value={oIdx}
                checked={q.correct === oIdx}
                onChange={() => updateQuestion(idx, { correct: oIdx })}
              />
              <Input
                name={`question-${idx}-optionText`}
                value={opt}
                onChange={(e) => {
                  const options = [...q.options];
                  options[oIdx] = e.target.value;
                  updateQuestion(idx, { options });
                }}
                placeholder={`Alternativa ${oIdx + 1}`}
                required
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => addOption(idx)}
            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Alternativa
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={addQuestion}>
          <Plus size={14} /> Pergunta
        </Button>
        <Button type="submit" size="sm">
          Salvar quiz
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function CompetencyForm({
  courseId,
  skills,
  initial,
}: {
  courseId: string;
  skills: { id: string; name: string }[];
  initial: { skillId: string; level: number }[];
}) {
  const [entries, setEntries] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(skillId: string) {
    const exists = entries.find((e) => e.skillId === skillId);
    const next = exists ? entries.filter((e) => e.skillId !== skillId) : [...entries, { skillId, level: 3 }];
    setEntries(next);
    startTransition(() => setCourseCompetencies(courseId, next));
  }

  function updateLevel(skillId: string, level: number) {
    const next = entries.map((e) => (e.skillId === skillId ? { ...e, level } : e));
    setEntries(next);
    startTransition(() => setCourseCompetencies(courseId, next));
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
