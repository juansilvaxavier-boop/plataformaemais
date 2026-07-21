/**
 * Camada de abstração de IA. Quando OPENAI_API_KEY está configurada, usa a API
 * da OpenAI (embeddings + chat) para RAG completo. Sem a chave, a plataforma
 * continua operacional em "modo offline": busca extrativa por palavras-chave
 * no lugar de embeddings vetoriais, e respostas geradas por heurísticas de
 * sumarização em vez de um LLM.
 */

export const AI_ENABLED = Boolean(process.env.OPENAI_API_KEY);

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

async function openaiFetch(path: string, body: unknown) {
  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI API error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!AI_ENABLED) return null;
  const data = await openaiFetch("embeddings", {
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return data.data[0].embedding as number[];
}

export async function getChatCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!AI_ENABLED) {
    throw new Error("AI provider indisponível (modo offline).");
  }
  const data = await openaiFetch("chat/completions", {
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  });
  return data.choices[0].message.content as string;
}
