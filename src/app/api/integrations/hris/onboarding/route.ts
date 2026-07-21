import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { autoAssignForRole } from "@/lib/enrollment";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

/**
 * Webhook de entrada para integração com o sistema de RH (HRIS): quando um novo
 * colaborador é contratado, o HRIS chama este endpoint para provisionar a conta
 * automaticamente e matriculá-lo nas trilhas de onboarding e treinamentos
 * obrigatórios do seu cargo/departamento.
 *
 * Autenticação: header "x-api-key" com o valor de HRIS_WEBHOOK_API_KEY.
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.HRIS_WEBHOOK_API_KEY) {
    return NextResponse.json({ error: "Chave de API inválida." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const jobTitle = String(body?.jobTitle ?? "").trim() || null;
  const departmentName = String(body?.departmentName ?? "").trim() || null;

  if (!name || !email) {
    return NextResponse.json({ error: "name e email são obrigatórios." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Usuário já existe.", userId: existing.id }, { status: 409 });
  }

  let departmentId: string | null = null;
  if (departmentName) {
    const dept = await prisma.department.upsert({
      where: { name: departmentName },
      update: {},
      create: { name: departmentName },
    });
    departmentId = dept.id;
  }

  const temporaryPassword = randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const user = await prisma.user.create({
    data: { name, email, jobTitle, departmentId, passwordHash, role: "EMPLOYEE" },
  });

  const assigned = await autoAssignForRole(user.id);

  await notifyUser({
    userId: user.id,
    type: "COURSE_ASSIGNED",
    title: "Bem-vindo(a)! Sua jornada de onboarding começou",
    body: `${assigned.paths} trilha(s) e ${assigned.courses} curso(s) foram atribuídos automaticamente para você.`,
  });

  await logAudit({
    userId: user.id,
    action: "HRIS_ONBOARDING_PROVISIONED",
    entityType: "User",
    entityId: user.id,
    metadata: { email, departmentName },
  });

  return NextResponse.json({
    userId: user.id,
    temporaryPassword,
    assigned,
  });
}
