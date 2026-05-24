"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Brain, ArrowLeft, Check, Zap, Crown, Lock, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PricingPage() {
  const { data: session, update } = useSession();
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isPro = session?.user?.tier === "pro";

  const handlePromo = async () => {
    if (!promoCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        await update({ tier: "pro" });
        setTimeout(() => { window.location.reload(); }, 800);
      } else {
        setError(data.error || "兑换失败");
      }
    } finally {
      setLoading(false);
    }
  };

  const FREE_FEATURES = [
    "每日3次模拟面试",
    "通用面试方案（夏令营/保研）",
    "基础追问策略",
    "DeepSeek AI（免费模型）",
    "基础评估报告",
  ];

  const PRO_FEATURES = [
    "无限次模拟面试",
    "导师定制方案（朱军组等）",
    "深度追问 + RAG知识库",
    "Claude Sonnet（顶级模型）",
    "详细逐题点评 + 薄弱点追踪",
    "跨session弱点记忆",
    "简历AI解析",
    "优先技术支持",
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">升级方案</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">选择适合你的方案</h1>
          <p className="text-slate-500 text-lg">在真正的面试前，用 AI 练出你的最佳状态</p>
        </div>

        {/* Promo code section */}
        {!isPro && (
          <div className="max-w-md mx-auto mb-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-indigo-800 text-sm">有体验码？直接升级 Pro</span>
            </div>
            {success ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />已成功升级为 Pro！
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="输入体验码"
                  className="flex-1 bg-white"
                  onKeyDown={(e) => { if (e.key === "Enter") handlePromo(); }}
                />
                <Button onClick={handlePromo} disabled={loading || !promoCode.trim()} size="sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "兑换"}
                </Button>
              </div>
            )}
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        )}

        {isPro && (
          <div className="max-w-md mx-auto mb-8 bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
              <Crown className="w-4 h-4" />你已是 Pro 用户！
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-slate-500" />
              </div>
              <span className="font-bold text-slate-900">免费版</span>
            </div>
            <div className="flex items-baseline gap-1 my-4">
              <span className="text-3xl font-bold text-slate-900">¥0</span>
              <span className="text-slate-400 text-sm">/ 永久</span>
            </div>
            <Button variant="outline" className="w-full mb-6" disabled={!session?.user}>
              {!session?.user ? "请先登录" : "当前方案"}
            </Button>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-slate-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-indigo-600 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
              推荐
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-300" />
              </div>
              <span className="font-bold text-white">Pro 版</span>
            </div>
            <div className="flex items-baseline gap-1 my-4">
              <span className="text-3xl font-bold text-white">¥68</span>
              <span className="text-indigo-300 text-sm">/ 月</span>
            </div>

            {isPro ? (
              <Button className="w-full mb-6 bg-white text-indigo-700 hover:bg-indigo-50">
                <Crown className="w-4 h-4" />当前方案
              </Button>
            ) : (
              <div className="mb-6 space-y-2">
                <Button className="w-full bg-white text-indigo-700 hover:bg-indigo-50">
                  <Lock className="w-4 h-4" />立即充值（演示）
                </Button>
                <p className="text-indigo-300 text-xs text-center">演示版：使用体验码 DEMO2026 免费获取</p>
              </div>
            )}

            <ul className="space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-indigo-100">
                  <Check className="w-4 h-4 text-indigo-300 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-12 space-y-4">
          <h2 className="text-center font-semibold text-slate-700 mb-6">常见问题</h2>
          {[
            { q: "体验码在哪里获取？", a: "评委审查用体验码：DEMO2026，可免费体验 Pro 全部功能。" },
            { q: "Pro 版和免费版的最大区别是什么？", a: "Pro 版使用 Claude Sonnet，追问深度和评估报告质量显著更好；同时支持导师定制方案和跨 session 弱点追踪。" },
            { q: "面试数据会被保存吗？", a: "所有数据存储在服务器本地，不会用于任何 AI 训练。你可以随时删除账号和数据。" },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-900 text-sm mb-1">{q}</p>
              <p className="text-slate-500 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
