-- Views de relatório dedicadas para integração direta com Power BI.
--
-- O conector nativo do Power BI para PostgreSQL enxerga estas views como
-- tabelas comuns no navegador de dados (Get Data > PostgreSQL database),
-- já achatadas/desnormalizadas para consumo direto em Import ou DirectQuery,
-- sem etapa manual de exportação em CSV.
--
-- Não são declaradas como "view" no schema.prisma (recurso ainda em preview)
-- para manter o Prisma Client simples; são consultadas via SQL bruto pelas
-- rotas /api/powerbi/* e diretamente pelo Power BI via conexão PostgreSQL.

CREATE VIEW "vw_bi_enrollments" AS
SELECT
  e."id" AS enrollment_id,
  u."id" AS user_id,
  u."name" AS user_name,
  u."email" AS user_email,
  u."role" AS user_role,
  d."name" AS department_name,
  CASE WHEN e."courseId" IS NOT NULL THEN 'CURSO' ELSE 'TRILHA' END AS item_type,
  COALESCE(c."title", lp."title") AS item_title,
  c."category" AS category,
  e."status" AS status,
  e."assignedReason" AS assigned_reason,
  e."dueDate" AS due_date,
  e."startedAt" AS started_at,
  e."completedAt" AS completed_at,
  e."createdAt" AS created_at
FROM "enrollments" e
JOIN "users" u ON u."id" = e."userId"
LEFT JOIN "departments" d ON d."id" = u."departmentId"
LEFT JOIN "courses" c ON c."id" = e."courseId"
LEFT JOIN "learning_paths" lp ON lp."id" = e."learningPathId";

CREATE VIEW "vw_bi_certificates" AS
SELECT
  cert."id" AS certificate_id,
  u."id" AS user_id,
  u."name" AS user_name,
  u."email" AS user_email,
  d."name" AS department_name,
  CASE WHEN cert."courseId" IS NOT NULL THEN 'CURSO' ELSE 'TRILHA' END AS item_type,
  COALESCE(c."title", lp."title") AS item_title,
  cert."verificationCode" AS verification_code,
  cert."issuedAt" AS issued_at,
  cert."expiresAt" AS expires_at
FROM "certificates" cert
JOIN "users" u ON u."id" = cert."userId"
LEFT JOIN "departments" d ON d."id" = u."departmentId"
LEFT JOIN "courses" c ON c."id" = cert."courseId"
LEFT JOIN "learning_paths" lp ON lp."id" = cert."learningPathId";

CREATE VIEW "vw_bi_quiz_attempts" AS
SELECT
  qa."id" AS attempt_id,
  u."id" AS user_id,
  u."name" AS user_name,
  d."name" AS department_name,
  q."title" AS quiz_title,
  c."title" AS course_title,
  qa."score" AS score,
  qa."passed" AS passed,
  qa."attemptedAt" AS attempted_at
FROM "quiz_attempts" qa
JOIN "users" u ON u."id" = qa."userId"
LEFT JOIN "departments" d ON d."id" = u."departmentId"
JOIN "quizzes" q ON q."id" = qa."quizId"
LEFT JOIN "modules" m ON m."id" = q."moduleId"
LEFT JOIN "courses" c ON c."id" = m."courseId";

CREATE VIEW "vw_bi_competency_matrix" AS
SELECT
  uc."id" AS record_id,
  u."id" AS user_id,
  u."name" AS user_name,
  d."name" AS department_name,
  cs."name" AS competency_name,
  cs."category" AS competency_category,
  uc."level" AS level,
  uc."updatedAt" AS updated_at
FROM "user_competencies" uc
JOIN "users" u ON u."id" = uc."userId"
LEFT JOIN "departments" d ON d."id" = u."departmentId"
JOIN "competency_skills" cs ON cs."id" = uc."competencySkillId";

CREATE VIEW "vw_bi_external_trainings" AS
SELECT
  p."id" AS participant_id,
  u."id" AS user_id,
  u."name" AS user_name,
  d."name" AS department_name,
  t."title" AS training_title,
  t."type" AS training_type,
  t."category" AS category,
  t."provider" AS provider,
  t."location" AS location,
  t."startDate" AS start_date,
  t."endDate" AS end_date,
  t."durationHours" AS duration_hours,
  p."attended" AS attended,
  p."completionDate" AS completion_date
FROM "external_training_participants" p
JOIN "users" u ON u."id" = p."userId"
LEFT JOIN "departments" d ON d."id" = u."departmentId"
JOIN "external_trainings" t ON t."id" = p."externalTrainingId";

CREATE VIEW "vw_bi_course_feedback" AS
SELECT
  f."id" AS feedback_id,
  u."id" AS user_id,
  u."name" AS user_name,
  d."name" AS department_name,
  c."title" AS course_title,
  c."category" AS category,
  f."rating" AS rating,
  f."comment" AS comment,
  f."createdAt" AS created_at
FROM "course_feedback" f
JOIN "users" u ON u."id" = f."userId"
LEFT JOIN "departments" d ON d."id" = u."departmentId"
JOIN "courses" c ON c."id" = f."courseId";
