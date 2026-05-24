import { callLLMText, getModelConfig } from "./model-router";

/** Fast homophone / typo fixes common in Chinese STT for CS/AI interviews. */
const TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/封速/g, "风速"],
  [/峰速/g, "风速"],
  [/现套/g, "嵌入"],
  [/线套/g, "嵌入"],
  [/物理移制/g, "物理一致"],
  [/移制性/g, "一致性"],
  [/一致制/g, "一致性"],
  [/第一座者/g, "第一作者"],
  [/第一做者/g, "第一作者"],
  [/精准率/g, "准确率"],
  [/投搞/g, "投稿"],
  [/transformer/gi, "Transformer"],
  [/transfomer/gi, "Transformer"],
  [/pinns?/gi, "PINN"],
  [/sim to real/gi, "Sim-to-Real"],
  [/sim2real/gi, "Sim-to-Real"],
];

export function applySttTermFixes(text: string): string {
  let out = text.trim();
  for (const [pattern, replacement] of TERM_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Optional LLM pass: fix homophones only, preserve wording. */
export async function polishSttText(
  raw: string,
  opts?: { direction?: string; tier?: "free" | "pro" }
): Promise<string> {
  const fixed = applySttTermFixes(raw);
  if (fixed.length < 15 || !process.env.OPENROUTER_API_KEY) return fixed;

  const config = getModelConfig(opts?.tier ?? "free");
  const system = `你是语音识别后处理助手。任务：仅修正同音错字、术语拼写和明显口误，保持原意和口语风格。
禁止：改写句式、增删句子、润色、总结。
研究方向参考：${opts?.direction || "CS/AI 科研面试"}`;

  try {
    const out = await callLLMText(config, system, [
      {
        role: "user",
        content: `请直接输出修正后的文本（不要解释）：\n\n${fixed}`,
      },
    ]);
    const cleaned = out.trim().replace(/^["']|["']$/g, "");
    return cleaned.length >= fixed.length * 0.5 ? cleaned : fixed;
  } catch {
    return fixed;
  }
}
