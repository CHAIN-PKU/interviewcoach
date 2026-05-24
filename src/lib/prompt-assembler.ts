import type { HarnessStage, HarnessTemplate, InterviewerPersona } from "./skill-loader";
import { loadSkill, loadDistilledSkill } from "./skill-loader";
import { getTopicPoolKey } from "./harness-personalize";

export interface AssembleInput {
  harnessConfig: HarnessTemplate;
  currentStage: HarnessStage;
  profileSummary: string;
  userDirection?: string | null;
  weaknesses?: string | null;
  prevStageSummary?: string | null;
  dialogHistory: Array<{ role: "user" | "assistant"; content: string }>;
  ragContext?: string;
  tier?: "free" | "pro";
  remainingSecs?: number;
}

export function assemblePrompt(input: AssembleInput): {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const {
    harnessConfig,
    currentStage,
    profileSummary,
    weaknesses,
    prevStageSummary,
    dialogHistory,
    ragContext,
    userDirection,
    remainingSecs,
  } = input;

  const persona: InterviewerPersona = harnessConfig.interviewer_persona;

  // Layer 1: 考官人设
  let system = `你是一位面试考官，正在进行「${harnessConfig.name}」的模拟面试。
风格：${persona.style}
重点关注方向：${persona.focus_areas.join("、")}

`;

  // Layer 2: 阶段指令
  system += `【当前阶段】${currentStage.name}（限时 ${currentStage.duration_min} 分钟）
阶段说明：${currentStage.instructions}

【内部参数·严禁在回复中出现】最大追问深度 ${currentStage.follow_up_depth} 层——仅供你内心控制追问次数，绝不可输出给用户，不可写成括号注释

`;

  // Layer 3: Skill 追问策略 — 汇报阶段不注入追问类 skill，避免汇报时出题
  const isPresentation = currentStage.type === "presentation";
  if (!isPresentation && currentStage.skills_required.length > 0) {
    const skillTexts: string[] = [];
    for (const skillId of currentStage.skills_required) {
      const skill = loadSkill(skillId);
      if (skill) {
        const strategy = { ...(skill.strategy as Record<string, unknown>) };
        delete strategy.coaching_notes;
        // For ML basics: only inject the topic pool matching user direction
        if (skillId === "ml_basics_questioning" && userDirection) {
          const poolKey = getTopicPoolKey(userDirection);
          const pools = strategy.topic_pools as Record<string, string[]> | undefined;
          if (pools?.[poolKey]) {
            strategy.topic_pools = { [poolKey]: pools[poolKey] };
            strategy.selection_rule = `必须从「${userDirection}」对应题库出题，禁止出其他方向题目。`;
          }
        }
        const strategyStr = JSON.stringify(strategy, null, 2).slice(0, 800);
        skillTexts.push(`[内部追问参考·勿输出]\n${strategyStr}`);
      }
    }
    if (skillTexts.length > 0) {
      system += skillTexts.join("\n\n") + "\n\n";
    }

    // Layer 3b: Community-distilled direction skill (weakness-driven flywheel)
    if (userDirection) {
      const distilled = loadDistilledSkill(userDirection);
      if (distilled) {
        const patterns = (distilled.strategy.probing_patterns as string[]) || [];
        const hints = (distilled.strategy.topic_hints as string[]) || [];
        const weaknessInsights =
          (distilled.strategy.weakness_insights as Array<{
            failure_pattern: string;
            root_cause: string;
            improved_probe: string;
            avoid?: string;
          }>) || [];
        if (patterns.length > 0 || hints.length > 0 || weaknessInsights.length > 0) {
          system += `【社区飞轮蒸馏·${userDirection}·内部参考·勿输出标签】\n`;
          if (weaknessInsights.length > 0) {
            system += `学生常见卡点与改进追问（优先参考）：\n`;
            for (const wi of weaknessInsights.slice(0, 5)) {
              system += `- 卡点：${wi.failure_pattern}\n  根因：${wi.root_cause}\n  建议追问：${wi.improved_probe}`;
              if (wi.avoid) system += `\n  避免：${wi.avoid}`;
              system += "\n";
            }
          }
          if (patterns.length > 0) {
            system += `改进追问模式：\n${patterns.slice(0, 6).map((p) => `- ${p.replace(/\s*\[distilled:[^\]]+\]/g, "")}`).join("\n")}\n`;
          }
          if (hints.length > 0) {
            system += `方向提示：${hints.join("；")}\n`;
          }
          system += "\n";
        }
      }
    }
  } else if (isPresentation) {
    const presSkill = loadSkill("presentation_coaching");
    if (presSkill?.strategy?.evaluation_criteria) {
      system += `【汇报阶段·内部评估参考·勿出题】\n${JSON.stringify(
        {
          evaluation_criteria: presSkill.strategy.evaluation_criteria,
          common_mistakes: presSkill.strategy.common_mistakes,
        },
        null,
        2
      )}\n\n`;
    }
  }

  // Layer 4: RAG — 汇报阶段只注入结构与节奏类经验，不注入追问题目
  const ragForStage =
    isPresentation && ragContext
      ? ragContext
          .split("\n\n")
          .filter(
            (block) =>
              block.includes("汇报") ||
              block.includes("8分钟") ||
              block.includes("时间") ||
              block.includes("结构")
          )
          .join("\n\n")
      : ragContext;

  if (ragForStage) {
    system += `【参考资料·${isPresentation ? "汇报结构与节奏" : "面试经验与评审标准"}】\n${ragForStage}\n\n`;
  }

  if (persona.criteria_insights.length > 0) {
    system += `【评估核心原则】\n${persona.criteria_insights.map((i) => `- ${i}`).join("\n")}\n\n`;
  }

  // Layer 5: 用户档案 + 历史弱点
  system += `【学生背景】\n${profileSummary}\n`;

  if (userDirection) {
    system += `\n【方向约束·最高优先级】本次训练方向：${userDirection}。所有出题必须与此方向一致。\n`;
  }

  if (remainingSecs != null && remainingSecs <= 60) {
    system += `\n【计时提醒】本阶段剩余约 ${Math.max(0, Math.floor(remainingSecs))} 秒。${remainingSecs <= 10 ? "即将到时，请做最后收尾，不要结束整个面试（除非本阶段限时已用尽）。" : "请控制节奏。"}\n`;
  }

  if (persona.red_flags_to_probe.length > 0 && !isPresentation) {
    system += `\n【需特别探查的点】\n${persona.red_flags_to_probe.map((r) => `- ${r}`).join("\n")}\n`;
  }

  if (prevStageSummary) {
    system += `\n【上一阶段表现摘要】\n${prevStageSummary}\n`;
  }

  if (weaknesses && !isPresentation) {
    system += `\n【该学生历史薄弱点（请在本次练习中适当针对）】\n${weaknesses}\n`;
  }

  // 输出格式要求
  const isLastStage =
    harnessConfig.stages.findIndex((s) => s.id === currentStage.id) ===
    harnessConfig.stages.length - 1;

  const stageOutputRule = isPresentation
    ? "【汇报阶段·最高优先级】考官全程不打断。开场仅一句邀请（如「请开始你的汇报」）。用户汇报期间：严禁提问、严禁追问、严禁说「进入提问环节」、严禁技术讨论——用户发言后你可以不回复，或最多说「请继续」（不超过6字）。所有技术问题留到「科研追问」阶段。"
    : isLastStage
      ? "【最后阶段·严禁提前结束】必须等本阶段限时用尽才能结束面试。在时间未到前：以考官身份提问或追问，严禁替学生写答案（禁止第一人称「我/我的/我想」、禁止示例陈述、禁止公式）。禁止说「面试到此结束」。"
      : "追问时根据用户上一条回答提问。不要重复已问过的话题。禁止主动切换阶段。禁止替学生作答。";

  system += `
【输出要求】
- 每次只说一件事或问一个问题，简洁有力，不要一次问多个
- 用自然口语化的中文，像真实面试考官直接说话的语气
- 【严禁】输出任何评估报告、阶段摘要、维度打分、括号旁白、内心独白；那些仅供系统后台使用
- 【严禁】在问题末尾或句中标注（追问深度N层）（追问1层）等任何内部标签——只输出考官应该说出口的自然语言
- 【严禁】输出形如「【内容完整性】」「（阶段摘要生成）」「需追问点」等内部标签
- 剩余时间不足1分钟时，催促用户：「时间快到了，请简要作答。」
- ${stageOutputRule}
- 回复控制在100字以内，除非要解释技术概念`;

  return {
    system,
    messages: dialogHistory,
  };
}

export function buildStageSummaryPrompt(
  stageName: string,
  dialogHistory: Array<{ role: "user" | "assistant"; content: string }>
): { system: string; messages: Array<{ role: "user" | "assistant"; content: string }> } {
  const system = `你是面试评估助手。请基于以下「${stageName}」阶段的对话，生成一份简洁的阶段摘要（200字以内）。

摘要格式：
1. 用户表现亮点（1-2条）
2. 暴露的薄弱点（1-2条，具体到技术点或表达问题）
3. 下一阶段建议追问方向

输出JSON格式：
{"highlights": ["..."], "weaknesses": ["..."], "next_focus": "..."}`;

  const historyText = dialogHistory
    .map((m) => `${m.role === "user" ? "学生" : "考官"}：${m.content}`)
    .join("\n");

  return {
    system,
    messages: [{ role: "user", content: historyText }],
  };
}

export function buildReportPrompt(params: {
  harnessName: string;
  profileSummary: string;
  stageSummaries: Record<string, string>;
  allQA: Array<{ stageId: string; question: string; answer: string | null; scoringExcluded?: boolean }>;
  criteriaInsights: string[];
  coverageSummary?: string;
  stages?: Array<{ id: string; name: string }>;
}): { system: string; messages: Array<{ role: "user" | "assistant"; content: string }> } {
  const unansweredCount = params.allQA.filter((q) => !q.answer?.trim() && !q.scoringExcluded).length;
  const excludedCount = params.allQA.filter((q) => q.scoringExcluded).length;

  const system = `你是严格的面试评估专家。请基于以下面试记录生成结构化评估报告。

评分原则（非常重要）：
- 各维度必须有真实差异，不允许所有维度给同一分数
- 分数段参考：90-100=卓越，75-89=良好，60-74=及格，45-59=较差，0-44=很差
- 【未回答 = 低分】answer 为「(未回答)」或空、且未被标记为时间不足的题目，question_scores 中该题得分不得超过 25
- 【时间不足除外】标记为「不计入评分」的题目不要写入 question_scores，也不要因此压低 total_score
- 某阶段已有至少一题有效作答时，该阶段按已答题表现正常评分，末段因计时未答的追问题不扣分
- 开放性问题/最后阶段未回答（且有答题时间）：方向匹配度不得超过 55，total_score 不得超过 70
- 总分必须综合所有阶段，不能只因汇报阶段表现好就给高分，也不能因时间不足未答的题给极低分
- highlights 只写确有证据的亮点
- 如果某阶段完全无用户作答（不含时间不足除外项），写入 uncovered_areas 并扣分
- 当前记录中有 ${unansweredCount} 道题未回答需扣分，${excludedCount} 道题因时间不足不计入评分

${params.coverageSummary ? `\n阶段覆盖情况（必须遵守）：\n${params.coverageSummary}\n` : ""}
改进建议原则（极其重要）：
- improvements 的 suggestion 必须是「接下来几分钟内就能完成」的微行动，例如：
  · 「把刚才那题用30秒STAR结构再说一遍，重点说你的个人贡献」
  · 「把 XX 公式用三句话口述，不要写完整推导」
  · 「下一题先说结论，再补一句理由，控制在20秒内」
- 严禁建议：系统学习某门课、补充完整理论基础、长期科研规划、换方向等需要数周以上的行动
- 每条 suggestion 必须能在 5 分钟以内完成，最好 1-2 分钟
- improvements 最多 3 条，只写最关键、最可操作的

评分标准：
${params.criteriaInsights.map((c) => `- ${c}`).join("\n")}

输出严格的JSON格式，不要有任何其他文字：
{
  "total_score": 数字(0-100),
  "score_dims": {
    "内容深度": 数字,
    "表达清晰度": 数字,
    "时间控制": 数字,
    "逻辑性": 数字,
    "方向匹配度": 数字,
    "追问应对": 数字
  },
  "highlights": ["亮点1", "亮点2"],
  "improvements": [
    {"issue": "具体问题", "suggestion": "1-2分钟内可完成的微行动", "related_stage": "阶段id"}
  ],
  "uncovered_areas": ["本次未充分考察的话题"],
  "weakness_tags": ["弱点标签1"],
  "question_scores": [
    {"question": "问题", "score": 数字, "feedback": "30字以内点评"}
  ]
}`;

  const content = `面试方案：${params.harnessName}
学生背景：${params.profileSummary}

各阶段摘要：
${Object.entries(params.stageSummaries).map(([k, v]) => `[${k}]: ${v}`).join("\n")}

问答记录：
${params.allQA
  .filter((qa) => !qa.scoringExcluded)
  .map(
    (qa, i) =>
      `Q${i + 1}[${qa.stageId}]: ${qa.question}\nA${i + 1}: ${qa.answer || "(未回答)"}`
  )
  .join("\n\n")}${
  excludedCount > 0
    ? `\n\n（以下题目因时间不足不计入评分：\n${params.allQA
        .filter((q) => q.scoringExcluded)
        .map((q) => `- [${q.stageId}] ${q.question.slice(0, 80)}`)
        .join("\n")}）`
    : ""
}`;

  return {
    system,
    messages: [{ role: "user", content }],
  };
}
