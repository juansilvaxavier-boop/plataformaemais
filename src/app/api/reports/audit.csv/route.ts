import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const header = ["Data/Hora", "Usuário", "E-mail", "Ação", "Tipo de Entidade", "ID da Entidade", "Metadados"];
  const rows = logs.map((l) =>
    [
      l.createdAt.toISOString(),
      l.user?.name ?? "-",
      l.user?.email ?? "-",
      l.action,
      l.entityType,
      l.entityId ?? "-",
      l.metadata ? JSON.stringify(l.metadata) : "",
    ]
      .map(escapeCsv)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
