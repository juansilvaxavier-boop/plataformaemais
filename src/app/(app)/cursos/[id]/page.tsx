import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, ProgressBar, Button } from "@/components/ui";
import { getCourseProgressPercent } from "@/lib/enrollment";
import { CheckCircle2, Lock, PlayCircle, FileQuestion, Award } from "lucide-react";
import { FeedbackForm } from "./feedback-form";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
          quizzes: { include: { questions: true } },
        },
      },
    },
  });
  if (!course) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: id } },
  });

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progressRecords = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: allLessonIds } },
  });
  const progressByLesson = new Map(progressRecords.map((p) => [p.lessonId, p]));

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId: { in: course.modules.flatMap((m) => m.quizzes.map((q) => q.id)) } },
    orderBy: { attemptedAt: "desc" },
  });
  const bestAttemptByQuiz = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    if (!bestAttemptByQuiz.has(a.quizId) || a.passed) bestAttemptByQuiz.set(a.quizId, a);
  }

  const percent = await getCourseProgressPercent(userId, id);
  const certificate = await prisma.certificate.findFirst({ where: { userId, courseId: id } });
  const existingFeedback = await prisma.courseFeedback.findUnique({
    where: { userId_courseId: { userId, courseId: id } },
  });

  return (
    <div>
      <PageHeader
        title={course.title}
        description={course.description}
        action={
          certificate && (
            <a href={`/api/certificates/${certificate.id}/pdf`} target="_blank">
              <Button>
                <Award size={16} /> Baixar certificado
              </Button>
            </a>
          )
        }
      />

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Progresso geral</span>
          <span className="text-sm text-slate-500">{percent}%</span>
        </div>
        <ProgressBar percent={percent} />
      </Card>

      <div className="space-y-4">
        {course.modules.map((mod, mIdx) => {
          const previousModule = course.modules[mIdx - 1];
          const previousModuleComplete =
            !previousModule ||
            (previousModule.lessons.every((l) => progressByLesson.get(l.id)?.completed) &&
              previousModule.quizzes.every((q) => bestAttemptByQuiz.get(q.id)?.passed));

          return (
            <Card key={mod.id}>
              <h3 className="font-semibold text-slate-800 mb-3">{mod.title}</h3>
              <ul className="space-y-2">
                {mod.lessons.map((lesson) => {
                  const progress = progressByLesson.get(lesson.id);
                  const locked = !previousModuleComplete;
                  return (
                    <li key={lesson.id}>
                      {locked ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-1.5">
                          <Lock size={16} /> {lesson.title}
                        </div>
                      ) : (
                        <Link
                          href={`/cursos/${id}/aulas/${lesson.id}`}
                          className="flex items-center gap-2 text-sm py-1.5 hover:text-indigo-600"
                        >
                          {progress?.completed ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : (
                            <PlayCircle size={16} className="text-slate-400" />
                          )}
                          {lesson.title}
                          {progress && !progress.completed && progress.percent > 0 && (
                            <span className="text-xs text-slate-400">({Math.round(progress.percent)}%)</span>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
                {mod.quizzes.map((quiz) => {
                  const attempt = bestAttemptByQuiz.get(quiz.id);
                  const locked =
                    !previousModuleComplete || !mod.lessons.every((l) => progressByLesson.get(l.id)?.completed);
                  return (
                    <li key={quiz.id}>
                      {locked ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-1.5">
                          <Lock size={16} /> {quiz.title} (nota de corte {quiz.passingScore}%)
                        </div>
                      ) : (
                        <Link
                          href={`/cursos/${id}/quiz/${quiz.id}`}
                          className="flex items-center gap-2 text-sm py-1.5 hover:text-indigo-600"
                        >
                          {attempt?.passed ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : (
                            <FileQuestion size={16} className="text-slate-400" />
                          )}
                          {quiz.title}
                          {attempt && (
                            <Badge tone={attempt.passed ? "success" : "danger"}>{attempt.score}%</Badge>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      {enrollment?.status === "COMPLETED" && (
        <Card className="mt-6">
          <h3 className="font-semibold text-slate-800 mb-2">Como foi sua experiência?</h3>
          <FeedbackForm courseId={id} existing={existingFeedback} />
        </Card>
      )}
    </div>
  );
}
