/** Domain vocabulary hint for Whisper initial_prompt — reduces homophone errors in CS/AI interviews. */
const BASE_TERMS = [
  "风速预测",
  "高空风",
  "Transformer",
  "物理一致性",
  "时间一致性",
  "物理约束",
  "知识蒸馏",
  "第一作者",
  "具身智能",
  "Sim-to-Real",
  "扩散模型",
  "贝叶斯",
  "PINN",
  "神经网络",
  "损失函数",
  "消融实验",
  "投稿",
  "AI4Science",
];

const DIRECTION_TERMS: Record<string, string[]> = {
  具身智能: ["机器人", "传感器融合", "模仿学习", "拉压弯扭", "状态估计"],
  扩散模型: ["DDPM", "score matching", "去噪", "生成模型"],
  贝叶斯深度学习: ["变分推断", "ELBO", "不确定性量化"],
  大语言模型: ["对齐", "微调", "推理", "RAG"],
  强化学习: ["策略梯度", "PPO", "奖励函数"],
};

export function buildWhisperPrompt(params?: {
  direction?: string;
  profileSummary?: string;
}): string {
  const terms = [...BASE_TERMS];
  const dir = params?.direction?.trim();
  if (dir && DIRECTION_TERMS[dir]) {
    terms.push(...DIRECTION_TERMS[dir]);
  }
  if (dir) terms.push(dir);

  // Extract likely project terms from profile (first 120 chars)
  const profile = params?.profileSummary?.slice(0, 120) ?? "";
  if (profile) terms.push(profile.replace(/\s+/g, " ").slice(0, 80));

  return `以下是中文保研/科研面试口语回答。常见术语：${[...new Set(terms)].slice(0, 30).join("、")}。`;
}
