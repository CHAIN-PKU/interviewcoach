import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { callLLMText, getModelConfig } from "@/lib/model-router";
import { getTopicPoolKey } from "@/lib/harness-personalize";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const RAG_INDEX_PATH = path.join(KNOWLEDGE_DIR, "rag_index.json");
const SKILLS_DIR = path.join(KNOWLEDGE_DIR, "skills");
const DISTILLED_DIR = path.join(SKILLS_DIR, "distilled");

export interface WeaknessInsight {
  id: string;
  failure_pattern: string;
  root_cause: string;
  improved_probe: string;
  avoid?: string;
  evidence_count: number;
  updated_at: string;
}

function loadRagIndex(): { entries: Record<string, unknown>[] } {
  try {
    return JSON.parse(fs.readFileSync(RAG_INDEX_PATH, "utf-8"));
  } catch {
    return { entries: [] };
  }
}

function saveRagIndex(data: { entries: Record<string, unknown>[] }) {
  fs.writeFileSync(RAG_INDEX_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function ensureDistilledDir() {
  if (!fs.existsSync(DISTILLED_DIR)) fs.mkdirSync(DISTILLED_DIR, { recursive: true });
}

function loadDistilledFile(key: string): Record<string, unknown> | null {
  ensureDistilledDir();
  const p = path.join(DISTILLED_DIR, `${key}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function saveDistilledFile(key: string, data: Record<string, unknown>) {
  ensureDistilledDir();
  fs.writeFileSync(path.join(DISTILLED_DIR, `${key}.json`), JSON.stringify(data, null, 2), "utf-8");
}

function extractDirectionFromSnapshot(harnessSnapshot: string | null): string {
  try {
    const snap = JSON.parse(harnessSnapshot || "{}") as {
      _matchedBy?: { direction?: string };
    };
    return snap._matchedBy?.direction || "";
  } catch {
    return "";
  }
}

function parseReportQuestionScores(reportJson: string | null): Map<string, number> {
  const scores = new Map<string, number>();
  if (!reportJson) return scores;
  try {
    const report = JSON.parse(reportJson) as {
      question_scores?: Array<{ question: string; score: number }>;
    };
    for (const qs of report.question_scores || []) {
      if (qs.question) scores.set(qs.question.slice(0, 40), qs.score);
    }
  } catch {
    /* ignore */
  }
  return scores;
}

function questionScore(q: string, scoreMap: Map<string, number>): number | null {
  for (const [k, v] of scoreMap) {
    if (q.includes(k.slice(0, 15)) || k.includes(q.slice(0, 15))) return v;
  }
  return null;
}

function isWeakAnswer(
  r: { answer: string | null; userThumbsUp: boolean | null; score: number | null; question: string },
  reportScores: Map<string, number>
): boolean {
  if (r.userThumbsUp === false) return true;
  if (!r.answer?.trim()) return true;
  if ((r.score ?? 100) < 60) return true;
  const rs = questionScore(r.question, reportScores);
  if (rs != null && rs < 60) return true;
  const a = r.answer.trim();
  if (a.length < 40) return true;
  if (/不知道|不清楚|不太懂|没做过|忘了/.test(a)) return true;
  return false;
}

function insightSimilar(a: string, b: string): boolean {
  return a.slice(0, 12) === b.slice(0, 12) || a.includes(b.slice(0, 8)) || b.includes(a.slice(0, 8));
}

/** List all distilled items for dashboard / debug. */
export function listDistilledCatalog(): Array<{
  direction_key: string;
  name: string;
  weakness_insights: WeaknessInsight[];
  probing_patterns: string[];
}> {
  ensureDistilledDir();
  const out: Array<{
    direction_key: string;
    name: string;
    weakness_insights: WeaknessInsight[];
    probing_patterns: string[];
  }> = [];

  for (const f of fs.readdirSync(DISTILLED_DIR).filter((x) => x.endsWith(".json"))) {
    try {
      const skill = JSON.parse(fs.readFileSync(path.join(DISTILLED_DIR, f), "utf-8")) as {
        direction_key?: string;
        name?: string;
        strategy?: {
          weakness_insights?: WeaknessInsight[];
          probing_patterns?: string[];
        };
      };
      out.push({
        direction_key: skill.direction_key || f.replace(".json", ""),
        name: skill.name || f,
        weakness_insights: skill.strategy?.weakness_insights || [],
        probing_patterns: skill.strategy?.probing_patterns || [],
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

/**
 * Core flywheel: analyze where users fail, why, and distill better examiner probes.
 */
async function distillWeaknessDrivenSkills(
  sessions: Array<{
    id: string;
    harnessSnapshot: string | null;
    reportJson: string | null;
    userFeedback: string | null;
    qaRecords: Array<{
      question: string;
      answer: string | null;
      userThumbsUp: boolean | null;
      score: number | null;
      feedback: string | null;
    }>;
  }>,
  modelConfig: ReturnType<typeof getModelConfig>
): Promise<{ newInsights: number; newProbes: number }> {
  const byDirection = new Map<
    string,
    Array<{
      question: string;
      answer: string;
      signals: string[];
    }>
  >();

  for (const s of sessions) {
    const direction = extractDirectionFromSnapshot(s.harnessSnapshot);
    const key = getTopicPoolKey(direction || undefined);
    const reportScores = parseReportQuestionScores(s.reportJson);

    for (const r of s.qaRecords) {
      if (!r.question?.trim()) continue;
      if (!isWeakAnswer(r, reportScores)) continue;

      const signals: string[] = [];
      if (r.userThumbsUp === false) signals.push("用户标记题目不合适");
      if (!r.answer?.trim()) signals.push("未作答");
      if ((r.score ?? 100) < 60) signals.push(`题目得分${r.score}`);
      const rs = questionScore(r.question, reportScores);
      if (rs != null && rs < 60) signals.push(`报告评分${rs}`);
      if (r.answer && r.answer.trim().length < 40) signals.push("回答过短");
      if (r.feedback) signals.push(`反馈:${r.feedback.slice(0, 40)}`);

      if (!byDirection.has(key)) byDirection.set(key, []);
      byDirection.get(key)!.push({
        question: r.question,
        answer: r.answer?.trim() || "(未回答/极短)",
        signals,
      });
    }

    if (s.userFeedback?.trim()) {
      const key = getTopicPoolKey(extractDirectionFromSnapshot(s.harnessSnapshot) || undefined);
      if (!byDirection.has(key)) byDirection.set(key, []);
      byDirection.get(key)!.push({
        question: "(用户整体反馈)",
        answer: s.userFeedback.slice(0, 300),
        signals: ["session_feedback"],
      });
    }
  }

  let newInsights = 0;
  let newProbes = 0;

  for (const [key, weakItems] of byDirection) {
    if (weakItems.length === 0) continue;

    const existing = loadDistilledFile(key);
    const strategy = (existing?.strategy as Record<string, unknown>) || {};
    const prevInsights = (strategy.weakness_insights as WeaknessInsight[]) || [];
    const prevPatterns = (strategy.probing_patterns as string[]) || [];

    const prompt = `你是 InterviewCoach 飞轮分析器。以下是用户在模拟面试中「答得不好」的真实记录。
请分析：大家容易在哪些点出问题？为什么（根因）？考官下次应如何更有针对性地提问？

【弱项记录】
${weakItems
  .slice(0, 15)
  .map(
    (w, i) =>
      `${i + 1}. Q: ${w.question.slice(0, 120)}\n   A: ${w.answer.slice(0, 200)}\n   信号: ${w.signals.join(", ")}`
  )
  .join("\n\n")}

已有洞察（避免重复）：
${prevInsights.map((x) => `- ${x.failure_pattern}`).join("\n") || "（无）"}

返回 JSON 数组（1-3 条，只输出 JSON）：
[{
  "failure_pattern": "用户常见失败模式，20字内",
  "root_cause": "为什么在这里卡住（问题设计/知识盲区/表达问题）",
  "improved_probe": "改进后的考官追问（可直接使用，先铺垫再追问）",
  "avoid": "应避免的死板问法"
}]`;

    try {
      const raw = await callLLMText(
        modelConfig,
        "你是面试训练飞轮分析器。只输出 JSON 数组，聚焦失败根因与改进提问方式。",
        [{ role: "user", content: prompt }]
      );
      const match = raw.match(/\[[\s\S]*?\]/);
      if (!match) continue;

      const parsed = JSON.parse(match[0]) as Array<{
        failure_pattern?: string;
        root_cause?: string;
        improved_probe?: string;
        avoid?: string;
      }>;

      const mergedInsights = [...prevInsights];
      const mergedPatterns = [...prevPatterns];

      for (const item of parsed) {
        if (!item.failure_pattern || !item.improved_probe) continue;
        if (mergedInsights.some((x) => insightSimilar(x.failure_pattern, item.failure_pattern!))) {
          const idx = mergedInsights.findIndex((x) =>
            insightSimilar(x.failure_pattern, item.failure_pattern!)
          );
          if (idx >= 0) {
            mergedInsights[idx].evidence_count += 1;
            mergedInsights[idx].updated_at = new Date().toISOString();
          }
          continue;
        }

        mergedInsights.push({
          id: `wi_${key}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          failure_pattern: item.failure_pattern,
          root_cause: item.root_cause || "",
          improved_probe: item.improved_probe,
          avoid: item.avoid,
          evidence_count: 1,
          updated_at: new Date().toISOString(),
        });
        newInsights++;

        const probe = `${item.improved_probe} [distilled:weakness]`;
        if (!mergedPatterns.some((p) => p.slice(0, 30) === probe.slice(0, 30))) {
          mergedPatterns.push(probe);
          newProbes++;
        }
      }

      saveDistilledFile(key, {
        id: existing?.id || `distilled_${key}`,
        name: existing?.name || `${key}·社区蒸馏追问`,
        version: "2.0",
        direction_key: key,
        source: "community_distill",
        strategy: {
          ...strategy,
          weakness_insights: mergedInsights.slice(-20),
          probing_patterns: mergedPatterns.slice(-25),
          distill_focus: "weakness_driven",
        },
      });
    } catch (err) {
      console.error("[distill] weakness-driven failed for", key, err);
    }
  }

  return { newInsights, newProbes };
}

/** Run flywheel distillation. Safe to call fire-and-forget. */
export async function runDistill(): Promise<{
  newRagEntries: number;
  newWeaknessInsights: number;
  newImprovedProbes: number;
}> {
  const modelConfig = getModelConfig("pro");
  let newRagCount = 0;
  let newWeaknessInsights = 0;
  let newImprovedProbes = 0;

  const consentedSessions = await prisma.session.findMany({
    where: { consentToShare: true, status: "completed" },
    select: {
      id: true,
      harnessSnapshot: true,
      reportJson: true,
      userFeedback: true,
      totalScore: true,
      qaRecords: {
        orderBy: { createdAt: "asc" },
        select: {
          question: true,
          answer: true,
          userThumbsUp: true,
          score: true,
          feedback: true,
        },
      },
    },
    take: 50,
  });

  if (consentedSessions.length > 0) {
    const ragIndex = loadRagIndex();
    const existingIds = new Set(ragIndex.entries.map((e) => e.id as string));

    const sessionSummaries = consentedSessions
      .map((s) => {
        let snapshotInfo = "";
        try {
          const snap = JSON.parse(s.harnessSnapshot || "{}");
          snapshotInfo = `面试: ${snap.name || "通用"}, 方向: ${snap._matchedBy?.direction || "未知"}`;
        } catch {
          /* ignore */
        }
        const qaText = s.qaRecords
          .map((r) => {
            const weak = isWeakAnswer(r, parseReportQuestionScores(s.reportJson));
            return `Q: ${r.question}\nA: ${r.answer || "(无)"}${weak ? " [弱项]" : ""}${r.userThumbsUp === false ? " [👎]" : ""}`;
          })
          .join("\n---\n");
        return `[${s.id.slice(0, 8)}] 总分:${s.totalScore ?? "N/A"} ${snapshotInfo}\n${qaText}`;
      })
      .join("\n\n=====\n\n");

    const ragPrompt = `分析以下面试训练记录，重点提炼「用户普遍答不好的环节」及考官应如何改进提问。返回 1-2 条 JSON：
[{"id":"community_weak_<主题>_<4位随机>","type":"criteria","summary":"50字内","tags":["标签"],"key_insights":["洞察"],"quality":4,"source":"community","distilled_from_count":${consentedSessions.length}}]
===记录===
${sessionSummaries.slice(0, 6000)}`;

    try {
      const raw = await callLLMText(modelConfig, "只输出 JSON 数组。", [{ role: "user", content: ragPrompt }]);
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const entries = JSON.parse(match[0]) as Record<string, unknown>[];
        const ragData = loadRagIndex();
        for (const entry of entries) {
          const id = entry.id as string;
          if (id && !existingIds.has(id)) {
            ragData.entries.push(entry);
            existingIds.add(id);
            newRagCount++;
          }
        }
        saveRagIndex(ragData);
      }
    } catch {
      /* continue */
    }

    const weaknessResult = await distillWeaknessDrivenSkills(consentedSessions, modelConfig);
    newWeaknessInsights = weaknessResult.newInsights;
    newImprovedProbes = weaknessResult.newProbes;
  }

  return {
    newRagEntries: newRagCount,
    newWeaknessInsights,
    newImprovedProbes,
  };
}
