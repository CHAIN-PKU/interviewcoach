"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain, ArrowLeft, Plus, Trash2, Save, Upload,
  Loader2, CheckCircle2, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Experience {
  projectName: string;
  timeRange: string;
  role: "core" | "participant";
  methods: string;
  outcome: string;
  contributionSummary: string;
}

export default function ProfileEditPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [expandedExp, setExpandedExp] = useState<number | null>(0);

  const [form, setForm] = useState({
    university: "",
    major: "",
    gpa: "",
    targetSchool: "",
    targetAdvisor: "",
    advisorDirection: "",
    strengths: ["", ""],
    concerns: ["", ""],
    experiences: [] as Experience[],
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        if (profile) {
          setForm({
            university: profile.university || "",
            major: profile.major || "",
            gpa: profile.gpa || "",
            targetSchool: profile.targetSchool || "",
            targetAdvisor: profile.targetAdvisor || "",
            advisorDirection: profile.advisorDirection || "",
            strengths: JSON.parse(profile.strengths || "[]").concat(["", ""]).slice(0, 4),
            concerns: JSON.parse(profile.concerns || "[]").concat(["", ""]).slice(0, 4),
            experiences: profile.experiences || [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const { parsed } = await res.json();
      if (parsed) {
        setForm((prev) => ({
          ...prev,
          university: parsed.university || prev.university,
          major: parsed.major || prev.major,
          gpa: parsed.gpa || prev.gpa,
          strengths: (parsed.strengths || []).concat(["", ""]).slice(0, 4),
          concerns: (parsed.concerns_guess || []).concat(["", ""]).slice(0, 4),
          experiences: parsed.experiences || prev.experiences,
        }));
      }
    } finally {
      setUploading(false);
    }
  };

  const addExperience = () => {
    setForm((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        { projectName: "", timeRange: "", role: "participant", methods: "", outcome: "", contributionSummary: "" },
      ],
    }));
    setExpandedExp(form.experiences.length);
  };

  const updateExp = (i: number, field: keyof Experience, value: string) => {
    setForm((prev) => {
      const exps = [...prev.experiences];
      exps[i] = { ...exps[i], [field]: value };
      return { ...prev, experiences: exps };
    });
  };

  const removeExp = (i: number) => {
    setForm((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((_, idx) => idx !== i),
    }));
  };

  const handleSave = async () => {
    setSaveError("");
    // Required field validation
    if (!form.university.trim() || !form.major.trim() || !form.targetSchool.trim() || !form.advisorDirection.trim()) {
      setSaveError("请填写必填项：院校、专业、目标院校、研究方向");
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          strengths: form.strengths.filter(Boolean),
          concerns: form.concerns.filter(Boolean),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-900">面试档案</span>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "已保存" : "保存档案"}
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Resume upload */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-800 text-sm mb-0.5">上传简历自动填写</p>
              <p className="text-xs text-indigo-600 mb-3">支持 PDF/TXT，AI 自动解析填入下方表单。请上传脱敏简历。</p>
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                <div className="inline-flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "解析中..." : "选择文件"}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">基本信息</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>院校 <span className="text-red-500">*</span></Label>
              <Input placeholder="如：北京大学" value={form.university} onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))} className={!form.university.trim() && saveError ? "border-red-300" : ""} />
            </div>
            <div className="space-y-1.5">
              <Label>专业 <span className="text-red-500">*</span></Label>
              <Input placeholder="如：计算机科学与技术" value={form.major} onChange={(e) => setForm((p) => ({ ...p, major: e.target.value }))} className={!form.major.trim() && saveError ? "border-red-300" : ""} />
            </div>
            <div className="space-y-1.5">
              <Label>GPA / 排名 <span className="text-slate-400 text-xs font-normal">选填</span></Label>
              <Input placeholder="如：3.9/4.0（专业前5%）" value={form.gpa} onChange={(e) => setForm((p) => ({ ...p, gpa: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Target */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">目标信息</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>目标院校 <span className="text-red-500">*</span></Label>
              <Input placeholder="如：清华大学" value={form.targetSchool} onChange={(e) => setForm((p) => ({ ...p, targetSchool: e.target.value }))} className={!form.targetSchool.trim() && saveError ? "border-red-300" : ""} />
            </div>
            <div className="space-y-1.5">
              <Label>目标导师 <span className="text-slate-400 text-xs font-normal">选填</span></Label>
              <Input placeholder="如：朱军" value={form.targetAdvisor} onChange={(e) => setForm((p) => ({ ...p, targetAdvisor: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>研究方向 <span className="text-red-500">*</span></Label>
              <Input placeholder="如：扩散模型 / 贝叶斯深度学习" value={form.advisorDirection} onChange={(e) => setForm((p) => ({ ...p, advisorDirection: e.target.value }))} className={!form.advisorDirection.trim() && saveError ? "border-red-300" : ""} />
            </div>
          </div>
        </div>

        {/* Self assessment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-1">自我评估</h2>
          <p className="text-sm text-slate-500 mb-4">AI 追问策略会基于这里的内容优化</p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">核心优势</Label>
              <div className="space-y-2">
                {form.strengths.map((s, i) => (
                  <Input key={i} placeholder={`优势 ${i + 1}`} value={s} onChange={(e) => {
                    const arr = [...form.strengths];
                    arr[i] = e.target.value;
                    setForm((p) => ({ ...p, strengths: arr }));
                  }} />
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">担心被追问的点</Label>
              <div className="space-y-2">
                {form.concerns.map((c, i) => (
                  <Input key={i} placeholder={`担心点 ${i + 1}`} value={c} onChange={(e) => {
                    const arr = [...form.concerns];
                    arr[i] = e.target.value;
                    setForm((p) => ({ ...p, concerns: arr }));
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Experiences */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">科研经历</h2>
              <p className="text-xs text-slate-400 mt-0.5">按重要度排序，第一个优先展示</p>
            </div>
            <Button variant="outline" size="sm" onClick={addExperience}>
              <Plus className="w-4 h-4" />添加经历
            </Button>
          </div>

          {form.experiences.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
              还没有科研经历，点击上方按钮添加
            </div>
          )}

          <div className="space-y-3">
            {form.experiences.map((exp, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setExpandedExp(expandedExp === i ? null : i)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exp.role === "core" ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                      {exp.role === "core" ? "主要负责人" : "参与者"}
                    </span>
                    <span className="font-medium text-sm text-slate-900">
                      {exp.projectName || `经历 ${i + 1}`}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 ml-2">
                    <button type="button" onClick={() => removeExp(i)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setExpandedExp(expandedExp === i ? null : i)} className="text-slate-400 p-1">
                      {expandedExp === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {expandedExp === i && (
                  <div className="p-4 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>项目名称</Label>
                        <Input placeholder="如：扩散模型推理加速" value={exp.projectName} onChange={(e) => updateExp(i, "projectName", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>时间段</Label>
                        <Input placeholder="如：2024.3-至今" value={exp.timeRange} onChange={(e) => updateExp(i, "timeRange", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>角色</Label>
                      <div className="flex gap-2">
                        {(["core", "participant"] as const).map((r) => (
                          <button key={r} type="button" onClick={() => updateExp(i, "role", r)}
                            className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${exp.role === r ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                            {r === "core" ? "主要负责人" : "参与者"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>使用方法/技术</Label>
                      <Input placeholder="如：DDPM, DDIM, PyTorch, CUDA" value={exp.methods} onChange={(e) => updateExp(i, "methods", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>成果</Label>
                      <Input placeholder="如：推理加速约30%，论文撰写中" value={exp.outcome} onChange={(e) => updateExp(i, "outcome", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>一句话贡献描述</Label>
                      <Input placeholder="如：独立负责采样算法对比实验" value={exp.contributionSummary} onChange={(e) => updateExp(i, "contributionSummary", e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pb-10">
          {saveError && (
            <p className="text-red-500 text-sm w-full mb-2">{saveError}</p>
          )}
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 text-base">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : saved ? <><CheckCircle2 className="w-4 h-4" />已保存</> : <><Save className="w-4 h-4" />保存档案</>}
          </Button>
          <Button variant="outline" onClick={() => router.push("/interview/quick-start")} className="flex-1 h-12 text-base">
            开始面试训练 →
          </Button>
        </div>
      </main>
    </div>
  );
}
