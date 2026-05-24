import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");

interface RAGEntry {
  id: string;
  type: "experience" | "criteria";
  summary: string;
  tags: string[];
  key_insights: string[];
  quality: number;
}

interface RAGIndex {
  entries: RAGEntry[];
}

function loadRAGIndex(): RAGIndex {
  try {
    const raw = fs.readFileSync(
      path.join(KNOWLEDGE_DIR, "rag_index.json"),
      "utf-8"
    );
    return JSON.parse(raw) as RAGIndex;
  } catch {
    return { entries: [] };
  }
}

export interface RAGResult {
  source: "index";
  content: string;
  type: string;
}

export function queryRAG(params: {
  targetSchool?: string;
  targetAdvisor?: string;
  direction?: string;
  type?: "experience" | "criteria" | "all";
  limit?: number;
}): RAGResult[] {
  const {
    targetSchool = "",
    targetAdvisor = "",
    direction = "",
    type = "all",
    limit = 4,
  } = params;

  const index = loadRAGIndex();
  const searchText =
    `${targetSchool} ${targetAdvisor} ${direction}`.toLowerCase();

  const scored = index.entries
    .filter((e) => type === "all" || e.type === type)
    .map((e) => {
      const score = e.tags.reduce((acc, tag) => {
        return acc + (searchText.includes(tag.toLowerCase()) ? e.quality : 0);
      }, 0);
      return { entry: e, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Always include high-quality criteria entries
  const criteriaEntries = index.entries
    .filter(
      (e) => e.type === "criteria" && e.quality >= 5 && type !== "experience"
    )
    .slice(0, 2);

  const results: RAGResult[] = scored.map(({ entry }) => ({
    source: "index",
    type: entry.type,
    content: `${entry.summary}\n要点：${entry.key_insights.join("；")}`,
  }));

  // Merge criteria (avoid duplicates)
  const resultIds = new Set(scored.map((s) => s.entry.id));
  for (const c of criteriaEntries) {
    if (!resultIds.has(c.id)) {
      results.push({
        source: "index",
        type: c.type,
        content: `${c.summary}\n要点：${c.key_insights.join("；")}`,
      });
    }
  }

  return results.slice(0, limit + 2);
}

export function buildRAGContext(params: {
  targetSchool?: string;
  targetAdvisor?: string;
  direction?: string;
}): string {
  const results = queryRAG({ ...params, type: "all", limit: 5 });
  if (results.length === 0) return "";

  return results
    .map((r, i) => `[参考${i + 1}·${r.type === "experience" ? "面试经验" : "评审标准"}]\n${r.content}`)
    .join("\n\n");
}
