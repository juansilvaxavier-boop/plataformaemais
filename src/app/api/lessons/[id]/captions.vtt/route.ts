import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { segmentsToVtt, type CaptionSegment } from "@/lib/captions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson?.captionSegments) {
    return new NextResponse("WEBVTT\n", { headers: { "Content-Type": "text/vtt" } });
  }

  const vtt = segmentsToVtt(lesson.captionSegments as unknown as CaptionSegment[]);
  return new NextResponse(vtt, { headers: { "Content-Type": "text/vtt" } });
}
