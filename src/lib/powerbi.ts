import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";

/**
 * Autenticação dos endpoints de exportação para Power BI: header "x-api-key"
 * com o valor de POWERBI_API_KEY. Usado pelo conector Web/Power Query quando
 * o Power BI Service não tem acesso direto ao banco de dados (cenário mais
 * comum em nuvem). Para conexão direta (Power BI Desktop na rede da empresa,
 * ou um gateway de dados local), use o conector nativo PostgreSQL apontando
 * para as views "vw_bi_*" — ver /admin/power-bi para as instruções completas.
 */
export function assertPowerBiApiKey(req: NextRequest): NextResponse | null {
  const key = req.headers.get("x-api-key");
  if (!key || key !== process.env.POWERBI_API_KEY) {
    return NextResponse.json({ error: "Chave de API inválida." }, { status: 401 });
  }

  // Uso esperado é refresh agendado de dashboards, não tráfego interativo.
  return assertRateLimit(req, "powerbi", 60, 60 * 60 * 1000, key);
}

export async function queryBiView<T = Record<string, unknown>>(
  viewName: string,
  limit: number
): Promise<T[]> {
  // Nomes de view vêm de uma lista fixa controlada pelo servidor (nunca do
  // usuário), então a interpolação abaixo não constitui injeção de SQL.
  return prisma.$queryRawUnsafe<T[]>(`SELECT * FROM "${viewName}" LIMIT $1`, limit);
}

export const BI_DATASETS = {
  enrollments: { view: "vw_bi_enrollments", label: "Matrículas (cursos e trilhas)" },
  certificates: { view: "vw_bi_certificates", label: "Certificados emitidos" },
  "quiz-attempts": { view: "vw_bi_quiz_attempts", label: "Tentativas de quiz" },
  "competency-matrix": { view: "vw_bi_competency_matrix", label: "Matriz de competências" },
  "external-trainings": { view: "vw_bi_external_trainings", label: "Treinamentos presenciais/externos" },
  "course-feedback": { view: "vw_bi_course_feedback", label: "Avaliações NPS de cursos" },
} as const;

export type BiDatasetKey = keyof typeof BI_DATASETS;
