import type { HarnessTemplate, HarnessStage } from "./skill-loader";

export interface InterviewState {
  sessionId: string;
  harnessConfig: HarnessTemplate;
  currentStageIndex: number;
  stageStartTime: number;
  dialogHistory: Array<{ role: "user" | "assistant"; content: string; ts?: number }>;
  stageSummaries: Record<string, string>;
  isComplete: boolean;
}

export function createInterviewState(
  sessionId: string,
  config: HarnessTemplate
): InterviewState {
  return {
    sessionId,
    harnessConfig: config,
    currentStageIndex: 0,
    stageStartTime: Date.now(),
    dialogHistory: [],
    stageSummaries: {},
    isComplete: false,
  };
}

export function getCurrentStage(state: InterviewState): HarnessStage {
  return state.harnessConfig.stages[state.currentStageIndex];
}

export function getElapsedMinutes(state: InterviewState): number {
  return (Date.now() - state.stageStartTime) / 60000;
}

export function shouldAdvanceStage(
  state: InterviewState,
  aiMeta?: { end_stage?: boolean }
): boolean {
  const stage = getCurrentStage(state);
  const elapsed = getElapsedMinutes(state);

  if (stage.strict_timer && elapsed >= stage.duration_min) return true;

  const maxTime =
    stage.duration_min + (stage.adaptive_rules?.extend_max_min || 0);
  if (elapsed >= maxTime) return true;

  if (aiMeta?.end_stage) return true;

  return false;
}

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /[？?]/.test(t) || /^(请问|能否|可否|如何|什么|为什么|怎么|是否)/.test(t);
}

export function advanceStage(
  state: InterviewState,
  summary: string,
  opts?: { carryDialog?: Array<{ role: "user" | "assistant"; content: string }> }
): { state: InterviewState; nextStage: HarnessStage | null } {
  const currentStage = getCurrentStage(state);
  const newState: InterviewState = {
    ...state,
    stageSummaries: { ...state.stageSummaries, [currentStage.id]: summary },
    currentStageIndex: state.currentStageIndex + 1,
    dialogHistory: opts?.carryDialog ?? [],
    stageStartTime: Date.now(),
  };

  if (newState.currentStageIndex >= newState.harnessConfig.stages.length) {
    newState.isComplete = true;
    return { state: newState, nextStage: null };
  }

  return {
    state: newState,
    nextStage: newState.harnessConfig.stages[newState.currentStageIndex],
  };
}

export function getPrevStageSummary(state: InterviewState): string | null {
  if (state.currentStageIndex === 0) return null;
  const prevId =
    state.harnessConfig.stages[state.currentStageIndex - 1].id;
  return state.stageSummaries[prevId] || null;
}

// Serialize / deserialize for DB storage
export function serializeState(state: InterviewState): string {
  return JSON.stringify({
    currentStageIndex: state.currentStageIndex,
    stageStartTime: state.stageStartTime,
    stageSummaries: state.stageSummaries,
    isComplete: state.isComplete,
    dialogHistory: state.dialogHistory,
  });
}

export function deserializeState(
  sessionId: string,
  config: HarnessTemplate,
  serialized: string
): InterviewState {
  try {
    const parsed = JSON.parse(serialized);
    return {
      sessionId,
      harnessConfig: config,
      currentStageIndex: parsed.currentStageIndex ?? 0,
      stageStartTime: parsed.stageStartTime ?? Date.now(),
      stageSummaries: parsed.stageSummaries ?? {},
      isComplete: parsed.isComplete ?? false,
      dialogHistory: parsed.dialogHistory ?? [],
    };
  } catch {
    return createInterviewState(sessionId, config);
  }
}
