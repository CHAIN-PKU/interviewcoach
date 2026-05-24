"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain, ArrowLeft, Zap, BookOpen, GraduationCap, Loader2,
  Sparkles, Clock, Target, Database, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INTERVIEW_TYPES = [
  { id: "夏令营面试", label: "夏令营面试", icon: "☀️", desc: "8分钟汇报 + 7分钟问答" },
  { id: "保研复试", label: "保研复试", icon: "🎓", desc: "自我介绍 + 科研追问 + 基础考察" },
  { id: "直博面试", label: "直博面试", icon: "🔬", desc: "深度科研追问 + 研究规划" },
];

const DIRECTIONS = ["扩散模型", "贝叶斯深度学习", "大语言模型", "具身智能", "计算机视觉", "自然语言处理", "强化学习", "其他"];

interface Personalization {
  headline: string;
  rationale: string[];
  focusAreas: string[];
  stagePlan: Array<{ name: string; duration_min: number; keywords: string[] }>;
  distilledPatternsUsed: number;
  communityInsightsUsed: number;
  referencesUsed?: string[];
}

interface UserProfile {
  advisorDirection?: string | null;
  profileSummary?: string | null;
  experiences?: Array<{ projectName?: string; methods?: string | null }>;
}

/** Rough check: does profile text suggest a different research direction than user picked? */
function detectDirectionConflict(
  profile: UserProfile | null,
  selectedDirection: string
): string | null {
  if (!profile || !selectedDirection.trim()) return null;

  const dir = selectedDirection.trim();
  const corpus = [
    profile.advisorDirection || "",
    profile.profileSummary || "",
    ...(profile.experiences || []).map((e) => `${e.projectName || ""} ${e.methods || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  const dirLower = dir.toLowerCase();
  if (corpus.includes(dirLower) || dirLower.split(/\s+/).some((w) => w.length > 1 && corpus.includes(w))) {
    return null;
  }

  const hints: Array<{ keys: string[]; label: string }> = [
    { keys: ["扩散", "ddpm", "ddim", "score matching"], label: "扩散模型" },
    { keys: ["具身", "机器人", "ros", "sim2real"], label: "具身智能" },
    { keys: ["贝叶斯", "变分", "vae"], label: "贝叶斯深度学习" },
    { keys: ["大语言", "llm", "transformer", "对齐"], label: "大语言模型" },
    { keys: ["强化学习", "rl", "ppo"], label: "强化学习" },
  ];

  for (const h of hints) {
    if (h.keys.some((k) => corpus.includes(k)) && h.label !== dir) {
      return `你的档案/简历主要体现「${h.label}」相关经历，但本次选择了「${dir}」。面试将以你选择的训练方向为主；若与简历不一致，以你在对话中的说明为准。`;
    }
  }

  if (profile.advisorDirection && profile.advisorDirection !== dir) {
    return `档案中记录的方向是「${profile.advisorDirection}」，与本次选择的「${dir}」不一致。将以你本次选择为准；追问时会以你在对话中的说明为准，不会假定简历含有未写明的项目。`;
  }

  return null;
}

export default function QuickStartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [interviewType, setInterviewType] = useState("夏令营面试");
  const [targetSchool, setTargetSchool] = useState("清华大学");
  const [targetAdvisor, setTargetAdvisor] = useState("朱军");
  const [direction, setDirection] = useState("扩散模型");
  const [customDirection, setCustomDirection] = useState("");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [personalization, setPersonalization] = useState<Personalization | null>(null);
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const resolvedDirection = direction === "其他" ? customDirection : direction;

  const directionConflict = useMemo(
    () => detectDirectionConflict(userProfile, resolvedDirection),
    [userProfile, resolvedDirection]
  );

  useEffect(() => {
    if (step !== 2) return;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUserProfile(data?.profile || null))
      .catch(() => setUserProfile(null));
  }, [step]);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType,
          targetSchool,
          targetAdvisor,
          direction: resolvedDirection,
          mode: "practice",
        }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "方案生成失败，请稍后重试");
      }
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setPersonalization(data.personalization as Personalization);
        setStep(3);
      } else {
        throw new Error("未收到有效方案，请重试");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "方案生成失败";
      setError(
        msg.includes("TimeoutError") || msg.includes("timed out")
          ? "AI 编排超时（OpenRouter 响应慢），请稍后重试。系统会自动使用预置模板兜底。"
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const totalMinutes = personalization?.stagePlan.reduce((s, x) => s + x.duration_min, 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">快速开始</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-indigo-600" : "bg-slate-200"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">选择面试类型</h1>
              <p className="text-slate-500 text-sm">AI 将根据实际面试结构生成个性化训练方案</p>
            </div>

            <div className="space-y-3">
              {INTERVIEW_TYPES.map((t) => (
                <button key={t.id} type="button" onClick={() => setInterviewType(t.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${interviewType === t.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <div className="font-semibold text-slate-900">{t.label}</div>
                    <div className="text-xs text-slate-500">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <Button onClick={() => setStep(2)} className="w-full h-12 text-base">
              下一步 →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">目标设置</h1>
              <p className="text-slate-500 text-sm">AI 将结合 RAG 经验索引 + 社区蒸馏策略编排你的专属流程</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>目标院校</Label>
                  <Input value={targetSchool} onChange={(e) => setTargetSchool(e.target.value)} placeholder="如：清华大学" />
                </div>
                <div className="space-y-1.5">
                  <Label>目标导师（选填）</Label>
                  <Input value={targetAdvisor} onChange={(e) => setTargetAdvisor(e.target.value)} placeholder="如：朱军" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>研究方向</Label>
                <div className="flex flex-wrap gap-2">
                  {DIRECTIONS.map((d) => (
                    <button key={d} type="button" onClick={() => setDirection(d)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${direction === d ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      {d}
                    </button>
                  ))}
                </div>
                {direction === "其他" && (
                  <Input value={customDirection} onChange={(e) => setCustomDirection(e.target.value)} placeholder="请输入你的研究方向..." className="mt-2" />
                )}
              </div>
            </div>

            {directionConflict && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                ⚠️ {directionConflict}
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">← 上一步</Button>
              <Button onClick={handleGenerate} disabled={loading || (direction === "其他" && !customDirection.trim())} className="flex-1 h-12 text-base">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />AI 编排中（约 20–40 秒）...</> : <><Sparkles className="w-4 h-4" />生成个性化方案</>}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
            )}
          </div>
        )}

        {step === 3 && personalization && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-medium text-indigo-100">AI 个性化 Harness 已就绪</span>
              </div>
              <h1 className="text-xl font-bold mb-3">{personalization.headline}</h1>
              <div className="flex flex-wrap gap-2">
                {personalization.focusAreas.slice(0, 4).map((f) => (
                  <span key={f} className="text-xs bg-white/15 px-2.5 py-1 rounded-full">{f}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <Clock className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-slate-900">{totalMinutes}′</div>
                <div className="text-[10px] text-slate-500">总时长</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <Database className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-slate-900">{personalization.distilledPatternsUsed}</div>
                <div className="text-[10px] text-slate-500">飞轮洞察</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <BookOpen className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-slate-900">{personalization.communityInsightsUsed}</div>
                <div className="text-[10px] text-slate-500">社区经验</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />阶段编排
              </h2>
              {personalization.stagePlan.map((s, i) => (
                <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm">{s.name}</span>
                      <span className="text-xs text-slate-400">{s.duration_min} 分钟</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {s.keywords.map((k) => (
                        <span
                          key={k}
                          className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-md"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-medium text-amber-800">为什么这样设计？</p>
              <ul className="space-y-1">
                {personalization.rationale.map((r, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" />{r}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => sessionId && router.push(`/interview/${sessionId}`)}
              className="w-full h-12 text-base"
            >
              开始面试 <Zap className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
