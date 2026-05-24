import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { HarnessTemplate } from "@/lib/skill-loader";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });

  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId, userId: session.user.id },
    select: { harnessSnapshot: true, currentStage: true, status: true, mode: true },
  });

  if (!dbSession) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  const snapshot = JSON.parse(dbSession.harnessSnapshot || "{}") as HarnessTemplate & {
    _ragContext?: string;
    _engineState?: string;
    _matchedBy?: Record<string, string>;
    _personalization?: {
      headline?: string;
      rationale?: string[];
      focusAreas?: string[];
      stagePlan?: Array<{ name: string; duration_min: number; keywords?: string[]; focus?: string }>;
      distilledPatternsUsed?: number;
      communityInsightsUsed?: number;
    };
  };

  const { _ragContext: _r, _engineState, _matchedBy, _personalization, ...harness } = snapshot;

  let engine: {
    currentStageIndex: number;
    isComplete: boolean;
    stageStartTime: number;
    dialogHistory: Array<{ role: "user" | "assistant"; content: string }>;
  } = {
    currentStageIndex: 0,
    isComplete: dbSession.status === "completed",
    stageStartTime: Date.now(),
    dialogHistory: [],
  };

  try {
    const parsed = JSON.parse(_engineState || "{}");
    engine = {
      currentStageIndex: parsed.currentStageIndex ?? 0,
      isComplete: parsed.isComplete ?? dbSession.status === "completed",
      stageStartTime: parsed.stageStartTime ?? Date.now(),
      dialogHistory: parsed.dialogHistory ?? [],
    };
  } catch {
    /* use defaults */
  }

  return NextResponse.json({
    harness,
    currentStage: dbSession.currentStage,
    status: dbSession.status,
    mode: dbSession.mode,
    matchedBy: _matchedBy || null,
    personalization: _personalization || null,
    engine,
  });
}
