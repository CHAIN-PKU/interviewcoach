import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { buildWhisperPrompt } from "@/lib/stt-prompt";
import { applySttTermFixes, polishSttText } from "@/lib/stt-corrector";

async function transcribeLocal(
  audioBuffer: Buffer,
  mimeType: string,
  whisperPrompt: string
): Promise<string> {
  const ext = mimeType.includes("ogg") ? ".ogg" : mimeType.includes("mp4") ? ".mp4" : ".webm";
  const tmpFile = path.join(os.tmpdir(), `stt_${Date.now()}${ext}`);
  fs.writeFileSync(tmpFile, audioBuffer);

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "transcribe.py");
    const proc = spawn("python3", [scriptPath, tmpFile, whisperPrompt], { timeout: 120000 });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    proc.on("close", (code) => {
      fs.unlink(tmpFile, () => {});
      if (code !== 0) {
        reject(new Error(`transcribe exited ${code}: ${stderr.slice(0, 200)}`));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim()) as { text?: string; error?: string };
        if (result.error) reject(new Error(result.error));
        else resolve(result.text ?? "");
      } catch {
        reject(new Error(`parse error: ${stdout.slice(0, 100)}`));
      }
    });

    proc.on("error", (e) => {
      fs.unlink(tmpFile, () => {});
      reject(e);
    });
  });
}

async function loadSttContext(sessionId: string | null, userId: string) {
  if (!sessionId) return { direction: "", profileSummary: "" };

  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId, userId },
    include: { profile: { select: { profileSummary: true, advisorDirection: true } } },
  });
  if (!dbSession) return { direction: "", profileSummary: "" };

  let direction = dbSession.profile?.advisorDirection ?? "";
  try {
    const snap = JSON.parse(dbSession.harnessSnapshot || "{}") as {
      _matchedBy?: { direction?: string };
    };
    direction = snap._matchedBy?.direction || direction;
  } catch {
    /* ignore */
  }

  return {
    direction,
    profileSummary: dbSession.profile?.profileSummary ?? "",
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let audioBuffer: Buffer;
  let mimeType = "audio/webm";
  let sessionId: string | null = null;
  let polish = false;

  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    if (!file) return NextResponse.json({ error: "缺少音频数据" }, { status: 400 });
    mimeType = file.type || "audio/webm";
    audioBuffer = Buffer.from(await file.arrayBuffer());
    sessionId = (formData.get("sessionId") as string) || null;
    polish = formData.get("polish") === "true";
  } catch {
    return NextResponse.json({ error: "音频数据解析失败" }, { status: 400 });
  }

  if (audioBuffer.length < 500) {
    return NextResponse.json({ error: "录音太短，请重试" }, { status: 400 });
  }

  const ctx = await loadSttContext(sessionId, session.user.id);
  const whisperPrompt = buildWhisperPrompt(ctx);

  let rawText = "";
  let source = "local";

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const form = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      form.append("file", blob, "audio.webm");
      form.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo");
      form.append("language", "zh");
      form.append("response_format", "json");
      form.append("prompt", whisperPrompt);
      form.append("temperature", "0");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: form,
      });
      if (res.ok) {
        const data = (await res.json()) as { text: string };
        rawText = data.text?.trim() ?? "";
        source = "groq";
      }
    } catch {
      /* fall through */
    }
  }

  if (!rawText) {
    try {
      rawText = await transcribeLocal(audioBuffer, mimeType, whisperPrompt);
      source = "local";
    } catch (e) {
      console.error("[STT] local whisper error:", e);
      return NextResponse.json({ error: "语音识别失败，请重试" }, { status: 500 });
    }
  }

  const ruleFixed = applySttTermFixes(rawText);
  const text =
    polish && ruleFixed.length >= 15
      ? await polishSttText(ruleFixed, {
          direction: ctx.direction,
          tier: session.user.tier as "free" | "pro",
        })
      : ruleFixed;

  return NextResponse.json({
    text,
    rawText: rawText !== text ? rawText : undefined,
    source,
    corrected: rawText !== text,
  });
}
