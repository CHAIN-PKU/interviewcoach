import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runDistill } from "@/lib/distill";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { sessionId, rating, feedback, consentToShare } = await req.json();

  if (!sessionId) return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });

  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true },
  });
  if (!dbSession) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      ...(rating != null && { userRating: Number(rating) }),
      ...(feedback != null && { userFeedback: String(feedback) }),
      ...(consentToShare != null && { consentToShare: Boolean(consentToShare) }),
    },
  });

  // Fire-and-forget distill when user consents to share
  if (consentToShare === true) {
    runDistill()
      .then((result) => console.log("[flywheel] auto-distill done:", result))
      .catch((err) => console.error("[flywheel] auto-distill failed:", err));
  }

  return NextResponse.json({
    ok: true,
    distillTriggered: consentToShare === true,
  });
}
