"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { enrollInCourse } from "./actions";

export function EnrollButton({ courseId }: { courseId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await enrollInCourse(courseId);
          router.push(`/cursos/${courseId}`);
        })
      }
    >
      Iniciar curso
    </Button>
  );
}
