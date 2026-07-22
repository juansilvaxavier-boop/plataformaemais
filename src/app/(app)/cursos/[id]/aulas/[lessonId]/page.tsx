import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { VideoPlayer } from "./video-player";
import { NotesPanel } from "./notes-panel";
import { ChatPanel } from "./chat-panel";
import { ArrowLeft, FileText } from "lucide-react";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { materials: true, module: { include: { course: true } } },
  });
  if (!lesson || lesson.module.courseId !== courseId) notFound();

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  return (
    <div>
      <Link href={`/cursos/${courseId}`} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Voltar para {lesson.module.course.title}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">{lesson.title}</h1>

          {lesson.videoUrl ? (
            <VideoPlayer
              lessonId={lesson.id}
              videoUrl={lesson.videoUrl}
              hasCaptions={Boolean(lesson.captionSegments)}
              initialMaxWatched={progress?.maxWatchedSeconds ?? 0}
              initialCompleted={progress?.completed ?? false}
            />
          ) : (
            <Card>
              <p className="text-sm text-slate-500">Esta aula não possui vídeo associado.</p>
            </Card>
          )}

          {lesson.summary && (
            <Card>
              <h3 className="font-semibold text-slate-800 mb-2 text-sm">Resumo executivo (IA)</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{lesson.summary}</p>
            </Card>
          )}

          {lesson.materials.length > 0 && (
            <Card>
              <h3 className="font-semibold text-slate-800 mb-2 text-sm">Materiais de apoio</h3>
              <ul className="space-y-1">
                {lesson.materials.map((m) => (
                  <li key={m.id}>
                    <a
                      href={m.url}
                      target="_blank"
                      download={m.name}
                      className="text-sm text-indigo-600 hover:underline flex items-center gap-2"
                    >
                      <FileText size={14} /> {m.name}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <NotesPanel lessonId={lesson.id} />
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <ChatPanel courseId={courseId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
