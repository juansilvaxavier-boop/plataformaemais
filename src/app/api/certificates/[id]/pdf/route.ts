import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderCertificatePdf } from "@/lib/certificate";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const certificate = await prisma.certificate.findUnique({ where: { id } });
  if (!certificate) return NextResponse.json({ error: "Certificado não encontrado." }, { status: 404 });

  const isOwner = certificate.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const pdfBytes = await renderCertificatePdf(id);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${certificate.verificationCode}.pdf"`,
    },
  });
}
