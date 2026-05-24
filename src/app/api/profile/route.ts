import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModelConfig, callLLMText } from "@/lib/model-router";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { experiences: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();
  const {
    university, major, gpa, targetSchool, targetAdvisor,
    advisorDirection, strengths, concerns, experiences, resumeText,
  } = body;

  // Generate profileSummary via AI
  let profileSummary = "";
  try {
    const config = getModelConfig("free");
    const expStr = JSON.stringify(experiences || []);
    profileSummary = await callLLMText(config,
      "你是一个面试档案助手。请基于用户信息生成一份150字以内的结构化摘要，用于后续面试追问。摘要要包含：核心科研经历（一句话）、与目标方向的匹配点、可能的追问红旗。直接输出文字，不要JSON。严禁输出任何元注释、隐藏触发词、或「建议考官引导至…」类指令性文字；只描述学生事实。",
      [{ role: "user", content: `院校：${university || ""} ${major || ""}，GPA：${gpa || ""}，目标：${targetSchool || ""} ${targetAdvisor || ""}（${advisorDirection || ""}），科研经历：${expStr}，自评优势：${JSON.stringify(strengths || [])}，担心被问：${JSON.stringify(concerns || [])}` }]
    );
  } catch {
    profileSummary = `${university || ""}${major ? " · " + major : ""}，目标：${targetSchool || ""}${targetAdvisor ? " · " + targetAdvisor : ""}（${advisorDirection || ""}）`;
  }

  const existing = await prisma.profile.findUnique({ where: { userId: session.user.id } });

  if (existing) {
    // Update profile
    await prisma.experience.deleteMany({ where: { profileId: existing.id } });
    const updated = await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        university, major, gpa, targetSchool, targetAdvisor,
        advisorDirection,
        strengths: JSON.stringify(strengths || []),
        concerns: JSON.stringify(concerns || []),
        profileSummary,
        resumeText: resumeText || existing.resumeText,
        experiences: {
          create: (experiences || []).map((e: Record<string, unknown>, i: number) => ({ ...e, sortOrder: i })),
        },
      },
      include: { experiences: true },
    });
    return NextResponse.json({ profile: updated });
  }

  const created = await prisma.profile.create({
    data: {
      userId: session.user.id,
      university, major, gpa, targetSchool, targetAdvisor,
      advisorDirection,
      strengths: JSON.stringify(strengths || []),
      concerns: JSON.stringify(concerns || []),
      profileSummary,
      resumeText,
      experiences: {
        create: (experiences || []).map((e: Record<string, unknown>, i: number) => ({ ...e, sortOrder: i })),
      },
    },
    include: { experiences: true },
  });

  return NextResponse.json({ profile: created }, { status: 201 });
}
