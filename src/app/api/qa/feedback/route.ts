import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { qaRecordId, thumbsUp } = await req.json();

  if (!qaRecordId) return NextResponse.json({ error: "缺少 qaRecordId" }, { status: 400 });

  // Verify the QA record belongs to the current user's session
  const qaRecord = await prisma.qARecord.findUnique({
    where: { id: qaRecordId },
    include: { session: { select: { userId: true } } },
  });

  if (!qaRecord || qaRecord.session.userId !== session.user.id) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  await prisma.qARecord.update({
    where: { id: qaRecordId },
    data: { userThumbsUp: thumbsUp === null ? null : Boolean(thumbsUp) },
  });

  return NextResponse.json({ ok: true });
}
