import { NextRequest, NextResponse } from "next/server";
import { assertPowerBiApiKey, queryBiView } from "@/lib/powerbi";

export async function GET(req: NextRequest) {
  const authError = assertPowerBiApiKey(req);
  if (authError) return authError;

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10000), 50000);
  const rows = await queryBiView("vw_bi_enrollments", limit);
  return NextResponse.json({ value: rows });
}
