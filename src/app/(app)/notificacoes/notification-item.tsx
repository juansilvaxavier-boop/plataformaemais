"use client";

import { useState, useTransition } from "react";
import { cn, formatDateTime } from "@/lib/utils";

export function NotificationItem({
  id,
  title,
  body,
  read,
  createdAt,
}: {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}) {
  const [isRead, setIsRead] = useState(read);
  const [, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          if (isRead) return;
          setIsRead(true);
          await fetch(`/api/notifications/${id}/read`, { method: "POST" });
        })
      }
      className={cn(
        "w-full text-left border rounded-lg p-4 transition-colors",
        isRead ? "bg-white border-slate-200" : "bg-indigo-50 border-indigo-200"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm text-slate-800">{title}</span>
        {!isRead && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
      </div>
      <p className="text-sm text-slate-600">{body}</p>
      <p className="text-xs text-slate-400 mt-1">{formatDateTime(createdAt)}</p>
    </button>
  );
}
