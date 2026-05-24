import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { code } = await req.json();
  const validCode = process.env.PROMO_CODE || "DEMO2026";

  if (code !== validCode) {
    return NextResponse.json({ error: "体验码无效" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { tier: "pro" },
  });

  return NextResponse.json({ success: true, tier: "pro" });
}
