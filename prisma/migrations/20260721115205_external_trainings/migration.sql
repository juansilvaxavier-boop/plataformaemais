-- CreateEnum
CREATE TYPE "ExternalTrainingType" AS ENUM ('PRESENCIAL', 'WORKSHOP', 'CONFERENCIA', 'EXTERNO', 'OUTRO');

-- CreateEnum
CREATE TYPE "ExternalTrainingStatus" AS ENUM ('AGENDADO', 'REALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "external_trainings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ExternalTrainingType" NOT NULL DEFAULT 'PRESENCIAL',
    "status" "ExternalTrainingStatus" NOT NULL DEFAULT 'AGENDADO',
    "provider" TEXT,
    "location" TEXT,
    "category" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "durationHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "external_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_training_participants" (
    "id" TEXT NOT NULL,
    "externalTrainingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "completionDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_training_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_training_competencies" (
    "id" TEXT NOT NULL,
    "externalTrainingId" TEXT NOT NULL,
    "competencySkillId" TEXT NOT NULL,
    "levelGranted" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "external_training_competencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_trainings_category_idx" ON "external_trainings"("category");

-- CreateIndex
CREATE INDEX "external_trainings_startDate_idx" ON "external_trainings"("startDate");

-- CreateIndex
CREATE INDEX "external_training_participants_userId_idx" ON "external_training_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "external_training_participants_externalTrainingId_userId_key" ON "external_training_participants"("externalTrainingId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "external_training_competencies_externalTrainingId_competenc_key" ON "external_training_competencies"("externalTrainingId", "competencySkillId");

-- AddForeignKey
ALTER TABLE "external_trainings" ADD CONSTRAINT "external_trainings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_training_participants" ADD CONSTRAINT "external_training_participants_externalTrainingId_fkey" FOREIGN KEY ("externalTrainingId") REFERENCES "external_trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_training_participants" ADD CONSTRAINT "external_training_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_training_competencies" ADD CONSTRAINT "external_training_competencies_externalTrainingId_fkey" FOREIGN KEY ("externalTrainingId") REFERENCES "external_trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_training_competencies" ADD CONSTRAINT "external_training_competencies_competencySkillId_fkey" FOREIGN KEY ("competencySkillId") REFERENCES "competency_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
