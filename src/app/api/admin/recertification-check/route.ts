import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runRecertificationCheck } from "@/lib/recertification";

export async function POST() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const result = await runRecertificationCheck();
  return NextResponse.json(result);
}
