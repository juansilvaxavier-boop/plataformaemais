import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { assertRateLimit } from "@/lib/rate-limit";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
]);

/**
 * Upload de arquivos para armazenamento local em disco (capas de curso,
 * materiais de apoio, comprovantes de treinamento externo). Os arquivos
 * ficam em UPLOADS_DIR (por padrão "./public/uploads"), servidos
 * automaticamente pelo Next.js como estáticos — trocar por um bucket
 * S3/Vercel Blob em produção real basta reimplementar este handler mantendo
 * o mesmo contrato de resposta ({ url }).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    assertRole(session?.user?.role, "INSTRUCTOR");
  } catch {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const rateLimited = assertRateLimit(req, "upload", 20, 10 * 60 * 1000, session!.user.id);
  if (rateLimited) return rateLimited;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Arquivo maior que 15MB." }, { status: 400 });
  }

  const originalExt = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(originalExt)) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido." }, { status: 400 });
  }

  const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "./public/uploads");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${randomUUID()}${originalExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
