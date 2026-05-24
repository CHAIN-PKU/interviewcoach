import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getModelConfig, callLLMText } from "@/lib/model-router";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("resume") as File | null;

  if (!file) return NextResponse.json({ error: "未收到文件" }, { status: 400 });

  let resumeText = "";

  try {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // pdf-parse v1 — use require() to bypass Next.js dynamic import issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");
      const pdfData = await pdfParse(buffer);
      resumeText = pdfData.text.replace(/\s+/g, " ").trim().slice(0, 6000);
    } else {
      resumeText = (await file.text()).slice(0, 6000);
    }
  } catch (e) {
    console.error("PDF parse error:", e);
    return NextResponse.json(
      { error: "PDF 解析失败，请尝试复制文本内容粘贴，或上传 TXT 格式", resumeText: "" },
      { status: 422 }
    );
  }

  if (!resumeText.trim()) {
    return NextResponse.json(
      { error: "文件内容为空或无法读取", resumeText: "" },
      { status: 422 }
    );
  }

  const config = getModelConfig(session.user.tier as "free" | "pro");

  const prompt = `请从以下简历文本中提取结构化信息。严格按JSON格式输出，不要有其他内容。

输出格式：
{
  "name": "姓名（如找不到填null）",
  "university": "本科院校",
  "major": "专业",
  "gpa": "GPA或排名",
  "experiences": [
    {
      "projectName": "项目名称",
      "timeRange": "时间段",
      "role": "core或participant",
      "methods": "使用的方法/技术",
      "outcome": "成果/结论",
      "contributionSummary": "一句话个人贡献"
    }
  ],
  "strengths": ["优势1", "优势2"],
  "concerns_guess": ["可能被追问的弱点1", "弱点2"]
}

role判断规则：第一作者/项目负责人/独立完成 → "core"；其他参与者 → "participant"

简历内容：
${resumeText}`;

  try {
    const result = await callLLMText(config,
      "你是简历解析助手，专门服务CS/AI保研学生。提取时注意区分用户自己主导的项目和参与的项目。",
      [{ role: "user", content: prompt }]
    );

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI未返回有效JSON");
    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ parsed, resumeText });
  } catch (e) {
    console.error("AI parse error:", e);
    // Return raw text so user can manually fill
    return NextResponse.json(
      { error: "AI解析失败，请手动填写表单", resumeText },
      { status: 422 }
    );
  }
}
