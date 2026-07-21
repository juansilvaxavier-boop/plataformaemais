import { prisma } from "@/lib/db";
import { AI_ENABLED, getEmbedding } from "@/lib/ai/provider";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** (Re)indexa os trechos de uma aula (transcrição) para o assistente de IA. */
export async function indexLessonTranscript(lessonId: string) {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  await prisma.documentChunk.deleteMany({ where: { lessonId } });
  if (!lesson.transcript) return 0;

  const chunks = chunkText(lesson.transcript);
  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i];
    const embedding = AI_ENABLED ? await getEmbedding(content) : null;

    if (embedding) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO document_chunks (id, "lessonId", content, "chunkIndex", embedding, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, now())`,
        lessonId,
        content,
        i,
        toVectorLiteral(embedding)
      );
    } else {
      await prisma.documentChunk.create({
        data: { lessonId, content, chunkIndex: i },
      });
    }
  }
  return chunks.length;
}

/** (Re)indexa o texto extraído de um material de apoio (ex.: PDF). */
export async function indexMaterialText(materialId: string) {
  const material = await prisma.lessonMaterial.findUniqueOrThrow({ where: { id: materialId } });
  await prisma.documentChunk.deleteMany({ where: { materialId } });
  if (!material.extractedText) return 0;

  const chunks = chunkText(material.extractedText);
  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i];
    const embedding = AI_ENABLED ? await getEmbedding(content) : null;

    if (embedding) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO document_chunks (id, "materialId", content, "chunkIndex", embedding, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, now())`,
        materialId,
        content,
        i,
        toVectorLiteral(embedding)
      );
    } else {
      await prisma.documentChunk.create({
        data: { materialId, content, chunkIndex: i },
      });
    }
  }
  return chunks.length;
}

type RetrievedChunk = { content: string; lessonId: string | null; materialId: string | null };

/** Busca os trechos mais relevantes de um curso para uma pergunta do usuário. */
export async function retrieveRelevantChunks(
  courseId: string,
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const lessonIds = (
    await prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true },
    })
  ).map((l) => l.id);
  const materialIds = (
    await prisma.lessonMaterial.findMany({
      where: { lesson: { module: { courseId } } },
      select: { id: true },
    })
  ).map((m) => m.id);

  if (lessonIds.length === 0 && materialIds.length === 0) return [];

  if (AI_ENABLED) {
    const embedding = await getEmbedding(query);
    if (embedding) {
      const rows = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
        `SELECT content, "lessonId", "materialId"
         FROM document_chunks
         WHERE embedding IS NOT NULL
           AND ("lessonId" = ANY($1::text[]) OR "materialId" = ANY($2::text[]))
         ORDER BY embedding <=> $3::vector
         LIMIT $4`,
        lessonIds,
        materialIds,
        toVectorLiteral(embedding),
        topK
      );
      return rows;
    }
  }

  // Modo offline: ranqueia por sobreposição de palavras-chave.
  const chunks = await prisma.documentChunk.findMany({
    where: {
      OR: [{ lessonId: { in: lessonIds } }, { materialId: { in: materialIds } }],
    },
    select: { content: true, lessonId: true, materialId: true },
  });

  const queryTerms = query
    .toLowerCase()
    .split(/[^a-zà-ú0-9]+/i)
    .filter((t) => t.length > 2);

  const scored = chunks
    .map((c) => {
      const lower = c.content.toLowerCase();
      const score = queryTerms.reduce((acc, term) => acc + (lower.includes(term) ? 1 : 0), 0);
      return { ...c, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.length > 0 ? scored : chunks.slice(0, topK);
}
