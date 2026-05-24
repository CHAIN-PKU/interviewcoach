import type { HarnessStage } from "./skill-loader";
import { looksLikeQuestion } from "./harness-engine";

export const LATE_QUESTION_GRACE_SEC = 30;

export interface DialogMessage {
  role: "user" | "assistant";
  content: string;
  ts?: number;
}

export interface QAItem {
  stageId: string;
  question: string;
  answer: string | null;
  scoringExcluded?: boolean;
  excludeReason?: string;
}

export interface EngineStateForScoring {
  stageStartTime?: number;
  dialogHistory?: DialogMessage[];
  currentStageIndex?: number;
}

/** Find assistant questions in a stage dialog with no following user reply. */
export function extractUnansweredQuestions(
  dialogHistory: DialogMessage[]
): Array<{ question: string; ts?: number }> {
  const unanswered: Array<{ question: string; ts?: number }> = [];
  for (let i = 0; i < dialogHistory.length; i++) {
    const msg = dialogHistory[i];
    if (msg.role !== "assistant" || !looksLikeQuestion(msg.content)) continue;
    const next = dialogHistory[i + 1];
    if (!next || next.role !== "user") {
      unanswered.push({ question: msg.content.trim(), ts: msg.ts });
    }
  }
  return unanswered;
}

function questionsMatch(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (!x || !y) return false;
  return x.includes(y.slice(0, 20)) || y.includes(x.slice(0, 20));
}

function findQuestionTs(question: string, dialogHistory: DialogMessage[]): number | undefined {
  for (let i = dialogHistory.length - 1; i >= 0; i--) {
    const msg = dialogHistory[i];
    if (msg.role === "assistant" && questionsMatch(msg.content, question)) {
      return msg.ts;
    }
  }
  return undefined;
}

function isLateQuestion(
  stageId: string,
  question: string,
  stages: HarnessStage[],
  engineState?: EngineStateForScoring
): boolean {
  const stage = stages.find((s) => s.id === stageId);
  if (!stage?.duration_min) return false;

  if (/时间快到了|请简要作答|请简要说明/.test(question)) return true;

  const dialogHistory = engineState?.dialogHistory ?? [];
  const currentStageIdx = engineState?.currentStageIndex ?? 0;
  const currentStage = stages[currentStageIdx];
  const ts = findQuestionTs(question, dialogHistory);

  if (ts != null && currentStage?.id === stageId && engineState?.stageStartTime) {
    const stageEndMs = engineState.stageStartTime + stage.duration_min * 60 * 1000;
    return ts >= stageEndMs - LATE_QUESTION_GRACE_SEC * 1000;
  }

  return false;
}

/**
 * Mark unanswered items that should not affect total score:
 * - Stage already has ≥1 answer → trailing unanswered (usually time ran out)
 * - Question asked within 30s of stage end → insufficient time to answer
 */
export function applyScoringExclusions(
  allQA: QAItem[],
  stages: HarnessStage[],
  engineState?: EngineStateForScoring
): QAItem[] {
  return allQA.map((qa) => {
    if (qa.answer?.trim()) return qa;

    const stageItems = allQA.filter((q) => q.stageId === qa.stageId);
    const hasAnsweredInStage = stageItems.some((q) => q.answer?.trim());

    if (hasAnsweredInStage) {
      return {
        ...qa,
        scoringExcluded: true,
        excludeReason: "阶段已有有效作答，末段未答题不计入总分",
      };
    }

    if (isLateQuestion(qa.stageId, qa.question, stages, engineState)) {
      return {
        ...qa,
        scoringExcluded: true,
        excludeReason: "提问时距阶段结束不足30秒，不计入总分",
      };
    }

    return qa;
  });
}

export function getScorableQA(allQA: QAItem[]): QAItem[] {
  return allQA.filter((q) => !q.scoringExcluded);
}

export interface StageCoverage {
  stageId: string;
  stageName: string;
  userTurns: number;
  unansweredCount: number;
  excludedCount: number;
  hasUserAnswer: boolean;
}

export function computeStageCoverage(
  stages: HarnessStage[],
  allQA: QAItem[]
): StageCoverage[] {
  return stages.map((stage) => {
    const stageQA = allQA.filter((q) => q.stageId === stage.id);
    const answered = stageQA.filter((q) => q.answer?.trim());
    const unanswered = stageQA.filter((q) => !q.answer?.trim() && !q.scoringExcluded);
    const excluded = stageQA.filter((q) => q.scoringExcluded);
    return {
      stageId: stage.id,
      stageName: stage.name,
      userTurns: answered.length,
      unansweredCount: unanswered.length,
      excludedCount: excluded.length,
      hasUserAnswer: answered.length > 0,
    };
  });
}

export function buildCoverageSummary(coverage: StageCoverage[], allQA: QAItem[]): string {
  const penalizableUnanswered = allQA.filter((q) => !q.answer?.trim() && !q.scoringExcluded);
  const excluded = allQA.filter((q) => q.scoringExcluded);

  const lines = coverage.map((c) => {
    if (c.userTurns === 0 && c.unansweredCount === 0 && c.excludedCount === 0) {
      return `- [${c.stageName}/${c.stageId}]：该阶段无任何用户作答记录`;
    }
    if (c.userTurns > 0 && c.excludedCount > 0) {
      return `- [${c.stageName}/${c.stageId}]：${c.userTurns} 题已答，${c.excludedCount} 题因时间不足不计入评分（阶段表现按已答题评估）`;
    }
    if (c.unansweredCount > 0) {
      return `- [${c.stageName}/${c.stageId}]：${c.userTurns} 题已答，${c.unansweredCount} 题未回答（需扣分）`;
    }
    return `- [${c.stageName}/${c.stageId}]：${c.userTurns} 题已答`;
  });

  const excludedNote =
    excluded.length > 0
      ? `\n\n以下题目因时间不足不计入评分（勿写入 question_scores，勿因此压低 total_score）：\n${excluded
          .map((q, i) => `${i + 1}. [${q.stageId}] ${q.question.slice(0, 100)}`)
          .join("\n")}`
      : "";

  const unansweredList =
    penalizableUnanswered.length > 0
      ? `\n\n需扣分的未回答题目（每题 question_scores 不得超过 30）：\n${penalizableUnanswered
          .map((q, i) => `${i + 1}. [${q.stageId}] ${q.question.slice(0, 120)}`)
          .join("\n")}`
      : "";

  return lines.join("\n") + excludedNote + unansweredList;
}

/** Deterministic score adjustments — only penalize scorable unanswered questions. */
export function adjustReportScores(
  report: Record<string, unknown>,
  allQA: QAItem[],
  stages: HarnessStage[]
): Record<string, unknown> {
  const adjusted = { ...report };
  const scoreDims = { ...((adjusted.score_dims as Record<string, number>) || {}) };
  const scorableQA = getScorableQA(allQA);
  const unanswered = scorableQA.filter((q) => !q.answer?.trim());
  const coverage = computeStageCoverage(stages, allQA);

  const openStage = stages.find((s) => s.id === "open" || s.type === "open_discussion");
  const openUnanswered = openStage
    ? unanswered.filter((q) => q.stageId === openStage.id)
    : [];
  const openNoAnswerAtAll =
    openStage &&
    !coverage.find((c) => c.stageId === openStage.id)?.hasUserAnswer &&
    openUnanswered.length > 0;

  let questionScores = Array.isArray(adjusted.question_scores)
    ? [...(adjusted.question_scores as Array<Record<string, unknown>>)]
    : [];

  questionScores = questionScores.filter((qs) => {
    const qText = String(qs.question || "");
    const matchedExcluded = allQA.find(
      (u) => u.scoringExcluded && questionsMatch(u.question, qText)
    );
    return !matchedExcluded;
  });

  for (const u of unanswered) {
    const exists = questionScores.some(
      (qs) => typeof qs.question === "string" && questionsMatch(String(qs.question), u.question)
    );
    if (!exists) {
      questionScores.push({
        question: u.question.slice(0, 80),
        score: 20,
        feedback: "未作答，无法评估",
        stageId: u.stageId,
      });
    }
  }

  for (const u of allQA.filter((q) => q.scoringExcluded)) {
    const exists = questionScores.some(
      (qs) => typeof qs.question === "string" && questionsMatch(String(qs.question), u.question)
    );
    if (!exists) {
      questionScores.push({
        question: u.question.slice(0, 80),
        feedback: u.excludeReason || "时间不足，未计入总分",
        stageId: u.stageId,
        scoringExcluded: true,
      });
    }
  }

  questionScores = questionScores.map((qs) => {
    const qText = String(qs.question || "");
    const excluded = allQA.find((u) => u.scoringExcluded && questionsMatch(u.question, qText));
    if (excluded) {
      return {
        ...qs,
        feedback: excluded.excludeReason || "时间不足，未计入总分",
        scoringExcluded: true,
      };
    }
    const matched = unanswered.find((u) => questionsMatch(u.question, qText));
    if (matched) {
      return { ...qs, score: Math.min(Number(qs.score) || 20, 25), feedback: "未作答" };
    }
    return qs;
  });

  adjusted.question_scores = questionScores;

  if (unanswered.length > 0) {
    if (scoreDims["追问应对"] != null) {
      scoreDims["追问应对"] = Math.min(scoreDims["追问应对"], 55);
    }
  }

  if (openNoAnswerAtAll) {
    scoreDims["方向匹配度"] = Math.min(scoreDims["方向匹配度"] ?? 50, 50);
    const improvements = Array.isArray(adjusted.improvements)
      ? [...(adjusted.improvements as Array<Record<string, string>>)]
      : [];
    const hasOpenIssue = improvements.some((imp) => String(imp.issue || "").includes("开放"));
    if (!hasOpenIssue) {
      improvements.unshift({
        issue: "开放性问题阶段未作答（如：选择课题组/未来规划）",
        suggestion: "用30秒回答：为什么选这个组 + 一个具体匹配点",
        related_stage: openStage?.id || "open",
      });
    }
    adjusted.improvements = improvements.slice(0, 3);

    const highlights = Array.isArray(adjusted.highlights)
      ? (adjusted.highlights as string[]).slice(0, 1)
      : [];
    adjusted.highlights = highlights;
  }

  adjusted.score_dims = scoreDims;

  let total = Number(adjusted.total_score) || 70;
  if (unanswered.length > 0) {
    const penalty = Math.min(20, unanswered.length * 6 + (openNoAnswerAtAll ? 8 : 0));
    total = Math.max(45, total - penalty);
  }
  if (openNoAnswerAtAll) {
    total = Math.min(total, 65);
  }

  const scorableQuestionScores = questionScores.filter(
    (qs) => !qs.scoringExcluded && qs.score != null
  );
  if (scorableQuestionScores.length > 0) {
    const avgQ =
      scorableQuestionScores.reduce((s, q) => s + (Number(q.score) || 0), 0) /
      scorableQuestionScores.length;
    if (unanswered.length > 0) {
      total = Math.min(total, Math.round(avgQ + 20));
    }
  }

  adjusted.total_score = Math.round(total);

  const uncovered = Array.isArray(adjusted.uncovered_areas)
    ? [...(adjusted.uncovered_areas as string[])]
    : [];
  for (const c of coverage.filter((x) => !x.hasUserAnswer && x.unansweredCount === 0 && x.excludedCount === 0)) {
    if (c.stageId === "intro") continue;
    const label = `${c.stageName}阶段无有效作答`;
    if (!uncovered.includes(label)) uncovered.push(label);
  }
  adjusted.uncovered_areas = uncovered;

  return adjusted;
}
