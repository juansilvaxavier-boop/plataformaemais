"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CourseCard, type CatalogCourse } from "@/components/course-card";
import { CourseRow } from "@/components/course-row";
import { EmptyState } from "@/components/ui";

export type BrowsableCourse = CatalogCourse & {
  description: string;
  enrolled: boolean;
  inProgress: boolean;
  percent?: number;
};

export function CourseBrowser({ items }: { items: BrowsableCourse[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  const continueWatching = filtered.filter((c) => c.inProgress);

  const rowsByCategory = new Map<string, BrowsableCourse[]>();
  for (const c of filtered) {
    const list = rowsByCategory.get(c.category) ?? [];
    list.push(c);
    rowsByCategory.set(c.category, list);
  }

  return (
    <div>
      <div className="relative mb-8 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cursos por título, categoria ou descrição..."
          className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum curso encontrado" description="Tente outro termo de busca." />
      ) : (
        <>
          {continueWatching.length > 0 && (
            <CourseRow title="Continuar assistindo">
              {continueWatching.map((c) => (
                <CourseCard key={c.id} course={c} enrolled percent={c.percent} />
              ))}
            </CourseRow>
          )}

          {[...rowsByCategory.entries()].map(([category, list]) => (
            <CourseRow key={category} title={category}>
              {list.map((c) => (
                <CourseCard key={c.id} course={c} enrolled={c.enrolled} percent={c.percent} />
              ))}
            </CourseRow>
          ))}
        </>
      )}
    </div>
  );
}
