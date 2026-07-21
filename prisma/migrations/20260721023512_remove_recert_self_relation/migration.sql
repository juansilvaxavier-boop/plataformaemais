/*
  Warnings:

  - You are about to drop the column `recertificationOfId` on the `enrollments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_recertificationOfId_fkey";

-- AlterTable
ALTER TABLE "enrollments" DROP COLUMN "recertificationOfId";
