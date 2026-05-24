import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModelConfig, callLLM, callLLMText } from "@/lib/model-router";
import { assemblePrompt, buildStageSummaryPrompt } from "@/lib/prompt-assembler";
import {
  deserializeState,
  serializeState,
  getCurrentStage,
  advanceStage,
  looksLikeQuestion,
} from "@/lib/harness-engine";
import { extractUnansweredQuestions } from "@/lib/report-scoring";
import { parseAIReply } from "@/lib/ai-reply";
import { buildDirectionContext } from "@/lib/harness-personalize";
import type { HarnessTemplate } from "@/lib/skill-loader";

async function performStageAdvance(
  sessionId: string,
  snapshot: HarnessTemplate & { _engineState?: string },
  engineState: ReturnType<typeof deserializeState>
) {
  const currentStage = getCurrentStage(engineState);
  const summaryPrompt = buildStageSummaryPrompt(currentStage.name, engineState.dialogHistory);

  // Persist unanswered questions before dialog is cleared
  const unanswered = extractUnansweredQuestions(engineState.dialogHistory);
  for (const u of unanswered) {
    const exists = await prisma.qARecord.findFirst({
      where: { sessionId, stageId: currentStage.id, question: u.question },
    });
    if (!exists) {
      await prisma.qARecord.create({
        data: {
          sessionId,
          stageId: currentStage.id,
          question: u.question,
          answer: null,
          followUpDepth: 0,
        },
      });
    }
  }

  let summaryText = "";
  try {
    const summaryRaw = await callLLMText(
      getModelConfig("pro"),
      summaryPrompt.system,
      summaryPrompt.messages
    );
    const jsonMatch = summaryRaw.match(/\{[\s\S]*\}/);
    summaryText = jsonMatch ? jsonMatch[0] : summaryRaw;
  } catch {
    summaryText = `{"highlights": [], "weaknesses": [], "next_focus": ""}`;
  }

  const { state: newState, nextStage } = advanceStage(engineState, summaryText, {
    carryDialog:
      currentStage.type === "presentation"
        ? (() => {
            const last = engineState.dialogHistory.at(-1);
            return last?.role === "assistant" && looksLikeQuestion(last.content) ? [last] : [];
          })()
        : [],
  });
  snapshot._engineState = serializeState(newState);
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      currentStage: nextStage?.id || "completed",
      status: newState.isComplete ? "completed" : "in_progress",
      harnessSnapshot: JSON.stringify(snapshot),
    },
  });

  return { newState, nextStage, summaryText };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();
  const { sessionId, message, action, systemHint } = body;

  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId, userId: session.user.id },
    include: { qaRecords: { orderBy: { createdAt: "asc" } } },
  });

  if (!dbSession) return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  if (dbSession.status === "completed") return NextResponse.json({ error: "面试已结束" }, { status: 400 });

  const snapshot = JSON.parse(dbSession.harnessSnapshot || "{}") as HarnessTemplate & {
    _ragContext?: string;
    _engineState?: string;
  };

  const engineState = deserializeState(sessionId, snapshot, snapshot._engineState || "{}");
  const currentStage = getCurrentStage(engineState);
  const tier = session.user.tier as "free" | "pro";
  const config = getModelConfig(tier);

  if (action === "advance_stage") {
    const { nextStage, newState, summaryText } = await performStageAdvance(
      sessionId,
      snapshot,
      engineState
    );

    return NextResponse.json({
      stageAdvanced: true,
      nextStage: nextStage || null,
      isComplete: newState.isComplete,
      summary: summaryText,
    });
  }

  if (!message) return NextResponse.json({ error: "消息不能为空" }, { status: 400 });

  const isStageStart = message === "__STAGE_START__";
  const isPresentation = currentStage.type === "presentation";

  // ── 汇报阶段：用户 monologue 只记录，不触发 AI 追问（真实面试不打断） ──
  if (isPresentation && !isStageStart) {
    engineState.dialogHistory.push({ role: "user", content: message, ts: Date.now() });
    snapshot._engineState = serializeState(engineState);
    await prisma.session.update({
      where: { id: sessionId },
      data: { harnessSnapshot: JSON.stringify(snapshot) },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              silent: true,
              stageId: currentStage.id,
              finalContent: "",
            })}\n\n`
          )
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  if (!isStageStart) {
    engineState.dialogHistory.push({ role: "user", content: message, ts: Date.now() });
  }

  const profile = dbSession.profileId
    ? await prisma.profile.findUnique({
        where: { id: dbSession.profileId },
        select: { profileSummary: true },
      })
    : null;

  const weakness = await prisma.weaknessSummary.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { weaknesses: true },
  });

  const matchedBy = (snapshot as unknown as Record<string, Record<string, string>>)._matchedBy;
  const userDirection = matchedBy?.direction || "";
  const baseProfile =
    profile?.profileSummary ||
    (matchedBy
      ? `目标：${matchedBy.targetSchool || ""} ${matchedBy.targetAdvisor || ""}`
      : "通用学生");
  const profileSummary = userDirection
    ? `${baseProfile}\n${buildDirectionContext(userDirection)}`
    : baseProfile;

  const elapsedSecs = (Date.now() - engineState.stageStartTime) / 1000;
  const stageDurationSecs = currentStage.duration_min * 60;
  const remainingSecs = Math.max(0, stageDurationSecs - elapsedSecs);

  let { system, messages: promptMessages } = assemblePrompt({
    harnessConfig: snapshot,
    currentStage,
    profileSummary,
    userDirection: userDirection || null,
    remainingSecs,
    weaknesses: weakness?.weaknesses,
    prevStageSummary:
      engineState.currentStageIndex > 0
        ? engineState.stageSummaries[
            engineState.harnessConfig.stages[engineState.currentStageIndex - 1]?.id
          ] || null
        : null,
    dialogHistory: engineState.dialogHistory,
    ragContext: snapshot._ragContext,
    tier,
  });

  if (systemHint && typeof systemHint === "string") {
    system += `\n\n【系统提醒】${systemHint}`;
  }

  if (isStageStart) {
    if (isPresentation) {
      system += `\n\n【阶段开始】这是汇报阶段开场。只输出一句邀请用户汇报的话（如「请开始你的汇报」），禁止提问。`;
    } else if (currentStage.type === "open_discussion") {
      system += `\n\n【阶段开始·开放问题】你是考官，必须用疑问句向学生提问（匹配度、研究规划、能给组里带来什么等）。
严禁替学生作答：禁止第一人称「我/我的/我想」、禁止输出示例答案、禁止 LaTeX 公式、禁止「协议已确认」等无关语句。
只问一个问题，控制在80字内。`;
    } else {
      system += `\n\n【阶段开始】这是问答/追问阶段开场。根据上一阶段摘要或用户背景，以考官身份直接提出第一个问题。禁止说「进入下一环节」等过渡语，禁止替学生作答。`;
    }
    promptMessages = engineState.dialogHistory;
  }

  const llmRes = await callLLM(config, system, promptMessages, true);
  if (!llmRes.ok) {
    const errText = await llmRes.text();
    return NextResponse.json({ error: `AI错误: ${errText.slice(0, 100)}` }, { status: 500 });
  }

  const currentFollowUpDepth = engineState.dialogHistory.filter((m) => m.role === "user").length - 1;
  if (!isStageStart && !isPresentation) {
    prisma.qARecord
      .create({
        data: {
          sessionId,
          stageId: currentStage.id,
          question: engineState.dialogHistory.at(-2)?.content || message,
          answer: message,
          followUpDepth: Math.max(0, currentFollowUpDepth),
        },
      })
      .catch(() => {});
  }

  const encoder = new TextEncoder();
  let fullReply = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = llmRes.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || "";
              if (token) {
                fullReply += token;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            } catch {
              /* ignore */
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      const { content: cleanedReply } = parseAIReply(fullReply, {
        isPresentation: currentStage.type === "presentation",
        isOpenDiscussion: currentStage.type === "open_discussion",
      });

      engineState.dialogHistory.push({ role: "assistant", content: cleanedReply, ts: Date.now() });
      snapshot._engineState = serializeState(engineState);

      await prisma.session
        .update({
          where: { id: sessionId },
          data: { harnessSnapshot: JSON.stringify(snapshot) },
        })
        .catch(() => {});

      const isLastStage =
        engineState.currentStageIndex >= engineState.harnessConfig.stages.length - 1;

      // Never auto-advance from chat stream — stage changes are driven by
      // client timer + manual buttons only (prevents double-skip bugs)
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            done: true,
            stageId: currentStage.id,
            finalContent: cleanedReply,
            autoAdvance: false,
            isLastStage,
          })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
