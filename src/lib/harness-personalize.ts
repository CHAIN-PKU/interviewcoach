import type { HarnessTemplate } from "./skill-loader";

/** Map UI direction label → ml_basics topic pool key */
export const DIRECTION_TOPIC_POOL: Record<string, string> = {
  扩散模型: "diffusion_models",
  贝叶斯深度学习: "bayesian_dl",
  大语言模型: "general_ml",
  具身智能: "embodied_ai",
  计算机视觉: "general_ml",
  自然语言处理: "general_ml",
  强化学习: "rl",
  AI4Science: "ai4science",
  科学机器学习: "ai4science",
};

export const DIRECTION_FOCUS_AREAS: Record<string, string[]> = {
  扩散模型: ["扩散模型", "生成模型", "score matching", "变分推断"],
  贝叶斯深度学习: ["贝叶斯方法", "变分推断", "不确定性量化", "概率图模型"],
  大语言模型: ["大语言模型", "Transformer", "对齐", "推理"],
  具身智能: ["具身智能", "机器人", "Sim2Real", "传感器融合", "模仿学习"],
  计算机视觉: ["计算机视觉", "目标检测", "分割", "多模态"],
  自然语言处理: ["自然语言处理", "预训练", "信息抽取", "对话系统"],
  强化学习: ["强化学习", "策略优化", "决策", "探索与利用"],
  AI4Science: ["AI4Science", "物理约束", "科学机器学习", "PINN", "湍流建模"],
  科学机器学习: ["科学机器学习", "物理约束", "PINN", "偏微分方程", "神经网络"],
};

function normalizeDirection(direction?: string): string {
  if (!direction?.trim()) return "";
  return direction.trim();
}

/** Personalize harness template based on user's selected research direction. */
export function personalizeHarness(
  template: HarnessTemplate,
  params: { direction?: string; targetSchool?: string; targetAdvisor?: string }
): HarnessTemplate {
  const direction = normalizeDirection(params.direction);
  if (!direction) return template;

  const cloned: HarnessTemplate = JSON.parse(JSON.stringify(template));
  const focusAreas = DIRECTION_FOCUS_AREAS[direction];
  if (focusAreas) {
    cloned.interviewer_persona = {
      ...cloned.interviewer_persona,
      focus_areas: focusAreas,
    };
  }

  cloned.stages = cloned.stages.map((stage) => {
    const ai4scienceDirs = ["AI4Science", "科学机器学习", "具身智能"];
    const useAi4ScienceSkill =
      (stage.id === "research_drill" || stage.name.includes("科研追问")) &&
      direction &&
      ai4scienceDirs.includes(direction);

    if (useAi4ScienceSkill && !stage.skills_required.includes("ai4science_questioning")) {
      stage = {
        ...stage,
        skills_required: [...stage.skills_required, "ai4science_questioning"],
      };
    }

    if (stage.id === "basics" || stage.name.includes("专业基础")) {
      return {
        ...stage,
        instructions: `考察与「${direction}」相关的 ML/DL 基础知识。必须从此方向出题，严禁出扩散模型/贝叶斯等与用户选定方向无关的题（除非用户选的就是该方向）。出 2-3 题即可。`,
      };
    }
    if (stage.id === "research_drill" || stage.name.includes("科研追问")) {
      return {
        ...stage,
        instructions: `${stage.instructions}\n【方向约束】追问必须围绕用户选定的「${direction}」方向及其科研经历，不要偏到模板默认方向。`,
      };
    }
    if (stage.id === "open" || stage.type === "open_discussion") {
      return {
        ...stage,
        instructions: `${stage.instructions}\n【方向约束】结合用户选定的「${direction}」方向讨论未来规划与匹配度。`,
      };
    }
    return stage;
  });

  return cloned;
}

export function getTopicPoolKey(direction?: string): string {
  const d = normalizeDirection(direction);
  return DIRECTION_TOPIC_POOL[d] || "general_ml";
}

export function buildDirectionContext(direction?: string): string {
  const d = normalizeDirection(direction);
  if (!d) return "";
  return `【本次训练选定方向】${d}\n- 所有阶段出题、追问必须围绕「${d}」，不要用模板默认方向（如扩散模型）替代。\n- 若学生档案中的方向与本次选择不一致，以本次选择为准。`;
}
