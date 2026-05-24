import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import fs from "fs";
import path from "path";
import {
  Brain,
  Zap,
  FileText,
  Clock,
  ChevronRight,
  Trophy,
  LogOut,
  Sparkles,
  BarChart3,
  Database,
  TrendingUp,
} from "lucide-react";
import { DashboardClient } from "./dashboard-client";
import { countAllDistilledPatterns } from "@/lib/skill-loader";
import { brandGradientBrStyle, brandGradientStyle, whiteOverlay20Style } from "@/lib/brand-styles";

function getFlywheelStats() {
  try {
    const ragPath = path.join(process.cwd(), "knowledge", "rag_index.json");
    const ragData = JSON.parse(fs.readFileSync(ragPath, "utf-8")) as { entries: { source?: string }[] };
    const communityRag = ragData.entries.filter((e) => e.source === "community").length;
    const distilledCount = countAllDistilledPatterns();
    return { communityRag, distilledCount };
  } catch {
    return { communityRag: 0, distilledCount: countAllDistilledPatterns() };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [recentSessions, hasProfile, totalSessions] = await Promise.all([
    prisma.session.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, status: true, mode: true, totalScore: true,
        createdAt: true, harnessSnapshot: true,
      },
    }),
    prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    }),
    prisma.session.count({ where: { status: "completed" } }),
  ]);

  const completedCount = recentSessions.filter((s) => s.status === "completed").length;

  // Progress curve: completed sessions with scores, chronological order
  const scoreSeries = recentSessions
    .filter((s) => s.status === "completed" && s.totalScore != null)
    .reverse()
    .slice(-10)
    .map((s) => ({ score: Math.round(s.totalScore!), date: s.createdAt }));

  const { communityRag, distilledCount } = getFlywheelStats();

  // Build SVG path for progress curve
  const buildSparklinePath = (points: number[]) => {
    if (points.length < 2) return null;
    const w = 260, h = 60, pad = 8;
    const minS = Math.max(0, Math.min(...points) - 10);
    const maxS = Math.min(100, Math.max(...points) + 10);
    const range = maxS - minS || 1;
    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
    const ys = points.map((v) => h - pad - ((v - minS) / range) * (h - pad * 2));
    const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const fill = `${d} L${xs[xs.length - 1].toFixed(1)},${h} L${xs[0].toFixed(1)},${h} Z`;
    return { d, fill, points: xs.map((x, i) => ({ x, y: ys[i], score: points[i] })) };
  };

  const sparkline = buildSparklinePath(scoreSeries.map((s) => s.score));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">InterviewCoach</span>
          </div>

          <div className="flex items-center gap-3">
            {session.user.tier === "pro" && (
              <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                <Sparkles className="w-3 h-3" />
                Pro
              </span>
            )}
            <span className="text-sm text-slate-600 hidden sm:block">
              {session.user.name || session.user.email}
            </span>
            <Link
              href="/api/auth/signout"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            你好，{session.user.name || "同学"} 👋
          </h1>
          <p className="text-slate-500 text-sm">
            {recentSessions.length === 0
              ? "还没有练习记录，开始你的第一次模拟面试"
              : `你已完成 ${completedCount} 次模拟面试，继续加油！`}
          </p>
        </div>

        {/* Flywheel stats banner */}
        <div className="mb-6 rounded-2xl p-4 text-white bg-indigo-600" style={brandGradientStyle}>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 opacity-80" />
            <span className="text-sm font-semibold">平台数据飞轮</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold">{totalSessions}</span>
              <span className="text-sm opacity-80">次训练积累</span>
            </div>
            <div className="w-px h-8 hidden sm:block" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold">{10 + communityRag}</span>
              <span className="text-sm opacity-80">条社区经验</span>
            </div>
            <div className="w-px h-8 hidden sm:block" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold">{distilledCount}</span>
              <span className="text-sm opacity-80">条飞轮洞察</span>
            </div>
          </div>
          <p className="text-xs opacity-70 mt-2">
            从用户答不好的环节提炼失败模式与改进追问，持续提升考官提问质量
          </p>
        </div>

        {/* Entry cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Quick start */}
          <Link href="/interview/quick-start" className="group">
            <div className="rounded-2xl p-6 text-white h-full bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all hover:scale-[1.01]" style={brandGradientBrStyle}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={whiteOverlay20Style}>
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h2 className="text-xl font-bold mb-2">60 秒快速开始</h2>
              <p className="text-sm leading-relaxed mb-4 opacity-90">
                填写面试类型和研究方向，AI 生成个性化 Harness 编排，预览后进入面试
              </p>
              <div className="flex items-center gap-1.5 text-xs opacity-80">
                <Clock className="w-3 h-3" />
                无需上传简历，60 秒内开始
              </div>
            </div>
          </Link>

          {/* Full profile */}
          <Link href="/profile/edit" className="group">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full hover:border-slate-300 hover:shadow-md transition-all hover:scale-[1.01]">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1.5">
                  {hasProfile && (
                    <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">
                      已建档
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {hasProfile ? "查看 / 更新档案" : "完整建档"}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                上传简历，AI 解析你的科研经历，生成更精准的个性化追问策略
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Trophy className="w-3 h-3" />
                {hasProfile
                  ? "再次练习会注入你的历史薄弱点"
                  : "建档后追问精准度大幅提升"}
              </div>
            </div>
          </Link>
        </div>

        {/* Pro unlock (only for free users) */}
        {session.user.tier !== "pro" && (
          <DashboardClient />
        )}

        {/* Progress curve + recent sessions */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Progress curve */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              进步曲线
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              {scoreSeries.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">完成 2 次以上面试后</p>
                  <p className="text-xs text-slate-400">进步曲线会展示在这里</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-xs text-slate-400">近 {scoreSeries.length} 次得分</span>
                    <span className={`text-sm font-bold ${
                      scoreSeries[scoreSeries.length - 1].score >= 80 ? "text-green-600" :
                      scoreSeries[scoreSeries.length - 1].score >= 65 ? "text-amber-600" : "text-red-500"
                    }`}>
                      最近：{scoreSeries[scoreSeries.length - 1].score}
                    </span>
                  </div>
                  {sparkline && (
                    <svg viewBox="0 0 260 60" className="w-full h-16 overflow-visible">
                      {/* Fill */}
                      <path d={sparkline.fill} fill="url(#sparkGrad)" opacity="0.3" />
                      {/* Line */}
                      <path d={sparkline.d} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Points */}
                      {sparkline.points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="3.5" fill="#6366f1" />
                          <title>{p.score}</title>
                        </g>
                      ))}
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">
                      {new Date(scoreSeries[0].date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(scoreSeries[scoreSeries.length - 1].date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent sessions */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">历史练习记录</h2>

            {recentSessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 mb-2">还没有练习记录</p>
                <p className="text-sm text-slate-400">
                  完成第一次模拟面试后，详细报告会展示在这里
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.slice(0, 7).map((s) => (
                  <Link
                    key={s.id}
                    href={
                      s.status === "completed"
                        ? `/report/${s.id}`
                        : `/interview/${s.id}`
                    }
                    className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">
                          {(() => { try { return JSON.parse(s.harnessSnapshot || "{}").name || "通用模拟面试"; } catch { return "通用模拟面试"; } })()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(s.createdAt).toLocaleDateString("zh-CN", {
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {s.mode === "practice" ? "练习模式" : "模考模式"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.totalScore != null && (
                          <span className="text-2xl font-bold text-indigo-600">
                            {Math.round(s.totalScore)}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            s.status === "completed"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : s.status === "in_progress"
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.status === "completed"
                            ? "已完成"
                            : s.status === "in_progress"
                            ? "进行中"
                            : "已放弃"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
