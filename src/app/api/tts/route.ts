import { NextResponse } from "next/server";

let ttsFunc:
  | ((text: string, opts: Record<string, string>) => Promise<Buffer>)
  | null = null;

async function getTts() {
  if (!ttsFunc) {
    const mod = (await import("edge-tts/out/index.js")) as {
      tts?: (text: string, opts: Record<string, string>) => Promise<Buffer>;
    };
    ttsFunc = mod.tts ?? null;
  }
  return ttsFunc;
}

export async function POST(req: Request) {
  const { text, voice, rate, pitch } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "缺少 text 参数" }, { status: 400 });
  }

  const selectedVoice = voice || process.env.EDGE_TTS_VOICE || "zh-CN-XiaoyiNeural";
  const selectedRate = rate || process.env.EDGE_TTS_RATE || "-5%";
  const selectedPitch = pitch || process.env.EDGE_TTS_PITCH || "-2Hz";

  try {
    const tts = await getTts();
    if (!tts) throw new Error("edge-tts not available");

    const audioBuffer = await tts(text.slice(0, 1000), {
      voice: selectedVoice,
      rate: selectedRate,
      pitch: selectedPitch,
      volume: "+0%",
    });

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[TTS] error:", err);
    return NextResponse.json({ error: "TTS 生成失败" }, { status: 500 });
  }
}
