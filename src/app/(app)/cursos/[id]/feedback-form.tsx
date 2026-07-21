"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { submitCourseFeedback } from "../actions";

export function FeedbackForm({
  courseId,
  existing,
}: {
  courseId: string;
  existing: { rating: number; comment: string | null } | null;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 8);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(Boolean(existing));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-slate-500 mb-1">
          De 0 a 10, o quanto você recomendaria este curso a um colega? (NPS)
        </p>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`w-8 h-8 rounded text-xs font-medium border ${
                rating === n ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-300 text-slate-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        rows={2}
        placeholder="Comentários (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await submitCourseFeedback(courseId, rating, comment);
            setSent(true);
          })
        }
      >
        {sent ? "Atualizar avaliação" : "Enviar avaliação"}
      </Button>
      {sent && <p className="text-xs text-emerald-600">Obrigado pelo feedback!</p>}
    </div>
  );
}
