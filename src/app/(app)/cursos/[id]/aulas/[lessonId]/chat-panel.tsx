"use client";

import { useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Button, Textarea } from "@/components/ui";

type Message = { role: "USER" | "ASSISTANT"; content: string };

export function ChatPanel({ courseId }: { courseId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [chatSessionId, setChatSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!question.trim()) return;
    const q = question;
    setMessages((prev) => [...prev, { role: "USER", content: q }]);
    setQuestion("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, question: q, chatSessionId }),
    });
    const data = await res.json();
    setChatSessionId(data.chatSessionId);
    setMessages((prev) => [...prev, { role: "ASSISTANT", content: data.answer }]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-semibold text-slate-800 mb-2 text-sm flex items-center gap-2">
        <Bot size={16} className="text-indigo-600" /> Assistente do curso
      </h3>
      <div className="flex-1 space-y-3 overflow-y-auto mb-3 max-h-64">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400">
            Tire dúvidas sobre o conteúdo desta aula em tempo real.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 text-xs ${m.role === "USER" ? "justify-end" : ""}`}>
            {m.role === "ASSISTANT" && <Bot size={14} className="text-indigo-600 shrink-0 mt-0.5" />}
            <div
              className={`rounded-lg px-3 py-2 whitespace-pre-wrap max-w-[85%] ${
                m.role === "USER" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {m.content}
            </div>
            {m.role === "USER" && <User size={14} className="text-slate-400 shrink-0 mt-0.5" />}
          </div>
        ))}
        {loading && <p className="text-xs text-slate-400">Pensando...</p>}
      </div>
      <div className="flex gap-2">
        <Textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex.: qual o principal ponto desta aula?"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button size="sm" onClick={send} disabled={loading}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
