import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runDistill } from "@/lib/distill";
import fs from "fs";
import path from "path";

const RAG_INDEX_PATH = path.join(process.cwd(), "knowledge", "rag_index.json");

export async function POST(req: Request) {
  const authSession = await getServerSession(authOptions);

  const adminSecret = req.headers.get("x-admin-secret");
  const envSecret = process.env.ADMIN_SECRET;
  const isAdminBySecret = envSecret && adminSecret === envSecret;
  const isAdminByEmail =
    authSession?.user?.email === "demo@interviewcoach.ai" ||
    authSession?.user?.email === "zs@interviewcoach.ai";

  if (!isAdminBySecret && !isAdminByEmail) {
    return NextResponse.json({ error: "未授权" }, { status: 403 });
  }

  const { newRagEntries, newWeaknessInsights, newImprovedProbes } = await runDistill();

  let communityRagCount = 0;
  let distilledSkillCount = 0;
  try {
    const ragData = JSON.parse(fs.readFileSync(RAG_INDEX_PATH, "utf-8"));
    communityRagCount = ragData.entries.filter((e: { source?: string }) => e.source === "community").length;
  } catch {
    /* ignore */
  }
  try {
    const { countAllDistilledPatterns } = await import("@/lib/skill-loader");
    distilledSkillCount = countAllDistilledPatterns();
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    ok: true,
    summary: {
      newRagEntries,
      newWeaknessInsights,
      newImprovedProbes,
      totalCommunityRag: communityRagCount,
      totalDistilledSkillPatterns: distilledSkillCount,
    },
  });
}
