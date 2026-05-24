import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { matchHarnessTemplate } from "@/lib/skill-loader";
import { buildRAGContext } from "@/lib/rag-router";
import { generatePersonalizedHarness } from "@/lib/harness-generator";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();
  const { interviewType, targetSchool, targetAdvisor, direction, mode } = body;

  const baseTemplate = matchHarnessTemplate({ interviewType, targetSchool, targetAdvisor, direction });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { experiences: { orderBy: { sortOrder: "asc" } } },
  });

  const ragContext = buildRAGContext({ targetSchool, targetAdvisor, direction });

  const weakness = await prisma.weaknessSummary.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const { template, summary } = await generatePersonalizedHarness({
    baseTemplate,
    interviewType,
    targetSchool,
    targetAdvisor,
    direction,
    profileSummary: profile?.profileSummary,
    experiences: profile?.experiences,
    weaknesses: weakness?.weaknesses,
    ragContext,
    tier: session.user.tier as "free" | "pro",
  });

  const dbSession = await prisma.session.create({
    data: {
      userId: session.user.id,
      profileId: profile?.id,
      mode: mode || "practice",
      status: "in_progress",
      currentStage: template.stages[0].id,
      harnessSnapshot: JSON.stringify({
        ...template,
        _ragContext: ragContext,
        _matchedBy: { interviewType, targetSchool, targetAdvisor, direction },
        _personalization: summary,
      }),
    },
  });

  return NextResponse.json({
    sessionId: dbSession.id,
    template,
    personalization: summary,
    hasProfile: !!profile,
    profileSummary: profile?.profileSummary || null,
    weaknesses: weakness?.weaknesses || null,
    ragContext,
  });
}
