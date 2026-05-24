const OPEN_STAGE_FALLBACK =
  "你为什么选择这个研究方向，以及未来三年的研究规划是什么？";

function looksLikeStudentMonologue(content: string): boolean {
  const t = content.trim();
  if (!t) return false;
  if (/协议已确认/.test(t)) return true;
  if (/^\$\$|\\mathcal\{L\}|\\underbrace\{/.test(t)) return true;
  if (/^(我|我的)/.test(t)) return true;
  return /我想深耕|我的.*研究|这正是我|研究哲学|最能代表我/.test(t);
}

/** Strip hidden metadata markers from AI replies and detect stage-end signals. */
export function parseAIReply(
  raw: string,
  opts?: { isPresentation?: boolean; isOpenDiscussion?: boolean }
): { content: string; endStage: boolean } {
  let endStage = false;

  const metaMatch = raw.match(/<!--\s*(\{[\s\S]*?\})\s*-->/);
  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1]) as { end_stage?: boolean };
      if (meta.end_stage) endStage = true;
    } catch {
      /* ignore malformed metadata */
    }
  }

  let content = raw.replace(/<!--\s*\{[\s\S]*?\}\s*-->/g, "").trim();

  // Strip leaked internal evaluation blocks
  content = content
    .replace(/[（(]\s*追问深度[^）)]*[）)]/g, "")
    .replace(/[（(]\s*追问\s*\d+\s*层[^）)]*[）)]/g, "")
    .replace(/【追问深度[^】]*】/g, "")
    .replace(/[（(]阶段摘要生成[^）)]*[）)]/g, "")
    .replace(/【内容完整性】[\s\S]*?(?=\n\n|$)/g, "")
    .replace(/【重点突出度】[\s\S]*?(?=\n\n|$)/g, "")
    .replace(/【匹配度分析】[\s\S]*?(?=\n\n|$)/g, "")
    .replace(/【时间控制】[\s\S]*?(?=\n\n|$)/g, "")
    .replace(/【需追问点】[\s\S]*?(?=\n\n|$)/g, "")
    .trim();

  // Only explicit metadata triggers end_stage — never infer from transition phrases
  // (phrases like "进入提问环节" often accompany a question that user must answer first)

  if (opts?.isPresentation && /[？?]/.test(content)) {
    content = "请开始你的汇报。";
  }

  if (opts?.isOpenDiscussion && looksLikeStudentMonologue(content)) {
    content = OPEN_STAGE_FALLBACK;
  }

  return { content, endStage };
}
