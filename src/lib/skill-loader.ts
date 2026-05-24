import fs from "fs";
import path from "path";
import { getTopicPoolKey } from "./harness-personalize";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");

export interface Skill {
  id: string;
  name: string;
  version: string;
  strategy: Record<string, unknown>;
  direction_key?: string;
  source?: string;
}

export interface DistilledSkill extends Skill {
  direction?: string;
  direction_key: string;
  source: "community_distill";
}

function walkJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonFiles(full));
    else if (entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

export function loadSkill(skillId: string): Skill | null {
  const skillsRoot = path.join(KNOWLEDGE_DIR, "skills");
  for (const file of walkJsonFiles(skillsRoot)) {
    try {
      const raw = fs.readFileSync(file, "utf-8");
      const skill = JSON.parse(raw) as Skill;
      if (skill.id === skillId) return skill;
    } catch {
      /* skip */
    }
  }
  return null;
}

export function loadAllSkills(): Skill[] {
  const skillsRoot = path.join(KNOWLEDGE_DIR, "skills");
  const skills: Skill[] = [];
  for (const file of walkJsonFiles(skillsRoot)) {
    try {
      const raw = fs.readFileSync(file, "utf-8");
      skills.push(JSON.parse(raw) as Skill);
    } catch {
      /* skip */
    }
  }
  return skills;
}

/** Load community-distilled skill for a research direction. */
export function loadDistilledSkill(direction?: string): DistilledSkill | null {
  const key = getTopicPoolKey(direction);
  const distilledPath = path.join(KNOWLEDGE_DIR, "skills", "distilled", `${key}.json`);
  try {
    if (!fs.existsSync(distilledPath)) return null;
    return JSON.parse(fs.readFileSync(distilledPath, "utf-8")) as DistilledSkill;
  } catch {
    return null;
  }
}

export function countDistilledPatternsForDirection(direction?: string): number {
  const skill = loadDistilledSkill(direction);
  if (!skill) return 0;
  const patterns = (skill.strategy?.probing_patterns as string[]) || [];
  const insights =
    (skill.strategy?.weakness_insights as Array<{ failure_pattern: string }>) || [];
  return patterns.length + insights.length;
}

export function countAllDistilledPatterns(): number {
  const distilledDir = path.join(KNOWLEDGE_DIR, "skills", "distilled");
  if (!fs.existsSync(distilledDir)) return 0;

  let total = 0;
  for (const f of fs.readdirSync(distilledDir).filter((x) => x.endsWith(".json"))) {
    try {
      const skill = JSON.parse(
        fs.readFileSync(path.join(distilledDir, f), "utf-8")
      ) as {
        strategy?: {
          weakness_insights?: unknown[];
          probing_patterns?: string[];
        };
      };
      const patterns = skill.strategy?.probing_patterns || [];
      const insights = skill.strategy?.weakness_insights || [];
      total += insights.length;
      total += patterns.filter(
        (p) => p.includes("[distilled:") || p.includes("distilled")
      ).length;
    } catch {
      /* skip malformed files */
    }
  }
  return total;
}

export interface HarnessTemplate {
  id: string;
  name: string;
  description: string;
  source: string;
  tags: string[];
  stages: HarnessStage[];
  interviewer_persona: InterviewerPersona;
}

export interface HarnessStage {
  id: string;
  name: string;
  type: "presentation" | "qa" | "open_discussion";
  duration_min: number;
  strict_timer: boolean;
  instructions: string;
  scoring_dims: string[];
  follow_up_depth: number;
  skills_required: string[];
  adaptive_rules: {
    extend_if: string;
    extend_max_min: number;
    skip_if: string;
    difficulty_adjust: boolean;
  };
}

export interface InterviewerPersona {
  style: string;
  focus_areas: string[];
  red_flags_to_probe: string[];
  criteria_insights: string[];
}

export function loadHarnessTemplate(
  templateId: string
): HarnessTemplate | null {
  try {
    const dir = path.join(KNOWLEDGE_DIR, "harness_templates");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const t = JSON.parse(raw) as HarnessTemplate;
      if (t.id === templateId) return t;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadAllHarnessTemplates(): HarnessTemplate[] {
  try {
    const dir = path.join(KNOWLEDGE_DIR, "harness_templates");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      return JSON.parse(raw) as HarnessTemplate;
    });
  } catch {
    return [];
  }
}

export function matchHarnessTemplate(params: {
  interviewType: string;
  targetSchool?: string;
  targetAdvisor?: string;
  direction?: string;
}): HarnessTemplate {
  const templates = loadAllHarnessTemplates();
  const { targetSchool = "", targetAdvisor = "", direction = "" } = params;
  const searchText =
    `${targetSchool} ${targetAdvisor} ${direction}`.toLowerCase();

  const scored = templates.map((t) => {
    const score = t.tags.reduce((acc, tag) => {
      return acc + (searchText.includes(tag.toLowerCase()) ? 1 : 0);
    }, 0);
    return { template: t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored[0].score === 0) {
    if (params.interviewType === "夏令营面试") {
      return (
        templates.find((t) => t.id === "general-xialingying-2025") ||
        templates[0]
      );
    }
    return (
      templates.find((t) => t.id === "general-baoyan-2025") || templates[0]
    );
  }

  return scored[0].template;
}
