import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

/**
 * Indexação simplificada para o seed (sem embeddings, já que normalmente não há
 * OPENAI_API_KEY configurada em ambiente local). Reflete o mesmo chunking usado
 * por `indexLessonTranscript` em src/lib/ai/rag.ts para o modo offline.
 */
async function indexTranscriptChunks(lessonId: string, transcript: string) {
  const clean = transcript.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  for (let i = 0; i < chunks.length; i++) {
    await prisma.documentChunk.create({ data: { lessonId, content: chunks[i], chunkIndex: i } });
  }
}

const SAMPLE_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4";

const LGPD_TRANSCRIPT = `Bem-vindos ao treinamento de Segurança da Informação e LGPD. Nesta aula vamos entender os princípios fundamentais da Lei Geral de Proteção de Dados. A LGPD estabelece regras claras sobre coleta, armazenamento e tratamento de dados pessoais. Todo colaborador deve tratar dados de clientes e parceiros com o máximo de cuidado. É proibido compartilhar informações pessoais sem consentimento explícito do titular. Em caso de vazamento de dados, é obrigatório notificar a Autoridade Nacional de Proteção de Dados em até 72 horas. Utilizamos criptografia em trânsito e em repouso para proteger todas as informações sensíveis. Senhas nunca devem ser compartilhadas entre colaboradores. Sempre utilize autenticação de dois fatores quando disponível. Ao final deste módulo, você deverá ser capaz de identificar riscos de segurança no dia a dia.`;

const ATENDIMENTO_TRANSCRIPT = `Bem-vindos ao treinamento de Atendimento ao Cliente. O primeiro princípio do bom atendimento é a escuta ativa. Sempre repita o problema do cliente com suas próprias palavras para confirmar entendimento. Mantenha um tom de voz calmo mesmo em situações de reclamação. Nunca prometa prazos que a empresa não pode cumprir. Utilize o CRM para registrar todas as interações com o cliente. Um cliente satisfeito é a melhor propaganda que a empresa pode ter. Sempre agradeça o feedback, mesmo quando for uma crítica. Encaminhe casos complexos para o time de especialistas quando necessário.`;

async function main() {
  console.log("Seeding: departamentos...");
  const [deptRH, deptTech, deptVendas] = await Promise.all([
    prisma.department.upsert({ where: { name: "Recursos Humanos" }, update: {}, create: { name: "Recursos Humanos" } }),
    prisma.department.upsert({ where: { name: "Tecnologia" }, update: {}, create: { name: "Tecnologia" } }),
    prisma.department.upsert({ where: { name: "Vendas" }, update: {}, create: { name: "Vendas" } }),
    prisma.department.upsert({ where: { name: "Operações" }, update: {}, create: { name: "Operações" } }),
  ]);

  console.log("Seeding: usuários...");
  const passwordHash = await bcrypt.hash("senha123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@plataforma.com" },
    update: {},
    create: {
      name: "Ana Administradora",
      email: "admin@plataforma.com",
      passwordHash,
      role: "ADMIN",
      jobTitle: "Head de RH",
      departmentId: deptRH.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "gestor@plataforma.com" },
    update: {},
    create: {
      name: "Marcos Gestor",
      email: "gestor@plataforma.com",
      passwordHash,
      role: "MANAGER",
      jobTitle: "Gerente de Tecnologia",
      departmentId: deptTech.id,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instrutor@plataforma.com" },
    update: {},
    create: {
      name: "Isabela Instrutora",
      email: "instrutor@plataforma.com",
      passwordHash,
      role: "INSTRUCTOR",
      jobTitle: "Especialista de Treinamento",
      departmentId: deptTech.id,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: "colaborador1@plataforma.com" },
    update: {},
    create: {
      name: "Carlos Colaborador",
      email: "colaborador1@plataforma.com",
      passwordHash,
      role: "EMPLOYEE",
      jobTitle: "Desenvolvedor",
      departmentId: deptTech.id,
      managerId: manager.id,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "colaborador2@plataforma.com" },
    update: {},
    create: {
      name: "Beatriz Vendedora",
      email: "colaborador2@plataforma.com",
      passwordHash,
      role: "EMPLOYEE",
      jobTitle: "Consultora de Vendas",
      departmentId: deptVendas.id,
    },
  });

  console.log("Seeding: competências...");
  const skillSeguranca = await prisma.competencySkill.upsert({
    where: { name: "Segurança da Informação" },
    update: {},
    create: { name: "Segurança da Informação", category: "Compliance" },
  });
  const skillAtendimento = await prisma.competencySkill.upsert({
    where: { name: "Atendimento ao Cliente" },
    update: {},
    create: { name: "Atendimento ao Cliente", category: "Vendas" },
  });

  console.log("Seeding: badges...");
  await prisma.badge.upsert({
    where: { name: "Primeiro Passo" },
    update: {},
    create: {
      name: "Primeiro Passo",
      description: "Concluiu o primeiro curso na plataforma.",
      icon: "award",
      criteria: { type: "COURSE_COMPLETIONS", count: 1 },
    },
  });
  await prisma.badge.upsert({
    where: { name: "Maratonista do Conhecimento" },
    update: {},
    create: {
      name: "Maratonista do Conhecimento",
      description: "Concluiu 5 cursos na plataforma.",
      icon: "award",
      criteria: { type: "COURSE_COMPLETIONS", count: 5 },
    },
  });
  await prisma.badge.upsert({
    where: { name: "Sequência de Ouro" },
    update: {},
    create: {
      name: "Sequência de Ouro",
      description: "Manteve 7 dias seguidos de estudo.",
      icon: "flame",
      criteria: { type: "STREAK", days: 7 },
    },
  });
  await prisma.badge.upsert({
    where: { name: "Nota Máxima" },
    update: {},
    create: {
      name: "Nota Máxima",
      description: "Gabaritou uma avaliação.",
      icon: "star",
      criteria: { type: "QUIZ_PERFECT", count: 1 },
    },
  });

  console.log("Seeding: curso de Segurança da Informação e LGPD...");
  const existingLgpdCourse = await prisma.course.findFirst({ where: { title: "Segurança da Informação e LGPD" } });
  const lgpdCourse =
    existingLgpdCourse ??
    (await prisma.course.create({
      data: {
        title: "Segurança da Informação e LGPD",
        description: "Treinamento obrigatório de compliance sobre proteção de dados pessoais e segurança da informação.",
        category: "Compliance",
        published: true,
        recertificationPeriodMonths: 12,
        createdById: instructor.id,
        targetRoles: {
          create: [{ role: "EMPLOYEE" }, { role: "MANAGER" }, { role: "INSTRUCTOR" }, { role: "ADMIN" }],
        },
        competencies: { create: [{ competencySkillId: skillSeguranca.id, levelGranted: 3 }] },
      },
    }));

  let lgpdModule = await prisma.module.findFirst({ where: { courseId: lgpdCourse.id } });
  if (!lgpdModule) {
    lgpdModule = await prisma.module.create({ data: { courseId: lgpdCourse.id, title: "Fundamentos da LGPD", order: 0 } });
  }

  let lgpdLesson = await prisma.lesson.findFirst({ where: { moduleId: lgpdModule.id } });
  if (!lgpdLesson) {
    lgpdLesson = await prisma.lesson.create({
      data: {
        moduleId: lgpdModule.id,
        title: "Introdução à LGPD e boas práticas",
        order: 0,
        type: "VIDEO",
        videoUrl: SAMPLE_VIDEO_URL,
        videoDurationSeconds: 60,
        transcript: LGPD_TRANSCRIPT,
      },
    });
    await indexTranscriptChunks(lgpdLesson.id, LGPD_TRANSCRIPT);
    await prisma.lessonMaterial.create({
      data: {
        lessonId: lgpdLesson.id,
        name: "Cartilha de Boas Práticas LGPD",
        url: "https://www.gov.br/anpd/pt-br",
        type: "PDF",
      },
    });
  }

  const existingLgpdQuiz = await prisma.quiz.findFirst({ where: { moduleId: lgpdModule.id } });
  if (!existingLgpdQuiz) {
    await prisma.quiz.create({
      data: {
        moduleId: lgpdModule.id,
        title: "Avaliação: Fundamentos da LGPD",
        passingScore: 70,
        questions: {
          create: [
            {
              text: "Em caso de vazamento de dados, em quanto tempo a ANPD deve ser notificada?",
              order: 0,
              options: {
                create: [
                  { text: "72 horas", isCorrect: true },
                  { text: "30 dias", isCorrect: false },
                  { text: "Não é necessário notificar", isCorrect: false },
                ],
              },
            },
            {
              text: "É permitido compartilhar dados pessoais de clientes sem consentimento?",
              order: 1,
              options: {
                create: [
                  { text: "Sim, sempre", isCorrect: false },
                  { text: "Não, exceto hipóteses legais específicas", isCorrect: true },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log("Seeding: curso de Atendimento ao Cliente...");
  const existingSalesCourse = await prisma.course.findFirst({ where: { title: "Atendimento ao Cliente de Excelência" } });
  const salesCourse =
    existingSalesCourse ??
    (await prisma.course.create({
      data: {
        title: "Atendimento ao Cliente de Excelência",
        description: "Boas práticas de atendimento, escuta ativa e gestão de reclamações para o time comercial.",
        category: "Vendas",
        published: true,
        createdById: instructor.id,
        targetDepartments: { create: [{ departmentId: deptVendas.id }] },
        competencies: { create: [{ competencySkillId: skillAtendimento.id, levelGranted: 3 }] },
      },
    }));

  let salesModule = await prisma.module.findFirst({ where: { courseId: salesCourse.id } });
  if (!salesModule) {
    salesModule = await prisma.module.create({ data: { courseId: salesCourse.id, title: "Fundamentos do Atendimento", order: 0 } });
  }

  const existingSalesLesson = await prisma.lesson.findFirst({ where: { moduleId: salesModule.id } });
  if (!existingSalesLesson) {
    const salesLesson = await prisma.lesson.create({
      data: {
        moduleId: salesModule.id,
        title: "Escuta ativa e gestão de reclamações",
        order: 0,
        type: "VIDEO",
        videoUrl: SAMPLE_VIDEO_URL,
        videoDurationSeconds: 60,
        transcript: ATENDIMENTO_TRANSCRIPT,
      },
    });
    await indexTranscriptChunks(salesLesson.id, ATENDIMENTO_TRANSCRIPT);
  }

  console.log("Seeding: trilha de Onboarding...");
  const existingPath = await prisma.learningPath.findFirst({ where: { title: "Onboarding Corporativo" } });
  const onboardingPath =
    existingPath ??
    (await prisma.learningPath.create({
      data: {
        title: "Onboarding Corporativo",
        description: "Formação inicial obrigatória para todo novo colaborador da empresa.",
        isOnboarding: true,
        targetRoles: { create: [{ role: "EMPLOYEE" }] },
        courses: { create: [{ courseId: lgpdCourse.id, order: 0 }] },
      },
    }));

  console.log("Seeding: matrículas automáticas...");
  for (const user of [manager, instructor, employee1, employee2, admin]) {
    const courses = await prisma.course.findMany({
      where: {
        published: true,
        OR: [
          { targetRoles: { some: { role: user.role } } },
          user.departmentId ? { targetDepartments: { some: { departmentId: user.departmentId } } } : {},
        ],
      },
    });
    for (const course of courses) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        update: {},
        create: { userId: user.id, courseId: course.id, assignedReason: "ROLE" },
      });
    }

    if (user.role === "EMPLOYEE") {
      await prisma.enrollment.upsert({
        where: { userId_learningPathId: { userId: user.id, learningPathId: onboardingPath.id } },
        update: {},
        create: { userId: user.id, learningPathId: onboardingPath.id, assignedReason: "ONBOARDING" },
      });
    }
  }

  console.log("Seed concluído.");
  console.log("\nContas de acesso (senha para todas: senha123):");
  console.log("  admin@plataforma.com        (ADMIN)");
  console.log("  gestor@plataforma.com       (MANAGER)");
  console.log("  instrutor@plataforma.com    (INSTRUCTOR)");
  console.log("  colaborador1@plataforma.com (EMPLOYEE - Tecnologia)");
  console.log("  colaborador2@plataforma.com (EMPLOYEE - Vendas)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
