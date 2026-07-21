"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";

export function RecertificationCheckButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await fetch("/api/admin/recertification-check", { method: "POST" });
            const data = await res.json();
            setResult(`${data.created} recertificação(ões) disparada(s).`);
          })
        }
      >
        Verificar recertificações vencidas
      </Button>
      {result && <p className="text-xs text-slate-500 mt-1">{result}</p>}
    </div>
  );
}
