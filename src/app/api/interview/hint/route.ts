import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModelConfig, callLLMText } from "@/lib/model-router";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });

  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId, userId: session.user.id },
    include: {
      qaRecords: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  if (!dbSession) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  if (dbSession.mode !== "practice") {
    return NextResponse.json({ error: "提示仅在练习模式可用" }, { status: 403 });
  }

  // Get the last Q&A
  const lastQA = dbSession.qaRecords[0];
  if (!lastQA) return NextResponse.json({ hint: "暂无足够的对话记录，请先回答一道题。" });

  const config = getModelConfig(session.user.tier as "free" | "pro");

  const prompt = `你是一个面试训练辅导老师。以下是学生刚刚在模拟面试中的一道问答：

问题：${lastQA.question}
学生回答：${lastQA.answer || "（学生未回答）"}

请用 3-5 句话给出即时反馈：
1. 这道题回答得如何（1句）
2. 最核心的不足是什么（1句）
3. 可以怎么补充或改进（1-2句）

要求：简洁直接，像一个严格但友善的导师在面试后当场点评。不要给分，不要废话，直接说重点。`;

  try {
    const hint = await callLLMText(config, "你是面试训练导师，提供简洁精准的即时反馈。", [
      { role: "user", content: prompt },
    ]);
    return NextResponse.json({ hint: hint.trim() });
  } catch {
    return NextResponse.json({ hint: "暂时无法获取提示，请稍后重试。" });
  }
}
