"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { setPathTargetRoles, setPathTargetDepartments, addCourseToPath, removeCourseFromPath } from "./actions";
import { Button, Select } from "@/components/ui";

const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: "Colaborador",
  INSTRUCTOR: "Instrutor",
  MANAGER: "Gestor",
  ADMIN: "Administrador",
};

export function PathRolesForm({ pathId, selected }: { pathId: string; selected: Role[] }) {
  const [values, setValues] = useState(selected);
  const [, startTransition] = useTransition();

  function toggle(role: Role) {
    const next = values.includes(role) ? values.filter((r) => r !== role) : [...values, role];
    setValues(next);
    startTransition(() => setPathTargetRoles(pathId, next));
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => toggle(role)}
          className={`text-[11px] px-2 py-1 rounded-full border ${
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

export function PathDepartmentsForm({
  pathId,
  departments,
  selected,
}: {
  pathId: string;
  departments: { id: string; name: string }[];
  selected: string[];
}) {
  const [values, setValues] = useState(selected);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    const next = values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
    setValues(next);
    startTransition(() => setPathTargetDepartments(pathId, next));
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {departments.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => toggle(d.id)}
          className={`text-[11px] px-2 py-1 rounded-full border ${
            values.includes(d.id)
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-600 border-slate-300"
          }`}
        >
          {d.name}
        </button>
      ))}
    </div>
  );
}

export function AddCourseToPath({
  pathId,
  courses,
}: {
  pathId: string;
  courses: { id: string; title: string }[];
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  if (courses.length === 0) return null;

  return (
    <div className="flex gap-2">
      <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => addCourseToPath(pathId, courseId))}
      >
        Adicionar
      </Button>
    </div>
  );
}

export function RemoveCourseButton({ pathId, courseId }: { pathId: string; courseId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => removeCourseFromPath(pathId, courseId))}
      className="text-xs text-red-500 hover:underline"
    >
      remover
    </button>
  );
}
