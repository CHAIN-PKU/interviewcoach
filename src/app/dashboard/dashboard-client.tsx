"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";

export function DashboardClient() {
  const { update } = useSession();
  const [proCode, setProCode] = useState("");
  const [proLoading, setProLoading] = useState(false);
  const [proError, setProError] = useState("");
  const [proSuccess, setProSuccess] = useState(false);
  const [showProInput, setShowProInput] = useState(false);

  const redeemCode = async () => {
    if (!proCode.trim()) return;
    setProLoading(true);
    setProError("");

    const res = await fetch("/api/auth/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: proCode.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setProError(data.error || "兑换失败");
    } else {
      setProSuccess(true);
      await update({ tier: "pro" });
      setTimeout(() => window.location.reload(), 800);
    }
    setProLoading(false);
  };

  if (proSuccess) {
    return (
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-amber-700 font-medium text-sm">
          🎉 Pro 已解锁！正在刷新...
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4" style={{ backgroundColor: "#fffbeb" }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-amber-800 text-sm">
              解锁 Pro — 使用 Claude Sonnet 进行更精准的追问
            </span>
          </div>
          <p className="text-xs text-amber-600">
            输入体验码 DEMO2026 免费体验
          </p>
        </div>
        {!showProInput && (
          <button
            onClick={() => setShowProInput(true)}
            className="shrink-0 text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            输入体验码
          </button>
        )}
      </div>

      {showProInput && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="输入体验码..."
            value={proCode}
            onChange={(e) => {
              setProCode(e.target.value.toUpperCase());
              setProError("");
            }}
            className="flex-1 h-9 px-3 text-sm rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
            onKeyDown={(e) => e.key === "Enter" && redeemCode()}
          />
          <button
            onClick={redeemCode}
            disabled={proLoading || !proCode.trim()}
            className="h-9 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {proLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            兑换
          </button>
        </div>
      )}

      {proError && (
        <p className="text-xs text-red-600 mt-1.5">{proError}</p>
      )}
    </div>
  );
}
