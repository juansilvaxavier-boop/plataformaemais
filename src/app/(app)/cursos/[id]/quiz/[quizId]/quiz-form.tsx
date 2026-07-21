"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { CheckCircle2, XCircle } from "lucide-react";

type Question = {
  id: string;
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options: { id: string; text: string }[];
};

export function QuizForm({ quizId, questions }: { quizId: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function selectSingle(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  }

  function toggleMultiple(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }

  async function submit() {
    setSubmitting(true);
    const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    setResult({ score: data.attempt.score, passed: data.attempt.passed });
    setSubmitting(false);
    router.refresh();
  }

  if (result) {
    return (
      <div
        className={`rounded-xl border p-6 text-center ${
          result.passed ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        }`}
      >
        {result.passed ? (
          <CheckCircle2 className="mx-auto text-emerald-600 mb-2" size={32} />
        ) : (
          <XCircle className="mx-auto text-red-600 mb-2" size={32} />
        )}
        <p className="text-lg font-bold">{result.score}%</p>
        <p className="text-sm text-slate-600">
          {result.passed ? "Você foi aprovado! Pode seguir para a próxima etapa." : "Nota insuficiente. Revise o conteúdo e tente novamente."}
        </p>
        {!result.passed && (
          <Button className="mt-4" size="sm" onClick={() => setResult(null)}>
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => (
        <div key={q.id} className="border border-slate-200 rounded-lg p-4">
          <p className="font-medium text-slate-800 mb-3">
            {idx + 1}. {q.text}
          </p>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const checked = (answers[q.id] ?? []).includes(opt.id);
              return (
                <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                    name={q.id}
                    checked={checked}
                    onChange={() =>
                      q.type === "MULTIPLE_CHOICE"
                        ? toggleMultiple(q.id, opt.id)
                        : selectSingle(q.id, opt.id)
                    }
                  />
                  {opt.text}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <Button disabled={submitting} onClick={submit}>
        Enviar respostas
      </Button>
    </div>
  );
}
