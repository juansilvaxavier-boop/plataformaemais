import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, Input, Label, Select, Badge } from "@/components/ui";
import {
  createModule,
  deleteModule,
  createLesson,
  deleteLesson,
  createMaterial,
  deleteMaterial,
  deleteQuiz,
} from "../actions";
import {
  PublishToggle,
  TargetRolesForm,
  TargetDepartmentsForm,
  TranscriptEditor,
  AIQuizButton,
  ManualQuizForm,
  CompetencyForm,
  ManualAssignForm,
} from "./client-widgets";
import { UploadOrUrlField } from "@/components/upload-field";
import { Trash2 } from "lucide-react";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertRole(session?.user?.role, "INSTRUCTOR");

  const [course, departments, skills, enrolledUserIds] = await Promise.all([
    prisma.course.findUniqueOrThrow({
      where: { id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: { materials: true },
            },
            quizzes: { include: { questions: { include: { options: true } } } },
          },
        },
        targetRoles: true,
        targetDepartments: true,
        competencies: true,
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.competencySkill.findMany({ orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({ where: { courseId: id }, select: { userId: true } }),
  ]);

  const enrolledIdSet = new Set(enrolledUserIds.map((e) => e.userId));
  const assignCandidates = await prisma.user.findMany({
    where: { active: true, id: { notIn: [...enrolledIdSet] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div>
      <PageHeader
        title={course.title}
        description={course.category}
        action={<PublishToggle courseId={course.id} published={course.published} />}
      />

      <Card className="mb-6">
        <p className="text-sm text-slate-600 mb-4">{course.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Atribuição automática por papel (RBAC)</Label>
            <TargetRolesForm courseId={course.id} selected={course.targetRoles.map((r) => r.role)} />
          </div>
          <div>
            <Label>Atribuição automática por departamento</Label>
            <TargetDepartmentsForm
              courseId={course.id}
              departments={departments}
              selected={course.targetDepartments.map((d) => d.departmentId)}
            />
          </div>
        </div>
        {course.recertificationPeriodMonths && (
          <p className="text-xs text-slate-400 mt-4">
            Recertificação automática a cada {course.recertificationPeriodMonths} meses.
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100">
          <Label>Competências desenvolvidas neste curso</Label>
          <CompetencyForm
            courseId={course.id}
            skills={skills}
            initial={course.competencies.map((c) => ({ skillId: c.competencySkillId, level: c.levelGranted }))}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <Label>Atribuir manualmente a um colaborador específico</Label>
          <ManualAssignForm courseId={course.id} candidates={assignCandidates} />
        </div>
      </Card>

      <div className="space-y-6">
        {course.modules.map((mod) => (
          <Card key={mod.id}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{mod.title}</h3>
              <form
                action={async () => {
                  "use server";
                  await deleteModule(course.id, mod.id);
                }}
              >
                <button className="text-slate-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </form>
            </div>

            <div className="space-y-3">
              {mod.lessons.map((lesson) => (
                <div key={lesson.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800">{lesson.title}</span>{" "}
                      <Badge tone="info">{lesson.type}</Badge>
                      {lesson.videoDurationSeconds && (
                        <span className="text-xs text-slate-400 ml-2">
                          {Math.round(lesson.videoDurationSeconds / 60)} min
                        </span>
                      )}
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        await deleteLesson(course.id, lesson.id);
                      }}
                    >
                      <button className="text-slate-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>

                  <TranscriptEditor
                    courseId={course.id}
                    lessonId={lesson.id}
                    initialTranscript={lesson.transcript ?? ""}
                    initialSummary={lesson.summary ?? ""}
                  />

                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">Materiais de apoio</p>
                    <ul className="text-xs text-slate-600 space-y-1 mb-2">
                      {lesson.materials.map((m) => (
                        <li key={m.id} className="flex items-center justify-between">
                          <a href={m.url} target="_blank" download={m.name} className="text-indigo-600 hover:underline">
                            {m.name} ({m.type})
                          </a>
                          <form
                            action={async () => {
                              "use server";
                              await deleteMaterial(course.id, m.id);
                            }}
                          >
                            <button className="text-slate-400 hover:text-red-600">
                              <Trash2 size={12} />
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                    <details>
                      <summary className="text-xs text-indigo-600 cursor-pointer">
                        + Adicionar material
                      </summary>
                      <form action={createMaterial} className="grid grid-cols-2 gap-2 mt-2">
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="lessonId" value={lesson.id} />
                        <Input name="name" placeholder="Nome do arquivo" required />
                        <UploadOrUrlField name="url" placeholder="URL do arquivo" />
                        <Select name="type" defaultValue="PDF">
                          <option value="PDF">PDF</option>
                          <option value="SPREADSHEET">Planilha</option>
                          <option value="SLIDE">Apresentação</option>
                          <option value="OTHER">Outro</option>
                        </Select>
                        <Button type="submit" size="sm">
                          Adicionar
                        </Button>
                        <textarea
                          name="extractedText"
                          placeholder="Cole aqui o texto extraído do PDF (opcional, para IA)"
                          className="col-span-2 text-xs rounded border border-slate-300 px-2 py-1"
                          rows={2}
                        />
                      </form>
                    </details>
                  </div>
                </div>
              ))}

              <details>
                <summary className="text-sm text-indigo-600 cursor-pointer">+ Adicionar aula</summary>
                <form action={createLesson} className="grid grid-cols-2 gap-2 mt-2">
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="moduleId" value={mod.id} />
                  <Input name="title" placeholder="Título da aula" required />
                  <Select name="type" defaultValue="VIDEO">
                    <option value="VIDEO">Vídeo</option>
                    <option value="PDF">PDF</option>
                    <option value="PRESENTATION">Apresentação</option>
                  </Select>
                  <UploadOrUrlField name="videoUrl" placeholder="Link do YouTube (não listado) ou envie um arquivo de vídeo" />
                  <Input name="videoDurationSeconds" type="number" placeholder="Duração (segundos)" />
                  <textarea
                    name="transcript"
                    placeholder="Transcrição (opcional, alimenta IA)"
                    className="col-span-2 text-xs rounded border border-slate-300 px-2 py-1"
                    rows={2}
                  />
                  <Button type="submit" size="sm" className="col-span-2">
                    Adicionar aula
                  </Button>
                </form>
              </details>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Avaliação do módulo (nota de corte)
              </p>
              {mod.quizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-2 mb-2">
                  <span>
                    {quiz.title} — {quiz.questions.length} pergunta(s), nota mínima {quiz.passingScore}%
                    {quiz.aiGenerated && <Badge tone="info" className="ml-2">IA</Badge>}
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await deleteQuiz(course.id, quiz.id);
                    }}
                  >
                    <button className="text-slate-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <ManualQuizForm courseId={course.id} moduleId={mod.id} />
                {mod.lessons[0] && (
                  <AIQuizButton courseId={course.id} moduleId={mod.id} lessonId={mod.lessons[0].id} />
                )}
              </div>
            </div>
          </Card>
        ))}

        <Card>
          <form action={createModule} className="flex items-end gap-3">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="flex-1">
              <Label>Novo módulo</Label>
              <Input name="title" placeholder="Ex.: Introdução" required />
            </div>
            <Button type="submit">Adicionar módulo</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
