import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModelConfig, callLLMText } from "@/lib/model-router";
import { buildReportPrompt } from "@/lib/prompt-assembler";
import {
  buildCoverageSummary,
  computeStageCoverage,
  adjustReportScores,
  extractUnansweredQuestions,
  applyScoringExclusions,
} from "@/lib/report-scoring";
import type { HarnessTemplate } from "@/lib/skill-loader";

async function loadSessionReport(sessionId: string, userId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId, userId },
    include: {
      qaRecords: { orderBy: { createdAt: "asc" } },
      profile: { select: { profileSummary: true } },
    },
  });
}

function parseCachedReport(reportJson: string | null | undefined) {
  if (!reportJson) return null;
  try {
    return JSON.parse(reportJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseEngineState(snapshot: HarnessTemplate & { _engineState?: string }) {
  try {
    return JSON.parse(snapshot._engineState || "{}") as {
      stageSummaries?: Record<string, string>;
      dialogHistory?: Array<{ role: "user" | "assistant"; content: string; ts?: number }>;
      currentStageIndex?: number;
      stageStartTime?: number;
    };
  } catch {
    return {};
  }
}

async function backfillUnansweredQA(
  sessionId: string,
  stages: HarnessTemplate["stages"],
  engineStateData: ReturnType<typeof parseEngineState>,
  existingQuestions: Array<{ stageId: string; question: string }>
) {
  const lastStageIdx = (engineStateData.currentStageIndex ?? stages.length) - 1;
  if (lastStageIdx < 0 || !stages[lastStageIdx] || !engineStateData.dialogHistory?.length) {
    return;
  }

  const lastStage = stages[lastStageIdx];
  const unanswered = extractUnansweredQuestions(engineStateData.dialogHistory);
  for (const u of unanswered) {
    const exists = existingQuestions.some(
      (r) => r.stageId === lastStage.id && r.question === u.question
    );
    if (!exists) {
      await prisma.qARecord.create({
        data: {
          sessionId,
          stageId: lastStage.id,
          question: u.question,
          answer: null,
          followUpDepth: 0,
        },
      });
    }
  }
}

async function buildReportContext(sessionId: string, dbSession: NonNullable<Awaited<ReturnType<typeof loadSessionReport>>>) {
  const snapshot = JSON.parse(dbSession.harnessSnapshot || "{}") as HarnessTemplate & {
    _engineState?: string;
  };
  const engineStateData = parseEngineState(snapshot);
  const stages = snapshot.stages || [];

  await backfillUnansweredQA(
    sessionId,
    stages,
    engineStateData,
    dbSession.qaRecords.map((r) => ({ stageId: r.stageId, question: r.question }))
  );

  const freshSession = await loadSessionReport(sessionId, dbSession.userId);
  const rawQA = (freshSession?.qaRecords || dbSession.qaRecords).map((r) => ({
    stageId: r.stageId,
    question: r.question,
    answer: r.answer,
  }));

  const allQA = applyScoringExclusions(rawQA, stages, {
    stageStartTime: engineStateData.stageStartTime,
    dialogHistory: engineStateData.dialogHistory,
    currentStageIndex: engineStateData.currentStageIndex,
  });

  return {
    snapshot,
    engineStateData,
    stages,
    allQA,
    freshSession: freshSession || dbSession,
  };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });

  const dbSession = await loadSessionReport(sessionId, session.user.id);
  if (!dbSession) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  const cached = parseCachedReport(dbSession.reportJson);
  if (!cached) {
    return NextResponse.json({ cached: false, sessionId });
  }

  const { stages, allQA, freshSession } = await buildReportContext(sessionId, dbSession);
  const adjusted = adjustReportScores(cached, allQA, stages);

  const adjustedStr = JSON.stringify(adjusted);
  if (adjustedStr !== dbSession.reportJson) {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        totalScore: (adjusted.total_score as number) || dbSession.totalScore,
        scoreDims: JSON.stringify(adjusted.score_dims || {}),
        reportJson: adjustedStr,
      },
    });
  }

  const qaRecordIds = (freshSession.qaRecords || dbSession.qaRecords).map((r) => ({
    id: r.id,
    question: r.question,
  }));
  return NextResponse.json({ cached: true, report: adjusted, sessionId, qaRecordIds });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { sessionId, force } = await req.json();

  const dbSession = await loadSessionReport(sessionId, session.user.id);
  if (!dbSession) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  const qaRecordIds = dbSession.qaRecords.map((r) => ({ id: r.id, question: r.question }));

  if (!force) {
    const cached = parseCachedReport(dbSession.reportJson);
    if (cached) {
      return NextResponse.json({ report: cached, sessionId, qaRecordIds, cached: true });
    }
  }

  const snapshot = JSON.parse(dbSession.harnessSnapshot || "{}") as HarnessTemplate & {
    _engineState?: string;
  };

  const config = getModelConfig(session.user.tier as "free" | "pro");

  const { engineStateData, stages, allQA, freshSession } = await buildReportContext(
    sessionId,
    dbSession
  );

  const coverage = computeStageCoverage(stages, allQA);
  const coverageSummary = buildCoverageSummary(coverage, allQA);

  const { system, messages } = buildReportPrompt({
    harnessName: snapshot.name || "模拟面试",
    profileSummary: freshSession?.profile?.profileSummary || dbSession.profile?.profileSummary || "通用学生背景",
    stageSummaries: engineStateData.stageSummaries || {},
    allQA,
    criteriaInsights: snapshot.interviewer_persona?.criteria_insights || [],
    coverageSummary,
    stages: stages.map((s) => ({ id: s.id, name: s.name })),
  });

  let reportJson: Record<string, unknown> = {};
  let rawLLMResponse = "";
  try {
    rawLLMResponse = await callLLMText(config, system, messages);
    const jsonMatch = rawLLMResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      reportJson = JSON.parse(jsonMatch[0]);
    } else {
      console.error("[report] LLM did not return JSON. Raw:", rawLLMResponse.slice(0, 500));
    }
  } catch (err) {
    console.error("[report] LLM error:", err, "Raw:", rawLLMResponse.slice(0, 500));
  }

  if (!reportJson.total_score) {
    const hasContent = allQA.some((q) => q.answer?.trim());
    const unanswered = allQA.filter((q) => !q.answer?.trim()).length;
    reportJson = {
      total_score: hasContent ? (unanswered > 0 ? 45 : 50) : 30,
      score_dims: {
        内容深度: hasContent ? 55 : 30,
        表达清晰度: hasContent ? 50 : 30,
        时间控制: hasContent ? 45 : 30,
        逻辑性: hasContent ? 50 : 30,
        方向匹配度: hasContent ? 50 : 30,
        追问应对: hasContent ? 55 : 30,
      },
      highlights: hasContent ? ["完成了面试流程"] : ["已进入面试"],
      improvements: [
        {
          issue: hasContent ? "报告生成遇到问题" : "本次面试内容记录不足",
          suggestion: "用30秒重述刚才最弱的一题，先说结论再补一句理由",
          related_stage: "general",
        },
      ],
      uncovered_areas: [],
      weakness_tags: [],
      question_scores: [],
    };
  }

  reportJson = adjustReportScores(reportJson, allQA, stages);

  const totalScore = (reportJson.total_score as number) || 70;
  const scoreDims = JSON.stringify(reportJson.score_dims || {});
  const reportJsonStr = JSON.stringify(reportJson);

  await prisma.session.update({
    where: { id: sessionId },
    data: { totalScore, scoreDims, reportJson: reportJsonStr, status: "completed" },
  });

  const weaknessTags = (reportJson.weakness_tags as string[]) || [];
  if (weaknessTags.length > 0) {
    const weakObj: Record<string, number> = {};
    weaknessTags.forEach((t) => {
      weakObj[t] = 0.5;
    });

    const existing = await prisma.weaknessSummary.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      try {
        const prev = JSON.parse(existing.weaknesses) as Record<string, number>;
        const merged: Record<string, number> = { ...prev };
        Object.entries(weakObj).forEach(([k, v]) => {
          merged[k] = prev[k] != null ? (prev[k] + v) / 2 : v;
        });
        await prisma.weaknessSummary.update({
          where: { id: existing.id },
          data: {
            weaknesses: JSON.stringify(merged),
            basedOnSessions: JSON.stringify(
              [...JSON.parse(existing.basedOnSessions || "[]"), sessionId].slice(-10)
            ),
          },
        });
      } catch {
        /* ignore */
      }
    } else {
      await prisma.weaknessSummary.create({
        data: {
          userId: session.user.id,
          weaknesses: JSON.stringify(weakObj),
          basedOnSessions: JSON.stringify([sessionId]),
        },
      });
    }
  }

  const qaRecordIdsFinal = (freshSession?.qaRecords || dbSession.qaRecords).map((r) => ({
    id: r.id,
    question: r.question,
  }));

  return NextResponse.json({ report: reportJson, sessionId, qaRecordIds: qaRecordIdsFinal, cached: false });
}
