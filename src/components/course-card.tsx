"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Plus } from "lucide-react";
import { enrollInCourse } from "@/app/(app)/cursos/actions";

// Paleta de gradientes de capa (fallback quando o curso não tem coverUrl),
// escolhida deterministicamente a partir do id para variar visualmente as
// fileiras, como em uma vitrine de streaming.
const GRADIENTS = [
  "from-[#0b6350] to-[#0a2f26]",
  "from-[#0f9974] to-[#0a4e3f]",
  "from-[#1ab48a] to-[#0c5040]",
  "from-[#125c4a] to-[#04120e]",
  "from-[#0c7d60] to-[#052018]",
];

function gradientFor(id: string): string {
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[sum % GRADIENTS.length];
}

export type CatalogCourse = {
  id: string;
  title: string;
  category: string;
  coverUrl: string | null;
};

export function CourseCard({
  course,
  enrolled,
  percent,
  size = "md",
}: {
  course: CatalogCourse;
  enrolled: boolean;
  percent?: number;
  size?: "md" | "lg";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const width = size === "lg" ? "w-72" : "w-60";

  function handleClick(e: React.MouseEvent) {
    if (enrolled) return; // deixa o <Link> navegar normalmente
    e.preventDefault();
    startTransition(async () => {
      await enrollInCourse(course.id);
      router.push(`/cursos/${course.id}`);
    });
  }

  const inner = (
    <div
      className={`group relative shrink-0 ${width} aspect-video rounded-lg overflow-hidden shadow-sm cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl hover:z-10`}
    >
      {course.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- capas são URLs arbitrárias definidas pelo instrutor
        <img src={course.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFor(course.id)}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-3">
        <span className="text-[10px] uppercase tracking-wide text-white/70 mb-1">{course.category}</span>
        <span className="text-sm font-semibold text-white leading-tight line-clamp-2">{course.title}</span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
        <span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center text-slate-900">
          {enrolled ? <Play size={18} fill="currentColor" /> : <Plus size={20} />}
        </span>
      </div>

      {typeof percent === "number" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );

  if (enrolled) {
    return (
      <Link href={`/cursos/${course.id}`} aria-disabled={isPending}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-left">
      {inner}
    </button>
  );
}
