"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CourseRow({ title, children }: { title: string; children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(delta: number) {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div className="mb-8 group/row relative">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">{title}</h2>

      <button
        type="button"
        onClick={() => scrollBy(-600)}
        className="hidden md:flex absolute left-0 top-[calc(50%+14px)] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
        aria-label="Rolar para a esquerda"
      >
        <ChevronLeft size={18} />
      </button>

      <div ref={scrollerRef} className="flex gap-3 overflow-x-auto scroll-smooth pb-2 -mx-1 px-1 no-scrollbar">
        {children}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(600)}
        className="hidden md:flex absolute right-0 top-[calc(50%+14px)] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
        aria-label="Rolar para a direita"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
