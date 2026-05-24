import { callLLMText, getModelConfig } from "./model-router";
import type { HarnessTemplate } from "./skill-loader";
import { personalizeHarness } from "./harness-personalize";
import { countDistilledPatternsForDirection } from "./skill-loader";

export interface PersonalizationSummary {
  headline: string;
  rationale: string[];
  focusAreas: string[];
  stagePlan: Array<{ name: string; duration_min: number; keywords: string[] }>;
  referencesUsed: string[];
  distilledPatternsUsed: number;
  communityInsightsUsed: number;
}

export interface GenerateHarnessInput {
  baseTemplate: HarnessTemplate;
  interviewType: string;
  targetSchool?: string;
  targetAdvisor?: string;
  direction?: string;
  profileSummary?: string | null;
  experiences?: Array<{ projectName: string; contributionSummary?: string | null; methods?: string | null }>;
  weaknesses?: string | null;
  ragContext: string;
  tier?: "free" | "pro";
}

function countCommunityInsights(ragContext: string): number {
  return (ragContext.match(/\[参考\d+/g) || []).length;
}

function buildExperienceText(
  experiences?: GenerateHarnessInput["experiences"]
): string {
  if (!experiences?.length) return "（暂无结构化科研经历，面试中将通过对话了解背景）";
  return experiences
    .map(
      (e, i) =>
        `${i + 1}. ${e.projectName}${e.contributionSummary ? ` — ${e.contributionSummary}` : ""}${e.methods ? ` [方法: ${e.methods}]` : ""}`
    )
    .join("\n");
}

/** User-facing stage preview — keywords only, no specific questions (avoid 透题). */
function defaultStageKeywords(
  stageId: string,
  stageName: string,
  stageType: string,
  direction?: string
): string[] {
  const dir = direction?.trim();
  const byId: Record<string, string[]> = {
    intro: ["科研汇报", "个人贡献", "时间控制", "重点突出"],
    presentation: ["科研汇报", "个人贡献", "时间控制", "重点突出"],
    research_drill: ["技术深挖", "实现细节", "追问应对", "诚实度"],
    basics: ["专业基础", "概念理解", dir || "方向匹配"].filter(Boolean) as string[],
    open: ["组匹配度", "研究规划", "独特价值", "真诚表达"],
  };
  if (byId[stageId]) return byId[stageId].slice(0, 4);

  if (stageType === "presentation") return byId.intro;
  if (stageType === "open_discussion") return byId.open;
  if (stageName.includes("基础")) return byId.basics;
  return ["结构化考察", "追问深度", dir || "综合评估"].filter(Boolean).slice(0, 4) as string[];
}

function buildStagePlanPreview(
  stages: HarnessTemplate["stages"],
  direction?: string,
  llmPreviews?: Array<{ id: string; keywords?: string[] }>
): PersonalizationSummary["stagePlan"] {
  return stages.map((s) => {
    const fromLlm = llmPreviews?.find((p) => p.id === s.id)?.keywords?.filter(Boolean).slice(0, 4);
    return {
      name: s.name,
      duration_min: s.duration_min,
      keywords:
        fromLlm && fromLlm.length > 0
          ? fromLlm
          : defaultStageKeywords(s.id, s.name, s.type, direction),
    };
  });
}

/** AI-driven harness personalization — core wow moment. */
export async function generatePersonalizedHarness(
  input: GenerateHarnessInput
): Promise<{ template: HarnessTemplate; summary: PersonalizationSummary }> {
  const {
    baseTemplate,
    interviewType,
    targetSchool = "",
    targetAdvisor = "",
    direction = "",
    profileSummary,
    experiences,
    weaknesses,
    ragContext,
    tier = "free",
  } = input;

  const ruleBased = personalizeHarness(baseTemplate, { direction, targetSchool, targetAdvisor });
  const distilledCount = countDistilledPatternsForDirection(direction);
  const communityCount = countCommunityInsights(ragContext);

  const fallbackSummary: PersonalizationSummary = {
    headline: `为你定制：${targetSchool || "目标院校"}${targetAdvisor ? ` · ${targetAdvisor}组` : ""} ${interviewType}`,
    rationale: [
      direction ? `研究方向锁定为「${direction}」，各阶段追问与此对齐` : "按通用保研/夏令营结构编排",
      profileSummary ? "已注入你的档案摘要，追问会贴合科研经历" : "快速开始模式：考官将在对话中了解你的背景",
      distilledCount > 0
        ? `已加载 ${distilledCount} 条社区飞轮洞察（弱项→改进追问）`
        : "使用系统预置追问策略（完成训练并授权共享后可蒸馏更多）",
    ],
    focusAreas: ruleBased.interviewer_persona.focus_areas,
    stagePlan: buildStagePlanPreview(ruleBased.stages, direction),
    referencesUsed: ragContext ? ["本地面试经验索引"] : [],
    distilledPatternsUsed: distilledCount,
    communityInsightsUsed: communityCount,
  };

  const config = getModelConfig(tier);
  const prompt = `你是 InterviewCoach 的面试方案设计师。基于基础模板和用户背景，生成个性化 Harness 配置。

【基础模板】
${JSON.stringify(
  {
    id: baseTemplate.id,
    name: baseTemplate.name,
    stages: baseTemplate.stages.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      duration_min: s.duration_min,
      instructions: s.instructions,
      skills_required: s.skills_required,
      follow_up_depth: s.follow_up_depth,
    })),
    interviewer_persona: baseTemplate.interviewer_persona,
  },
  null,
  2
)}

【用户输入】
- 面试类型：${interviewType}
- 目标院校：${targetSchool || "未指定"}
- 目标导师：${targetAdvisor || "未指定"}
- 研究方向：${direction || "未指定"}

【用户档案】
${profileSummary || "（快速开始，暂无档案）"}

【科研经历】
${buildExperienceText(experiences)}

【历史薄弱点】
${weaknesses || "（首次训练，暂无）"}

【RAG 参考】
${ragContext || "（无匹配经验，按通用保研逻辑设计）"}

【社区飞轮策略】已加载 ${distilledCount} 条弱项洞察与改进追问

请输出严格 JSON（不要 markdown）：
{
  "personalization": {
    "headline": "20字以内方案标题",
    "rationale": ["设计理由1", "设计理由2", "设计理由3"],
    "referencesUsed": ["参考了哪些经验/标准，无则空数组"],
    "stage_previews": [
      { "id": "与模板 stage id 一致", "keywords": ["2-4个关键词", "不要具体题目"] }
    ]
  },
  "interviewer_persona": {
    "focus_areas": ["3-5个关注方向"],
    "red_flags_to_probe": ["2-4个需探查风险点，结合用户经历"],
    "style": "考官风格一句话"
  },
  "stages": [
    {
      "id": "与模板一致",
      "instructions": "个性化阶段指令，150字以内",
      "duration_min": "整数，可在模板±2分钟内调整"
    }
  ]
}

要求：
- stages 的 id 必须与模板完全一致，不可增删阶段
- 有导师名时 open 阶段必须问「为什么选该组」
- 有科研经历时在 research_drill 阶段点名可能追问的项目
- 方向为「${direction}」时，basics 阶段必须考该方向基础，禁止偏题
- rationale 说明编排思路即可，不要写出具体会问哪道题
- stage_previews.keywords 只写 2-4 个抽象关键词（如「物理约束」「个人贡献」），严禁写出具体追问内容、公式名、论文细节——避免透题
- stages.instructions 是考官内部指令，可具体，但不会展示给用户`;

  try {
    const raw = await callLLMText(
      config,
      "只输出 JSON 对象。",
      [{ role: "user", content: prompt }],
      20000
    );
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json");

    let parsed: {
      personalization?: {
        headline?: string;
        rationale?: string[];
        referencesUsed?: string[];
        stage_previews?: Array<{ id: string; keywords?: string[] }>;
      };
      interviewer_persona?: Partial<HarnessTemplate["interviewer_persona"]>;
      stages?: Array<{ id: string; instructions?: string; duration_min?: number }>;
    };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      // LLM JSON often has trailing commas or minor syntax issues — salvage if possible
      const repaired = match[0].replace(/,\s*([}\]])/g, "$1");
      parsed = JSON.parse(repaired);
    }

    const merged: HarnessTemplate = JSON.parse(JSON.stringify(ruleBased));
    merged.name = `${targetSchool || merged.name.split("-")[0]}${direction ? ` · ${direction}` : ""} 定制方案`;

    if (parsed.interviewer_persona) {
      merged.interviewer_persona = {
        ...merged.interviewer_persona,
        ...parsed.interviewer_persona,
        focus_areas:
          parsed.interviewer_persona.focus_areas?.length
            ? parsed.interviewer_persona.focus_areas
            : merged.interviewer_persona.focus_areas,
        red_flags_to_probe:
          parsed.interviewer_persona.red_flags_to_probe?.length
            ? parsed.interviewer_persona.red_flags_to_probe
            : merged.interviewer_persona.red_flags_to_probe,
      };
    }

    if (parsed.stages?.length) {
      for (const patch of parsed.stages) {
        const idx = merged.stages.findIndex((s) => s.id === patch.id);
        if (idx < 0) continue;
        if (patch.instructions) merged.stages[idx].instructions = patch.instructions;
        if (typeof patch.duration_min === "number" && patch.duration_min >= 1) {
          merged.stages[idx].duration_min = Math.min(
            patch.duration_min,
            merged.stages[idx].duration_min + 2
          );
        }
      }
    }

    const summary: PersonalizationSummary = {
      headline:
        parsed.personalization?.headline ||
        fallbackSummary.headline,
      rationale:
        parsed.personalization?.rationale?.filter(Boolean).slice(0, 4) ||
        fallbackSummary.rationale,
      focusAreas: merged.interviewer_persona.focus_areas,
      stagePlan: buildStagePlanPreview(
        merged.stages,
        direction,
        parsed.personalization?.stage_previews
      ),
      referencesUsed:
        parsed.personalization?.referencesUsed?.filter(Boolean) ||
        fallbackSummary.referencesUsed,
      distilledPatternsUsed: distilledCount,
      communityInsightsUsed: communityCount,
    };

    return { template: merged, summary };
  } catch (err) {
    console.error("[harness-generator] LLM fallback:", err);
    return { template: ruleBased, summary: fallbackSummary };
  }
}
