"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain, Mic, MicOff, Send, Volume2, VolumeX,
  ChevronRight, Clock, ArrowLeft, Loader2, AlertCircle,
  CheckCircle2, MessageSquare, Flag, Lightbulb, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface StageInfo {
  id: string;
  name: string;
  type: string;
  duration_min: number;
  strict_timer: boolean;
}

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [stageInfo, setStageInfo] = useState<StageInfo | null>(null);
  const [harnessName, setHarnessName] = useState("");
  const [allStages, setAllStages] = useState<StageInfo[]>([]);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [stageStart, setStageStart] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [sttActive, setSttActive] = useState(false);
  const [sttTranscribing, setSttTranscribing] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [warned60s, setWarned60s] = useState(false);
  const [warned30s, setWarned30s] = useState(false);
  const pendingSystemHintRef = useRef<string | undefined>(undefined);
  const [autoAdvanced, setAutoAdvanced] = useState(false);
  const [mode, setMode] = useState("practice");
  const [userDirection, setUserDirection] = useState("");
  const [personalization, setPersonalization] = useState<{
    headline?: string;
    distilledPatternsUsed?: number;
    stagePlan?: Array<{ name: string; duration_min: number }>;
  } | null>(null);
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<unknown>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── FIX 15: prevent StrictMode double-invoke ──
  const initCalledRef = useRef(false);
  const stageInfoRef = useRef<StageInfo | null>(null);
  const elapsedRef = useRef(0);
  const advancingRef = useRef(false);
  const lastAdvanceAtRef = useRef(0);
  const streamingRef = useRef(false);
  const streamingAssistantIdxRef = useRef<number | null>(null);
  const pendingTimerNoticesRef = useRef<string[]>([]);

  // Keep refs in sync
  useEffect(() => { stageInfoRef.current = stageInfo; }, [stageInfo]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);
  useEffect(() => { advancingRef.current = advancing; }, [advancing]);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);

  const flushPendingTimerNotices = () => {
    const notices = pendingTimerNoticesRef.current.splice(0);
    if (notices.length === 0) return;
    setMessages((prev) => [
      ...prev,
      ...notices.map((content) => ({
        role: "system" as const,
        content,
        timestamp: Date.now(),
      })),
    ]);
  };

  const updateStreamingAssistant = (content: string) => {
    setMessages((prev) => {
      let idx = streamingAssistantIdxRef.current;
      if (idx == null || idx < 0 || idx >= prev.length || prev[idx]?.role !== "assistant") {
        idx = prev.map((m, i) => (m.role === "assistant" ? i : -1)).filter((i) => i >= 0).at(-1) ?? -1;
      }
      if (idx < 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], content };
      return updated;
    });
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  // Timer + auto-advance + 60s warning
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - stageStart) / 1000);
      setElapsed(secs);

      const stage = stageInfoRef.current;
      if (!stage || isComplete) return;
      const totalSecs = stage.duration_min * 60;
      const remaining = totalSecs - secs;

      // 60s warning
      if (remaining <= 60 && remaining > 30 && !warned60s) {
        setWarned60s(true);
        pendingSystemHintRef.current = `${stage.name}阶段还剩约1分钟，请催促用户简要作答并准备收尾。`;
        const notice = `⏱ ${stage.name}还剩约1分钟，请简要作答。`;
        if (streamingRef.current) pendingTimerNoticesRef.current.push(notice);
        else setMessages((prev) => [...prev, { role: "system", content: notice, timestamp: Date.now() }]);
      }

      if (remaining <= 30 && remaining > 0 && !warned30s) {
        setWarned30s(true);
        pendingSystemHintRef.current = `${stage.name}阶段即将结束，请做最后一句追问或收尾。`;
        const notice = `⏱ 时间快到了，请尽快作答！`;
        if (streamingRef.current) pendingTimerNoticesRef.current.push(notice);
        else setMessages((prev) => [...prev, { role: "system", content: notice, timestamp: Date.now() }]);
      }

      // Auto-advance when time is fully up (not before)
      if (secs >= totalSecs && totalSecs > 0 && !autoAdvanced && !advancingRef.current && stage.strict_timer) {
        setAutoAdvanced(true);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageStart, isComplete, warned60s, warned30s, autoAdvanced]);

  // Trigger auto-advance outside the interval to avoid stale closure issues
  useEffect(() => {
    if (autoAdvanced && !advancingRef.current && !isComplete) {
      const stageName = stageInfoRef.current?.name || "当前阶段";
      setMessages((prev) => [...prev, {
        role: "system",
        content: `⏱ ${stageName}时间到，自动进入下一阶段。`,
        timestamp: Date.now(),
      }]);
      handleAdvanceStage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanced]);

  // FIX 15: init once only
  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;

    const initInterview = async () => {
      try {
        const res = await fetch("/api/harness/session?sessionId=" + sessionId);
        if (res.ok) {
          const data = await res.json();
          const stages: StageInfo[] = data.harness?.stages || [];
          if (data.harness) {
            setHarnessName(data.harness.name || "模拟面试");
            setAllStages(stages);
          }
          if (data.mode) setMode(data.mode);
          if (data.matchedBy?.direction) setUserDirection(data.matchedBy.direction);
          if (data.personalization) setPersonalization(data.personalization);

          if (data.status === "completed" || data.engine?.isComplete) {
            setIsComplete(true);
            setInitLoading(false);
            return;
          }

          const idx = data.engine?.currentStageIndex ?? 0;
          const stage = stages[idx] || stages[0] || null;
          setCurrentStageIdx(idx);
          setStageInfo(stage);
          if (data.engine?.stageStartTime) {
            setStageStart(data.engine.stageStartTime);
          }

          const history = data.engine?.dialogHistory || [];
          if (history.length > 0) {
            setMessages(
              history.map((m: { role: string; content: string }, i: number) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
                timestamp: Date.now() - (history.length - i) * 1000,
              }))
            );
            setInitLoading(false);
            return;
          }
        }
        await sendMessage("__STAGE_START__");
      } finally {
        setInitLoading(false);
      }
    };
    initInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!ttsEnabled || typeof window === "undefined" || !text.trim()) return;

    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    // Also stop browser TTS if it's somehow still running
    window.speechSynthesis?.cancel();

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      });
      if (!res.ok) throw new Error("TTS API failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
      };
      audio.play().catch(() => {
        console.warn("[TTS] autoplay blocked");
      });
    } catch {
      console.warn("[TTS] API unavailable");
    }
  }, [ttsEnabled]);

  const sendMessage = async (content: string, systemHint?: string) => {
    const isStart = content === "__STAGE_START__";
    const userMessage = isStart ? "" : content;
    const hint = systemHint || pendingSystemHintRef.current;
    pendingSystemHintRef.current = undefined;
    const presentationMonologue =
      stageInfoRef.current?.type === "presentation" && !isStart;

    if (!isStart) {
      setMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: Date.now() }]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }

    setStreaming(true);
    setError("");

    const apiMessage = isStart ? "__STAGE_START__" : userMessage;

    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: apiMessage, systemHint: hint }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "请求失败");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      let silentTurn = false;

      if (!presentationMonologue) {
        setMessages((prev) => {
          streamingAssistantIdxRef.current = prev.length;
          return [...prev, { role: "assistant", content: "", timestamp: Date.now() }];
        });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.silent) {
              silentTurn = true;
            }
            if (parsed.token) {
              aiContent += parsed.token;
              updateStreamingAssistant(aiContent);
            }
            if (parsed.done && parsed.finalContent) {
              aiContent = parsed.finalContent;
              updateStreamingAssistant(aiContent);
            }
          } catch { /* skip */ }
        }
      }

      if (silentTurn) {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: "✓ 汇报记录中，考官不打断。继续说完后点击「下一阶段」或等计时结束。",
            timestamp: Date.now(),
          },
        ]);
      } else if (aiContent) {
        speak(aiContent);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "发生错误，请重试");
    } finally {
      streamingAssistantIdxRef.current = null;
      setStreaming(false);
      flushPendingTimerNotices();
    }
  };

  const handleAdvanceStage = useCallback(async () => {
    if (advancingRef.current) return;
    const now = Date.now();
    if (now - lastAdvanceAtRef.current < 3000) return;
    lastAdvanceAtRef.current = now;

    const wasPresentation = stageInfoRef.current?.type === "presentation";

    setAdvancing(true);
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "advance_stage" }),
      });
      const data = await res.json();

      if (data.isComplete) {
        setIsComplete(true);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "面试已全部结束，感谢你的参与！",
          timestamp: Date.now(),
        }]);
      } else if (data.nextStage) {
        const nextIdx = allStages.findIndex((s) => s.id === data.nextStage.id);
        setCurrentStageIdx(nextIdx >= 0 ? nextIdx : currentStageIdx + 1);
        setStageInfo(data.nextStage);
        setStageStart(Date.now());
        setWarned60s(false);
        setWarned30s(false);
        setAutoAdvanced(false);
        setMessages([]);
        await sendMessage("__STAGE_START__");
      }
    } finally {
      setAdvancing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, allStages, currentStageIdx, messages]);

  // "I'm done presenting" — advance stage immediately
  const handlePresentationDone = () => {
    handleAdvanceStage();
  };

  const handleGetHint = async () => {
    setHintLoading(true);
    setShowHint(false);
    setHint("");
    try {
      const res = await fetch("/api/interview/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      setHint(data.hint || "暂时无法获取提示");
      setShowHint(true);
    } finally {
      setHintLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.sessionId) router.push(`/report/${data.sessionId}`);
    } finally {
      setReportLoading(false);
    }
  };

  const [sttError, setSttError] = useState("");
  const [sttReviewHint, setSttReviewHint] = useState(false);

  const toggleSTT = async () => {
    if (typeof window === "undefined") return;

    // ── Stop recording ──────────────────────────────────────────────────────
    if (sttActive) {
      mediaRecorderRef.current?.stop();
      setSttActive(false);
      return;
    }

    setSttError("");
    setSttReviewHint(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick a supported MIME type
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"]
        .find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        if (blob.size < 1000) {
          setSttError("没有录到声音，请重试。");
          return;
        }

        setSttTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "audio.webm");
          form.append("sessionId", sessionId);
          const res = await fetch("/api/stt", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok || data.error) {
            setSttError(data.error ?? "语音识别失败，请重试");
          } else if (data.text) {
            setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
            setSttReviewHint(true);
          } else {
            setSttError("未识别到内容，请重试。");
          }
        } catch {
          setSttError("语音识别服务连接失败，请重试。");
        } finally {
          setSttTranscribing(false);
        }
      };

      recorder.start(200); // collect chunks every 200ms
      mediaRecorderRef.current = recorder;
      setSttActive(true);
    } catch (e: unknown) {
      const name = (e as { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setSttError("麦克风权限被拒绝，请在浏览器地址栏允许麦克风访问后刷新页面。");
      } else if (name === "NotFoundError") {
        setSttError("未检测到麦克风设备，请检查是否连接。");
      } else {
        setSttError("无法启动录音，请确认已使用 HTTPS 访问且浏览器已允许麦克风。");
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const totalSecs = stageInfo ? stageInfo.duration_min * 60 : 0;
  const remaining = Math.max(0, totalSecs - elapsed);
  const isOverTime = stageInfo && elapsed > totalSecs;
  const isPresentation = stageInfo?.type === "presentation";

  if (initLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-400 text-sm">正在准备面试，AI 生成第一题中（通常 3–10 秒）...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-300">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="w-3 h-3 text-white" />
              </div>
              <span className="font-medium text-white text-sm truncate max-w-[8rem] sm:max-w-[12rem]">{harnessName || "模拟面试"}</span>
              {userDirection && (
                <span className="text-[10px] text-indigo-300 bg-indigo-900/40 px-1.5 py-0.5 rounded-full shrink-0">{userDirection}</span>
              )}
            </div>
          </div>

          {/* Stage progress dots */}
          <div className="flex items-center gap-1.5 flex-1 max-w-xs justify-center">
            {allStages.map((s, i) => (
              <div key={s.id}
                className={`rounded-full transition-all ${
                  i < currentStageIdx ? "h-1.5 flex-1 bg-indigo-500" :
                  i === currentStageIdx ? "h-1.5 flex-1 bg-indigo-400" :
                  "h-1.5 flex-1 bg-slate-700"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Countdown timer — fixed width, never shows message text */}
            <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-mono tabular-nums shrink-0 min-w-[5.5rem] transition-colors ${
              isOverTime ? "bg-red-900/50 text-red-400" :
              remaining <= 60 ? "bg-amber-900/40 text-amber-400" :
              "bg-slate-800 text-slate-400"
            }`}>
              <Clock className="w-3 h-3 shrink-0" />
              {stageInfo ? (
                <>
                  <span>{formatTime(elapsed)}</span>
                  <span className="text-slate-600 mx-0.5">/</span>
                  <span>{formatTime(totalSecs)}</span>
                </>
              ) : "--:--"}
            </div>
            <button type="button" onClick={() => setTtsEnabled((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${ttsEnabled ? "bg-indigo-900/50 text-indigo-400" : "bg-slate-800 text-slate-500"}`}>
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Personalization banner */}
      {personalization?.headline && !isComplete && (
        <div className="bg-indigo-950/80 border-b border-indigo-900/50 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-indigo-200 truncate">{personalization.headline}</span>
              {(personalization.distilledPatternsUsed ?? 0) > 0 && (
                <span className="text-indigo-400/80 shrink-0 hidden sm:inline">
                  · {personalization.distilledPatternsUsed} 条飞轮洞察已注入
                </span>
              )}
            </div>
            {personalization.stagePlan && (
              <span className="text-slate-500 shrink-0">
                {personalization.stagePlan.length} 阶段 · {personalization.stagePlan.reduce((s, x) => s + x.duration_min, 0)} 分钟
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stage banner */}
      {stageInfo && (
        <div className="bg-slate-900/50 border-b border-slate-800/60 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-xs text-indigo-300 font-medium">{stageInfo.name}</span>
              <span className="text-xs text-slate-500">· 建议 {stageInfo.duration_min} 分钟</span>
              {stageInfo.strict_timer && (
                <span className="text-xs bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full">计时</span>
              )}
              {isPresentation && (
                <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">汇报阶段 · 考官不打断</span>
              )}
            </div>
            {!isComplete && (
              <button type="button" onClick={handleAdvanceStage} disabled={advancing}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200 transition-colors shrink-0 ml-2">
                {advancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                跳至下一阶段
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 interview-scroll">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => {
            if (msg.role === "system") {
              return (
                <div key={i} className="flex justify-center">
                  <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-950/30 border border-amber-800/30 px-3 py-1.5 rounded-lg max-w-md text-center">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {msg.content}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 mr-3 mt-1">
                    <Brain className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-xl rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-slate-800 text-slate-100 rounded-bl-sm"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {streaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 mr-3">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Practice hint card */}
          {showHint && hint && (
            <div className="bg-amber-950/40 border border-amber-700/40 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-medium text-amber-400">本题即时反馈（练习模式）</span>
                <button onClick={() => setShowHint(false)} className="ml-auto text-slate-600 hover:text-slate-400 text-xs">✕</button>
              </div>
              <p className="text-sm text-amber-100 leading-relaxed whitespace-pre-wrap">{hint}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/50 px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {isComplete && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">面试完成！</p>
                <p className="text-slate-400 text-sm mt-1">AI 正在分析你的表现，生成详细报告...</p>
              </div>
              <Button onClick={handleGenerateReport} disabled={reportLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-8 h-11">
                {reportLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />生成报告中...</> : "查看评估报告 →"}
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      {!isComplete && (
        <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-3">
          {/* Action helper buttons */}
          {!streaming && (
            <div className="max-w-3xl mx-auto mb-2 flex flex-wrap gap-2">
              {isPresentation && (
                <button type="button" onClick={handlePresentationDone} disabled={advancing}
                  className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 border border-green-800/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  {advancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                  我已汇报完毕，进入提问
                </button>
              )}
              {mode === "practice" && !isPresentation && (
                <button type="button" onClick={handleGetHint} disabled={hintLoading}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-900/20 hover:bg-amber-900/30 border border-amber-800/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  {hintLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                  查看本题提示
                </button>
              )}
              {/* Always-visible next stage button at bottom input bar */}
              <button type="button" onClick={handleAdvanceStage} disabled={advancing}
                className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                {advancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                跳至下一阶段
              </button>
            </div>
          )}

          {!sttActive && !sttTranscribing && sttReviewHint && !sttError && (
            <p className="text-xs text-emerald-400/90 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              识别完成，请核对术语后发送（同音字可手动改）
            </p>
          )}
          {sttError && (
            <div className="max-w-3xl mx-auto mb-1.5 flex items-start gap-1.5 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 px-3 py-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{sttError}</span>
              <button onClick={() => setSttError("")} className="ml-auto text-amber-600 hover:text-amber-400 shrink-0">✕</button>
            </div>
          )}
          {sttActive && (
            <div className="max-w-3xl mx-auto mb-1.5 flex items-center gap-1.5 text-xs text-red-400">
              <span className="inline-flex gap-px items-end h-3">
                {[0, 80, 160, 40, 120].map((d, i) => (
                  <span key={i} className="w-0.5 bg-red-400 rounded-full"
                    style={{ height: `${40 + i * 10}%`, animation: `waveBar 0.5s ${d}ms ease-in-out infinite alternate` }} />
                ))}
              </span>
              录音中... 说完后再次点击麦克风停止
            </div>
          )}
          {sttTranscribing && (
            <div className="max-w-3xl mx-auto mb-1.5 flex items-center gap-1.5 text-xs text-indigo-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI 正在转录语音...
            </div>
          )}
          {!sttActive && !sttTranscribing && !sttError && input.trim() && (
            <div className="max-w-3xl mx-auto mb-1.5 text-xs text-slate-500">
              转录完成，确认后按 Enter 发送
            </div>
          )}

          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="flex-1 bg-slate-800 rounded-2xl flex items-end gap-2 px-4 py-2.5">
              {/* FIX 2: textarea replaces input */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (sttReviewHint) setSttReviewHint(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !streaming) sendMessage(input.trim());
                  }
                }}
                placeholder={sttActive ? "语音输入中..." : "输入回答（Enter 发送，Shift+Enter 换行）"}
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none resize-none leading-relaxed"
                disabled={streaming}
                style={{ maxHeight: "160px", overflowY: "auto" }}
              />
              <button type="button" onClick={toggleSTT}
                disabled={sttTranscribing}
                className={`relative p-1.5 rounded-xl transition-colors shrink-0 mb-0.5 ${
                  sttActive ? "bg-red-500/20 text-red-400" :
                  sttTranscribing ? "text-indigo-400" :
                  "text-slate-500 hover:text-slate-300"
                }`}
                title={sttActive ? "停止录音" : sttTranscribing ? "转录中..." : "语音输入"}>
                {sttTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sttActive ? (
                  <span className="flex items-end gap-px h-4 w-4">
                    {[0, 100, 200, 50, 150].map((delay, i) => (
                      <span key={i} className="w-0.5 bg-red-400 rounded-full animate-[waveBar_0.6s_ease-in-out_infinite_alternate]"
                        style={{ animationDelay: `${delay}ms`, height: `${40 + i * 12}%` }} />
                    ))}
                  </span>
                ) : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <button type="button"
              onClick={() => { if (input.trim() && !streaming) sendMessage(input.trim()); }}
              disabled={!input.trim() || streaming}
              className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center transition-colors shrink-0">
              {streaming ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
