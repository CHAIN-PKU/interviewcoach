"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brain, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginClientProps {
  csrfToken: string;
  callbackUrl: string;
}

export function LoginClient({ csrfToken, callbackUrl }: LoginClientProps) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">(
    searchParams.get("tab") === "register" ? "register" : "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const fillDemo = (email: string) => {
    setForm({ name: "", email, password: "Demo2026!" });
    setTab("login");
    setError("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("已注册")) {
          setTab("login");
          setError("该邮箱已注册，已切换到登录，请直接登录");
        } else {
          setError(data.error || "注册失败");
        }
        return;
      }

      setTab("login");
      setError("注册成功，请点击登录");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">
              InterviewCoach
            </span>
          </div>
          <p className="text-slate-500 text-sm">AI 驱动的个性化面试训练平台</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                    : "text-slate-500 hover:text-slate-700 bg-slate-50/50"
                }`}
              >
                {t === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            /* Native form POST — works even if client JS fails */
            <form
              key={`login-${form.email}-${form.password}`}
              action="/api/auth/callback/credentials"
              method="POST"
              className="p-6 space-y-4"
            >
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="callbackUrl" value={callbackUrl} />

              <div className="space-y-1.5">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="demo@interviewcoach.ai"
                  defaultValue={form.email}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Demo2026!"
                    defaultValue={form.password}
                    required
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base">
                登录
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setTab("register");
                    setError("");
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  还没有账号？免费注册 →
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">姓名（选填）</Label>
                <Input
                  id="name"
                  placeholder="你的名字"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-email">邮箱</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-password">密码（至少 6 位）</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="设置密码"
                  value={form.password}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, password: e.target.value }))
                  }
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div
                  className={`text-sm rounded-lg px-3 py-2 border ${
                    error.includes("成功") || error.includes("切换")
                      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                      : "text-red-600 bg-red-50 border-red-100"
                  }`}
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  "创建账号"
                )}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <p className="text-sm text-indigo-700 font-medium mb-2">
            评委快速体验（点击自动填入）
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fillDemo("demo@interviewcoach.ai")}
              className="text-left text-xs bg-white border border-indigo-100 rounded-lg px-3 py-2 hover:border-indigo-300 transition-colors"
            >
              <span className="font-mono text-indigo-700">
                demo@interviewcoach.ai
              </span>
              <span className="text-indigo-500 ml-2">快速体验 · Free</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("zs@interviewcoach.ai")}
              className="text-left text-xs bg-white border border-indigo-100 rounded-lg px-3 py-2 hover:border-indigo-300 transition-colors"
            >
              <span className="font-mono text-indigo-700">
                zs@interviewcoach.ai
              </span>
              <span className="text-indigo-500 ml-2">完整简历 · Pro</span>
            </button>
            <p className="text-xs text-indigo-500">密码均为 Demo2026!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
