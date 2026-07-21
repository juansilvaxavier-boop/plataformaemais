import { NextRequest, NextResponse } from "next/server";

/**
 * Limitador de taxa simples (janela fixa, em memória do processo). Suficiente
 * para uma instância única do servidor Next.js; em um deploy horizontalmente
 * escalado (múltiplas instâncias), substitua por um contador compartilhado
 * (Redis, Upstash, etc.) mantendo a mesma assinatura de `checkRateLimit`.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Evita crescimento ilimitado do Map em processos de longa duração.
const MAX_BUCKETS = 50_000;

/**
 * Variante de baixo nível para uso em Server Actions (sem um NextRequest
 * disponível). Use `assertRateLimit` em route handlers sempre que possível.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

function requestIdentity(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Aplica um limite de requisições por janela de tempo. `scope` diferencia o
 * endpoint (ex.: "chat", "heartbeat"); `identity`, quando fornecida (ex.: o
 * userId autenticado), é usada no lugar do IP para uma limitação mais precisa
 * por usuário. Retorna uma resposta 429 pronta para devolver, ou `null` se a
 * requisição pode prosseguir.
 */
export function assertRateLimit(
  req: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
  identity?: string
): NextResponse | null {
  const key = `${scope}:${identity ?? requestIdentity(req)}`;
  if (!checkRateLimit(key, limit, windowMs)) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429 }
    );
  }
  return null;
}
