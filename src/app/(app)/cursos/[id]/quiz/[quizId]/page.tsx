import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { QuizForm } from "./quiz-form";
import { ArrowLeft } from "lucide-react";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id: courseId, quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" }, include: { options: true } } },
  });
  if (!quiz) notFound();

  return (
    <div>
      <Link href={`/cursos/${courseId}`} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Voltar ao curso
      </Link>
      <PageHeader title={quiz.title} description={`Nota mínima para aprovação: ${quiz.passingScore}%`} />
      <Card>
        <QuizForm
          quizId={quiz.id}
          questions={quiz.questions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            options: q.options.map((o) => ({ id: o.id, text: o.text })),
          }))}
        />
      </Card>
    </div>
  );
}
