"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain, ArrowLeft, RotateCcw, TrendingUp, AlertTriangle,
  CheckCircle2, Loader2, Star, Target, Zap, ThumbsUp, ThumbsDown,
  MessageSquare, Shield, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScoreDims {
  内容深度?: number;
  表达清晰度?: number;
  时间控制?: number;
  逻辑性?: number;
  方向匹配度?: number;
  追问应对?: number;
  [key: string]: number | undefined;
}

interface Improvement {
  issue: string;
  suggestion: string;
  related_stage: string;
}

interface QuestionScore {
  question: string;
  score?: number;
  feedback: string;
  scoringExcluded?: boolean;
}

interface QARecordRef {
  id: string;
  question: string;
}

interface Report {
  total_score: number;
  score_dims: ScoreDims;
  highlights: string[];
  improvements: Improvement[];
  weakness_tags: string[];
  question_scores: QuestionScore[];
}

const DIM_ICONS: Record<string, string> = {
  内容深度: "🧠",
  表达清晰度: "💬",
  时间控制: "⏱",
  逻辑性: "🔗",
  方向匹配度: "🎯",
  追问应对: "⚡",
};

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="100" height="100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [qaRecordIds, setQaRecordIds] = useState<QARecordRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Flywheel feedback state
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [userFeedback, setUserFeedback] = useState("");
  const [consentToShare, setConsentToShare] = useState<boolean | null>(null);
  const [thumbsMap, setThumbsMap] = useState<Record<string, boolean | null>>({});
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [distillTriggered, setDistillTriggered] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const generateReport = useCallback(async () => {
    setGenerating(true);
    try {
      const cachedRes = await fetch(`/api/report?sessionId=${sessionId}`);
      const cachedData = await cachedRes.json();
      if (cachedData.cached && cachedData.report) {
        setReport(cachedData.report as Report);
        if (cachedData.qaRecordIds) setQaRecordIds(cachedData.qaRecordIds as QARecordRef[]);
        return;
      }

      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report as Report);
      if (data.qaRecordIds) setQaRecordIds(data.qaRecordIds as QARecordRef[]);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleThumbsClick = async (qaId: string, thumbsUp: boolean) => {
    const current = thumbsMap[qaId];
    // Toggle: clicking same button again clears it
    const newVal = current === thumbsUp ? null : thumbsUp;
    setThumbsMap((prev) => ({ ...prev, [qaId]: newVal }));
    await fetch("/api/qa/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qaRecordId: qaId, thumbsUp: newVal }),
    });
  };

  const handleSubmitRating = async () => {
    if (consentToShare === null) return;
    setSubmittingRating(true);
    try {
      const res = await fetch("/api/session/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rating: userRating || null,
          feedback: userFeedback || null,
          consentToShare,
        }),
      });
      const data = await res.json();
      setDistillTriggered(Boolean(data.distillTriggered));
      setRatingSubmitted(true);
    } finally {
      setSubmittingRating(false);
    }
  };

  // Match question_scores to qaRecords by similarity (best-effort by index)
  const getQaIdForScore = (index: number): string | null => {
    if (qaRecordIds.length === 0) return null;
    // QA records include both questions and follow-ups; try to find matching index in order
    return qaRecordIds[index]?.id ?? null;
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">正在生成评估报告</p>
            <p className="text-slate-500 text-sm mt-1">AI 正在分析你的面试表现...</p>
          </div>
          <div className="flex gap-1 justify-center">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="text-slate-700 font-medium">报告生成失败</p>
          <Button onClick={generateReport}>重试</Button>
        </div>
      </div>
    );
  }

  const totalScore = report.total_score;
  const scoreColor = totalScore >= 80 ? "text-green-600" : totalScore >= 65 ? "text-amber-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-900">面试评估报告</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/interview/quick-start")}>
            <RotateCcw className="w-4 h-4" />再练一次
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Total score */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-6">
            <div className="relative flex items-center justify-center shrink-0">
              <ScoreRing score={totalScore} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${scoreColor}`}>{totalScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {totalScore >= 80 ? "表现优秀 🎉" : totalScore >= 65 ? "表现良好 👍" : "继续加油 💪"}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {totalScore >= 80 ? "整体表现出色，有较强的面试竞争力" :
                  totalScore >= 65 ? "基本达到水准，有一些可以改进的空间" :
                    "需要加强练习，建议针对薄弱点重点突破"}
              </p>
              {report.weakness_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {report.weakness_tags.map((tag) => (
                    <span key={tag} className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dimension scores */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />各维度评分
          </h2>
          <div className="space-y-3">
            {Object.entries(report.score_dims || {}).map(([dim, score]) => {
              const s = score || 0;
              const barColor = s >= 80 ? "bg-green-500" : s >= 65 ? "bg-amber-500" : "bg-red-400";
              return (
                <div key={dim} className="flex items-center gap-3">
                  <span className="text-base">{DIM_ICONS[dim] || "📊"}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{dim}</span>
                      <span className={`font-bold ${s >= 80 ? "text-green-600" : s >= 65 ? "text-amber-600" : "text-red-500"}`}>{s}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${s}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highlights */}
        {report.highlights.length > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
            <h2 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />表现亮点
            </h2>
            <ul className="space-y-2">
              {report.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <Star className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {report.improvements.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />改进建议
            </h2>
            <div className="space-y-3">
              {report.improvements.map((imp, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{imp.issue}</p>
                      <p className="text-xs text-indigo-600 mt-1 flex items-start gap-1">
                        <Zap className="w-3 h-3 shrink-0 mt-0.5" />
                        {imp.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question scores with thumbs up/down */}
        {report.question_scores && report.question_scores.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">逐题点评</h2>
            <div className="space-y-3">
              {report.question_scores.slice(0, 8).map((qs, i) => {
                const qaId = getQaIdForScore(i);
                const thumbVal = qaId ? thumbsMap[qaId] : undefined;
                return (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-medium text-slate-800 flex-1">{qs.question}</p>
                      {qs.scoringExcluded ? (
                        <span className="text-xs font-medium shrink-0 text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          不计入总分
                        </span>
                      ) : (
                        <span className={`text-sm font-bold shrink-0 ${(qs.score ?? 0) >= 80 ? "text-green-600" : (qs.score ?? 0) >= 60 ? "text-amber-600" : "text-red-500"}`}>
                          {qs.score ?? "—"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{qs.feedback}</p>
                    {qaId && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 mr-1">这道题有帮助吗？</span>
                        <button
                          onClick={() => handleThumbsClick(qaId, true)}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            thumbVal === true
                              ? "bg-green-100 border-green-300 text-green-700"
                              : "border-slate-200 text-slate-400 hover:border-green-300 hover:text-green-600"
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          有帮助
                        </button>
                        <button
                          onClick={() => handleThumbsClick(qaId, false)}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            thumbVal === false
                              ? "bg-red-100 border-red-300 text-red-600"
                              : "border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500"
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          不合适
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Flywheel Feedback Section ===== */}
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-indigo-900">帮助平台变得更好</h2>
          </div>
          <p className="text-xs text-indigo-600 mb-5">你的反馈将分析「哪里答不好、为什么」，蒸馏为改进追问策略，帮助后续用户获得更精准的面试训练</p>

          {ratingSubmitted ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <p className="font-semibold text-slate-800">感谢你的反馈！</p>
              <p className="text-sm text-slate-500">
                {distillTriggered
                  ? "已收到授权，后台正在分析本次弱项并蒸馏改进追问策略（通常数分钟内完成）"
                  : "感谢反馈，你的评分已记录"}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Star rating */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">整体训练质量评分</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          star <= (hoverRating || userRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="ml-2 text-sm text-slate-500 self-center">
                      {["", "太难了", "一般般", "还不错", "很有帮助", "非常棒！"][userRating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Text feedback */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  主观反馈（选填）
                </label>
                <textarea
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                  placeholder="哪些问题追得很准？哪些感觉不太对？自由描述..."
                  rows={3}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>

              {/* Consent */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  数据授权
                </p>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    consentToShare === true ? "bg-indigo-50 border-indigo-300" : "bg-white border-slate-200 hover:border-slate-300"
                  }`}>
                    <input
                      type="radio"
                      name="consent"
                      checked={consentToShare === true}
                      onChange={() => setConsentToShare(true)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">同意共享（推荐）</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        允许将本次面试的 Q&A + 方向标签蒸馏为社区经验，帮助所有同学。个人信息不会公开。
                      </p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    consentToShare === false ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200 hover:border-slate-300"
                  }`}>
                    <input
                      type="radio"
                      name="consent"
                      checked={consentToShare === false}
                      onChange={() => setConsentToShare(false)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">仅脱敏统计</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        只记录弱点标签权重和问题有效性统计，不保留个人信息或对话内容。
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleSubmitRating}
                disabled={consentToShare === null || submittingRating}
                className="w-full h-11"
              >
                {submittingRating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />提交中...</>
                ) : (
                  <><Database className="w-4 h-4" />提交反馈，助力飞轮</>
                )}
              </Button>
              {consentToShare === null && (
                <p className="text-xs text-center text-slate-400">请先选择数据授权方式</p>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex gap-3 pb-10">
          <Button onClick={() => router.push("/interview/quick-start")} className="flex-1 h-12 text-base">
            <RotateCcw className="w-4 h-4" />再练一次
          </Button>
          <Button variant="outline" onClick={() => router.push("/profile/edit")} className="flex-1 h-12 text-base">
            完善档案
          </Button>
        </div>
      </main>
    </div>
  );
}
