# InterviewCoach · 面试教练 — 项目规格文档

> **本文档用途**：直接作为 Cursor 的 Project Context，指导整个项目的实现。
> 所有设计决策均已讨论确认，开发时按本文档执行即可。

---

## 一、项目背景与考核要求

### 1.1 项目概述

这是一个 16 小时项目挑战（实际有约 51 小时的窗口期，2026.5.24 08:00 - 24:00 为正式计时），目标是做一个 **AI 模拟面试官产品**，切实帮助学生准备面试。

### 1.2 考核评分标准（来自原题 PDF，需牢记）

评委重点看以下六个维度，开发时每个决策都要回扣这些标准：

1. **是否真正理解目标用户** — 我们做了真实用户调研（微信访谈 + 聊天记录分析）
2. **是否抓住最核心的产品功能闭环** — 个性化 Harness 编排 → 面试模拟 → 反馈报告，这是我们的闭环
3. **是否能做出可用的产品** — 公网可访问、可实际使用
4. **是否有效使用 AI** — 我们在建档、Harness 生成、面试追问、评分报告四个环节都深度使用 AI
5. **是否体现快速迭代能力** — commit history 要频繁且有意义
6. **是否像创业者一样思考** — 有定价页、有商业模式思考、有竞品意识

### 1.3 最终提交清单

| 交付物 | 要求 |
|--------|------|
| 3 分钟 Demo 视频 | wow moment 放前 30 秒（直接展示面试进行中的画面）|
| 可访问的产品链接 | 公网 URL，提供测试账号，加 SSH 公钥 |
| Product Memo (1-2 页) | 目标用户、设计说明、迭代记录、下一步、AI 使用 |
| GitHub 代码仓库 | public，README 完整，commit history 清晰 |
| 其他材料（可选）| 用户调研记录、架构图、竞品分析 |

### 1.4 SSH 公钥（部署时加到服务器）

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDuSpd2QiAYU0Er1upObsQitqG5JQ3senYa2imOvcDQl lbh@MacBookPro.local
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICsR0FbL2EzGpR8FytEKni4UFIznz8XiT+xHnX2puF/M di@Dis-MacBook-Air.local
```

---

## 二、产品定位与核心价值

### 2.1 一句话定位

> InterviewCoach 是一个 AI 驱动的个性化面试训练平台，不是更好的聊天机器人，而是一套懂你、训练你、追踪你进步的面试系统。

### 2.2 目标用户

准大四本科生，准备保研夏令营 / 预推免复试。核心焦虑点（来自真实用户调研）：

- 科研经历零散，不知道怎么组织成 8 分钟汇报
- 有些工作用 AI 工具完成，怕被追问细节露馅
- 不确定该重点讲什么（有成果的？有深度的？和导师方向匹配的？）
- 找不到人高频模拟追问
- 不知道教授到底看重什么

### 2.3 核心价值（与 ChatGPT 的本质区别）

**区别一：个性化 Harness 编排**
ChatGPT 的面试模拟是用户告诉它"问我问题"，节奏被动且随机。我们的系统根据用户的目标院校、导师方向、个人背景，AI 驱动生成一套贴合的结构化面试训练流。面试阶段、时长、追问策略、评分标准全部个性化。

**区别二：平台数据飞轮**
ChatGPT 每次对话从零开始。我们是平台——每一个用户的面试模拟都在让系统更聪明：Harness 模板越积越多、Skill 追问策略越来越精准、经验索引越来越全。第 1000 个用户的体验远好于第 1 个。

**区别三：结构化压力训练**
我们的计时器、阶段强制切换、语音必答模式，创造接近真实的面试压力环境。在无压力环境下练 10 次，不如在模拟压力下练 3 次。

**区别四：精准追问与进步追踪**
追问基于"你上一句回答暴露了什么"+"你的简历里这个项目用 AI 工具做的"+"你之前 3 次练习都在这里卡壳"。结构化评分让用户看到"时间控制从 60 分提到 82 分"。

---

## 三、用户完整流程

### 3.1 主流程

```
注册/登录 → 两个入口分叉：
  入口 A："60 秒快速开始"（跳过建档，只问目标面试+方向，立刻进入通用模拟）
  入口 B："完整建档"（上传简历 → AI 解析回填 → 确认档案）

两个入口最终汇合 ↓

AI 生成 Harness（3-5 轮对话 + 经验索引/联网搜索 → 生成 draft → 用户确认微调）
    ↓
选模式（练习 / 模考）+ 选档位（Free / Pro）
    ↓
开始面试（Harness 驱动 + 语音交互 + 自适应追问）
    ↓
反馈报告（结构化评分 + 逐题点评 + 改进建议）
    ↓
飞轮回流（用户评价 + consent 授权 + 数据采集）
    ↓
再练一次（下次练习注入历史薄弱点，针对性提升）
```

### 3.2 "60 秒快速开始"入口设计

目的：让用户在 60 秒内体验到核心价值，降低首次体验门槛。

```
Step 1（10 秒）：选择面试类型
  → 保研复试 / 夏令营面试 / 博士面试 / 大厂实习

Step 2（20 秒）：填写关键信息
  → 目标院校（选填）+ 研究方向（必填，如"机器学习""具身智能"）

Step 3（30 秒）：系统生成通用 Harness + 直接开始

体验过核心价值后，在反馈报告页面引导：
  "上传简历可以获得更精准的个性化追问 →"
```

---

## 四、技术架构

### 4.1 技术栈

```
前端框架: Next.js 14 (App Router)
UI 组件: Tailwind CSS + shadcn/ui
数据库: SQLite + Prisma ORM
认证: NextAuth.js (Credentials Provider, 邮箱+密码)
AI 模型:
  - Free 档: 豆包 doubao-pro-32k (火山引擎 API)
  - Pro 档: Claude Sonnet 4 (Anthropic API)
语音:
  - STT: Web Speech API (浏览器原生, 免费)
  - TTS: 火山引擎 TTS API (中文效果好, ¥0.01/千字符)
部署: 阿里云/腾讯云轻量服务器 (Node.js)
```

### 4.2 项目目录结构

```
interview-coach/
├── README.md
├── package.json
├── next.config.js
├── prisma/
│   └── schema.prisma              # 数据模型定义
├── public/
│   └── assets/                    # 静态资源（考官头像等）
├── knowledge/                     # 知识层（不进数据库，文件系统管理）
│   ├── skills/                    # Skill 策略模板
│   │   ├── research_questioning.json
│   │   ├── presentation_coaching.json
│   │   ├── code_implementation_probing.json
│   │   ├── ml_basics_questioning.json
│   │   └── open_questions.json
│   ├── harness_templates/         # 预置 Harness 配置
│   │   ├── tsinghua_cs_zhujun.json
│   │   ├── general_baoyan.json
│   │   └── general_xialingying.json
│   └── rag_index.json             # 经验索引（URL + 标签 + 摘要）
├── src/
│   ├── app/                       # Next.js App Router 页面
│   │   ├── layout.tsx             # 全局 Layout
│   │   ├── page.tsx               # Landing Page
│   │   ├── login/
│   │   │   └── page.tsx           # 登录/注册
│   │   ├── dashboard/
│   │   │   └── page.tsx           # 主控台（历史记录+快速开始）
│   │   ├── profile/
│   │   │   └── edit/
│   │   │       └── page.tsx       # 面试档案编辑（含简历上传）
│   │   ├── harness/
│   │   │   ├── setup/
│   │   │   │   └── page.tsx       # AI 生成 Harness（对话式）
│   │   │   └── editor/
│   │   │       └── page.tsx       # Harness 表单编辑器
│   │   ├── interview/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # 面试进行页（核心）
│   │   ├── report/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # 反馈报告页
│   │   ├── pricing/
│   │   │   └── page.tsx           # 定价页
│   │   └── api/                   # API Routes
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts   # NextAuth 配置
│   │       ├── profile/
│   │       │   └── route.ts       # 档案 CRUD
│   │       ├── upload/
│   │       │   └── route.ts       # 简历上传+AI 解析
│   │       ├── harness/
│   │       │   ├── route.ts       # Harness CRUD
│   │       │   └── generate/
│   │       │       └── route.ts   # AI 生成 Harness
│   │       ├── interview/
│   │       │   ├── route.ts       # Session CRUD
│   │       │   └── chat/
│   │       │       └── route.ts   # 流式对话（核心）
│   │       ├── report/
│   │       │   └── route.ts       # 报告生成
│   │       └── feedback/
│   │           └── route.ts       # 飞轮数据采集
│   ├── components/                # UI 组件
│   │   ├── ui/                    # shadcn/ui 基础组件
│   │   ├── landing/               # Landing Page 组件
│   │   ├── profile/               # 档案相关组件
│   │   │   ├── ResumeUploader.tsx
│   │   │   ├── ProfileForm.tsx
│   │   │   └── ExperienceCard.tsx
│   │   ├── harness/               # Harness 相关组件
│   │   │   ├── HarnessChat.tsx    # AI 对话生成界面
│   │   │   ├── HarnessPreview.tsx # Harness 可视化预览
│   │   │   └── HarnessEditor.tsx  # 表单编辑器
│   │   ├── interview/             # 面试页组件
│   │   │   ├── InterviewLayout.tsx    # 混合布局容器
│   │   │   ├── InterviewerPanel.tsx   # 左侧考官面板
│   │   │   ├── ChatFlow.tsx           # 右侧对话流
│   │   │   ├── VoiceInput.tsx         # 语音输入组件
│   │   │   ├── Timer.tsx              # 计时器
│   │   │   └── StageProgress.tsx      # 阶段进度条
│   │   ├── report/                # 报告相关组件
│   │   │   ├── ScoreRadar.tsx     # 雷达图
│   │   │   ├── QuestionReview.tsx # 逐题点评
│   │   │   └── ProgressChart.tsx  # 进步曲线
│   │   └── feedback/              # 飞轮反馈组件
│   │       ├── QuestionRating.tsx # 问题 👍👎
│   │       └── ConsentModal.tsx   # 数据授权弹窗
│   ├── lib/                       # 核心逻辑
│   │   ├── db.ts                  # Prisma client
│   │   ├── auth.ts                # NextAuth 配置
│   │   ├── model-router.ts        # 多模型路由
│   │   ├── harness-engine.ts      # Harness 状态机引擎
│   │   ├── prompt-assembler.ts    # Prompt 5 层组装器
│   │   ├── rag-router.ts          # RAG 索引查询 + 联网搜索
│   │   ├── skill-loader.ts        # Skill 模板加载器
│   │   ├── resume-parser.ts       # 简历解析 + 结构化提取
│   │   ├── tts.ts                 # TTS 调用封装
│   │   └── types.ts               # 全局类型定义
│   └── hooks/                     # React Hooks
│       ├── useVoiceInput.ts       # 语音输入 hook
│       ├── useTimer.ts            # 计时器 hook
│       └── useInterview.ts        # 面试状态管理 hook
└── docs/
    └── product-memo.md            # Product Memo
```

### 4.3 数据模型 (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  tier         String   @default("free") // "free" | "pro"
  proCode      String?  // 体验码
  createdAt    DateTime @default(now())
  
  profile      Profile?
  sessions     Session[]
}

model Profile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  
  // 基本信息
  university      String?
  major           String?
  gpa             String?
  
  // 目标信息
  targetSchool    String?
  targetAdvisor   String?
  advisorDirection String?
  
  // 自我评估
  strengths       String?  // JSON array
  concerns        String?  // JSON array
  
  // AI 生成的摘要（所有 prompt 共用）
  profileSummary  String?  // 200 字结构化摘要
  
  // 原始简历文本
  resumeText      String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  experiences     Experience[]
  sessions        Session[]
}

model Experience {
  id               String   @id @default(cuid())
  profileId        String
  profile          Profile  @relation(fields: [profileId], references: [id])
  
  projectName      String
  timeRange        String?
  role             String   @default("participant") // "core" | "participant"
  methods          String?  // 使用的方法/技术栈
  outcome          String?  // 成果
  contributionSummary String? // 一句话贡献
  sortOrder        Int      @default(0)
  
  createdAt        DateTime @default(now())
}

model HarnessTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  config      String   // JSON: 完整的 harness 配置
  source      String   @default("system") // "system" | "ai_generated" | "user_created" | "community"
  tags        String?  // JSON array: ["清华", "计算机", "ML"]
  createdBy   String?
  useCount    Int      @default(0)
  avgRating   Float?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  sessions    Session[]
}

model Session {
  id          String   @id @default(cuid())
  profileId   String?
  profile     Profile? @relation(fields: [profileId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  harnessId   String?
  harness     HarnessTemplate? @relation(fields: [harnessId], references: [id])
  
  mode        String   @default("practice") // "practice" | "exam"
  status      String   @default("in_progress") // "in_progress" | "completed" | "abandoned"
  currentStage String?
  
  // Harness config snapshot（防止模板被修改后影响历史记录）
  harnessSnapshot String? // JSON
  
  // 评分
  totalScore  Float?
  scoreDims   String?  // JSON: { "内容深度": 78, "表达清晰度": 70, ... }
  
  // 飞轮数据
  userRating    Int?     // 1-5 整体评分
  userFeedback  String?
  consentToShare Boolean @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  qaRecords   QARecord[]
}

model QARecord {
  id          String   @id @default(cuid())
  sessionId   String
  session     Session  @relation(fields: [sessionId], references: [id])
  
  stageId     String   // 对应 harness stage 的 id
  question    String
  answer      String?
  
  // 追问链
  followUpDepth Int    @default(0) // 第几层追问
  parentId    String?  // 上一个 QA 的 id，形成追问链
  
  // 评分与反馈
  score       Float?
  feedback    String?
  
  // 飞轮：用户对该问题的评价
  userThumbsUp Boolean?  // true=👍, false=👎, null=未评价
  
  createdAt   DateTime @default(now())
}

model WeaknessSummary {
  id        String   @id @default(cuid())
  userId    String
  
  // JSON: { "ablation设计细节": 0.6, "具身项目贡献": 0.5, ... }
  // value 0-1，越低越弱
  weaknesses String
  
  // 基于哪些 session 生成的
  basedOnSessions String  // JSON array of session ids
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 五、核心模块详细设计

### 5.1 简历上传 → AI 解析建档

**流程**：用户上传 PDF → 后端 pdf-parse 提取文本 → 调 LLM 结构化提取 → JSON 回填表单

**关键 Prompt（简历解析用）**：

```
你是一个简历解析助手。请从以下简历文本中提取结构化信息。

要求：
1. 严格按照 JSON 格式输出，不要添加任何其他内容
2. 如果某个字段在简历中找不到，填 null
3. 科研经历按时间倒序排列
4. role 字段判断标准：如果是第一作者/项目负责人/独立完成，填 "core"；否则填 "participant"

输出格式：
{
  "name": "姓名",
  "university": "院校",
  "major": "专业",
  "gpa": "GPA/排名",
  "experiences": [
    {
      "projectName": "项目名称",
      "timeRange": "2024.9-至今",
      "role": "core|participant",
      "methods": "使用的方法/技术栈",
      "outcome": "成果（论文/专利/阶段性结果）",
      "contributionSummary": "一句话总结你的贡献"
    }
  ],
  "skills": ["技能1", "技能2"],
  "awards": ["获奖1", "获奖2"]
}

简历文本：
{resume_text}
```

**AI 建档后的 Profile Summary 生成 Prompt**：

```
请基于以下用户信息，生成一份 200 字以内的结构化摘要。这份摘要将在后续的面试模拟中反复使用。

要求：
1. 突出与目标方向最匹配的经历
2. 标注用户的核心优势和潜在弱点
3. 如果用户填写了"担心被问到的问题"，在摘要中标注

用户信息：
- 院校专业：{university} {major}
- 目标：{targetSchool} {targetAdvisor} ({advisorDirection})
- 科研经历：{experiences_json}
- 自评优势：{strengths}
- 担心的问题：{concerns}
```

### 5.2 Harness 配置数据结构

```typescript
// src/lib/types.ts

interface HarnessConfig {
  id: string;
  name: string;
  description: string;
  source: "system" | "ai_generated" | "user_created" | "community";
  tags: string[];
  
  stages: Stage[];
  
  interviewer_persona: {
    style: string;         // "学术严谨但不刁难"
    focus_areas: string[]; // ["扩散模型", "贝叶斯"]
    red_flags_to_probe: string[]; // ["用AI工具完成的工作要追问理解深度"]
    criteria_insights: string[]; // 来自RAG通道C的教授面试标准
  };
  
  metadata: {
    created_by: string | null;
    created_at: string;
    use_count: number;
    avg_rating: number | null;
  };
}

interface Stage {
  id: string;
  name: string;
  type: "presentation" | "qa" | "open_discussion";
  duration_min: number;
  strict_timer: boolean;
  prompt_template: string; // prompt 模板的 key
  instructions: string;    // 给 AI 的阶段指令
  scoring_dims: string[];  // ["内容完整性", "时间控制", ...]
  follow_up_depth: number; // 最多追问几层
  skills_required: string[]; // 需要加载的 skill 文件名
  rag_sources: string[];   // RAG 索引中需要查询的 type
  
  adaptive_rules: {
    extend_if: string;       // 延长条件描述
    extend_max_min: number;  // 最多延长几分钟
    skip_if: string;         // 跳过条件描述
    difficulty_adjust: boolean; // 是否动态调难度
  };
}
```

**预置 Harness 示例 — 清华朱军组**：

```json
{
  "id": "tsinghua-cs-zhujun-2025",
  "name": "清华计算机-朱军组夏令营",
  "description": "汇报8分钟+提问7分钟，侧重扩散模型/贝叶斯方向",
  "source": "system",
  "tags": ["清华", "计算机", "朱军", "夏令营", "ML"],
  
  "stages": [
    {
      "id": "intro",
      "name": "个人汇报",
      "type": "presentation",
      "duration_min": 8,
      "strict_timer": true,
      "prompt_template": "intro_presentation",
      "instructions": "用户进行自我介绍和科研汇报。考官不打断，到时间提醒。结束后生成阶段摘要。",
      "scoring_dims": ["内容完整性", "重点突出度", "时间控制", "表达流畅度"],
      "follow_up_depth": 0,
      "skills_required": ["presentation_coaching"],
      "rag_sources": [],
      "adaptive_rules": {
        "extend_if": "",
        "extend_max_min": 0,
        "skip_if": "",
        "difficulty_adjust": false
      }
    },
    {
      "id": "research_drill",
      "name": "科研追问",
      "type": "qa",
      "duration_min": 4,
      "strict_timer": false,
      "prompt_template": "research_deep_dive",
      "instructions": "基于用户汇报内容和科研经历，深挖技术细节。优先追问与目标导师方向匹配的项目。",
      "scoring_dims": ["技术深度", "问题分析能力", "诚实度"],
      "follow_up_depth": 3,
      "skills_required": ["research_questioning", "code_implementation_probing"],
      "rag_sources": ["criteria"],
      "adaptive_rules": {
        "extend_if": "用户回答深度高且有追问空间",
        "extend_max_min": 2,
        "skip_if": "用户连续2次明确表示不了解",
        "difficulty_adjust": true
      }
    },
    {
      "id": "basics",
      "name": "专业基础",
      "type": "qa",
      "duration_min": 2,
      "strict_timer": false,
      "prompt_template": "domain_basics",
      "instructions": "考察ML/DL基础知识，难度适中。根据目标方向出题。",
      "scoring_dims": ["知识广度", "概念清晰度"],
      "follow_up_depth": 1,
      "skills_required": ["ml_basics_questioning"],
      "rag_sources": [],
      "adaptive_rules": {
        "extend_if": "",
        "extend_max_min": 1,
        "skip_if": "",
        "difficulty_adjust": true
      }
    },
    {
      "id": "open",
      "name": "开放性问题",
      "type": "open_discussion",
      "duration_min": 1,
      "strict_timer": false,
      "prompt_template": "open_questions",
      "instructions": "询问未来规划、为什么选这个组、你能给课题组带来什么价值。",
      "scoring_dims": ["规划清晰度", "匹配度", "真诚度"],
      "follow_up_depth": 1,
      "skills_required": ["open_questions"],
      "rag_sources": [],
      "adaptive_rules": {
        "extend_if": "",
        "extend_max_min": 0,
        "skip_if": "",
        "difficulty_adjust": false
      }
    }
  ],
  
  "interviewer_persona": {
    "style": "学术严谨但不刁难，会追问技术细节但态度温和。语速适中，给学生思考时间。",
    "focus_areas": ["扩散模型", "贝叶斯深度学习", "生成模型", "变分推断"],
    "red_flags_to_probe": ["用AI工具完成的工作要追问真实理解深度", "团队项目中要区分个人贡献"],
    "criteria_insights": [
      "说不知道比编答案强100倍",
      "追问时看的是思考过程不是最终答案",
      "能清晰区分自己做了什么和别人做了什么",
      "有失败经历但能分析原因的比一路顺利的更加分"
    ]
  }
}
```

### 5.3 Harness AI 生成流程

这是核心差异化功能。用户通过 3-5 轮对话提供碎片信息，系统结合 RAG 索引和联网搜索，AI 生成完整的 Harness 配置。

**对话式生成的 System Prompt**：

```
你是 InterviewCoach 的面试方案设计师。你的任务是通过 3-5 轮对话，收集用户的面试信息，然后生成一个结构化的面试模拟方案 (Harness)。

你需要收集的信息：
1. 面试类型（保研/夏令营/实习）
2. 目标院校和导师（如果知道的话）
3. 面试的具体流程（时长、环节安排）
4. 导师/学校的特殊偏好（如果知道的话）
5. 用户特别想练习的方面

收集策略：
- 用户知道的信息越多，你问的越少
- 用户不知道具体流程，你就参考提供的 RAG 信息来补全
- RAG 也没有相关信息，你就基于通用保研面试经验设计
- 每轮最多问 1-2 个问题，不要一次问太多

当你收集到足够信息后，生成一个 Harness 配置 JSON，格式如下：
{harness_config_schema}

在生成 Harness 后，用简洁的中文向用户解释你的设计思路，特别是：
- 为什么这样安排阶段和时长
- 你会重点追问哪些方面
- 如果 RAG 提供了经验信息，说明你参考了哪些

用户可能会要求修改，你需要灵活调整并重新输出 JSON。

以下是来自经验索引的参考信息（如果有的话）：
{rag_context}

以下是用户的简历摘要（如果有的话）：
{profile_summary}
```

### 5.4 RAG 索引 + 联网搜索

**rag_index.json 结构**：

```json
{
  "entries": [
    {
      "id": "exp_001",
      "type": "experience",
      "url": "https://zhuanlan.zhihu.com/p/xxx",
      "summary": "清华朱军组2024夏令营，汇报8min+提问7min，重点问扩散模型",
      "tags": ["清华", "计算机", "朱军", "夏令营", "2024"],
      "key_insights": ["先汇报后提问", "重点追问科研细节", "会问专业基础"],
      "quality": 4
    },
    {
      "id": "criteria_001",
      "type": "criteria",
      "url": "https://www.zhihu.com/question/yyy",
      "summary": "某985教授分享面试看重什么",
      "tags": ["面试标准", "教授视角", "通用"],
      "key_insights": [
        "说不知道比编答案强100倍",
        "追问时看思考过程不是最终答案",
        "能清晰区分自己做的和别人做的",
        "有失败经历能分析原因更加分"
      ],
      "quality": 5
    }
  ]
}
```

**rag-router.ts 核心逻辑**：

```typescript
// src/lib/rag-router.ts

interface RAGResult {
  source: "index" | "web_search";
  content: string;
  url?: string;
}

async function queryRAG(
  targetSchool: string,
  targetAdvisor: string,
  direction: string,
  type: "experience" | "criteria" | "all"
): Promise<RAGResult[]> {
  const results: RAGResult[] = [];
  
  // Step 1: 查本地索引
  const index = loadRAGIndex();
  const matches = index.entries.filter(entry => {
    if (type !== "all" && entry.type !== type) return false;
    const searchText = `${targetSchool} ${targetAdvisor} ${direction}`;
    return entry.tags.some(tag => searchText.includes(tag));
  });
  
  if (matches.length > 0) {
    // 命中 → fetch 原文 URL 获取详细内容
    for (const match of matches.slice(0, 3)) {
      try {
        const content = await fetchURL(match.url);
        results.push({ source: "index", content, url: match.url });
      } catch {
        // fetch 失败就用摘要
        results.push({ 
          source: "index", 
          content: match.summary + "\n要点：" + match.key_insights.join("；") 
        });
      }
    }
  }
  
  // Step 2: 索引没命中或结果不够 → 联网搜索
  if (results.length < 2) {
    const searchQuery = `${targetSchool} ${targetAdvisor || direction} 保研面试经验 2024 2025`;
    const webResults = await webSearch(searchQuery);
    for (const r of webResults.slice(0, 3)) {
      results.push({ source: "web_search", content: r.snippet, url: r.url });
    }
  }
  
  return results;
}
```

### 5.5 Prompt 5 层组装器

面试运行时，每次 AI 生成问题或回复，需要组装一个完整的 prompt。

```typescript
// src/lib/prompt-assembler.ts

interface AssembleInput {
  harnessConfig: HarnessConfig;
  currentStage: Stage;
  profileSummary: string;
  prevStageSummary: string | null;  // 上一阶段的 AI 摘要
  weaknessSummary: string | null;   // 用户历史薄弱点
  dialogHistory: Message[];         // 本阶段对话历史
  ragContext: string;               // RAG 查询结果（criteria 类型）
}

function assemblePrompt(input: AssembleInput): {
  system: string;
  messages: Message[];
} {
  const { harnessConfig, currentStage, profileSummary, 
          prevStageSummary, weaknessSummary, dialogHistory, ragContext } = input;
  
  // ===== Layer 1: 考官人设 =====
  let system = `你是一位面试考官，正在进行${harnessConfig.name}的模拟面试。
你的风格：${harnessConfig.interviewer_persona.style}
你重点关注的方向：${harnessConfig.interviewer_persona.focus_areas.join("、")}
`;

  // ===== Layer 2: 阶段指令 =====
  system += `\n当前阶段：${currentStage.name}（${currentStage.duration_min}分钟）
阶段指令：${currentStage.instructions}
评分维度：${currentStage.scoring_dims.join("、")}
最大追问深度：${currentStage.follow_up_depth}层
`;

  // ===== Layer 3: Skill 策略 =====
  for (const skillName of currentStage.skills_required) {
    const skill = loadSkill(skillName);
    if (skill) {
      system += `\n追问策略（${skill.name}）：
${JSON.stringify(skill.strategy, null, 2)}
`;
    }
  }

  // ===== Layer 4: RAG 知识（教授面试标准）=====
  if (ragContext) {
    system += `\n面试评判参考（来自资深教授的经验）：
${ragContext}
`;
  }
  
  // 注入 criteria_insights
  if (harnessConfig.interviewer_persona.criteria_insights.length > 0) {
    system += `\n你在评估学生时的核心原则：
${harnessConfig.interviewer_persona.criteria_insights.map(i => `- ${i}`).join("\n")}
`;
  }

  // ===== Layer 5: 用户档案 + 历史 =====
  system += `\n该学生的背景摘要：
${profileSummary}
`;

  if (harnessConfig.interviewer_persona.red_flags_to_probe.length > 0) {
    system += `\n需要特别探查的点（基于学生自我评估）：
${harnessConfig.interviewer_persona.red_flags_to_probe.map(r => `- ${r}`).join("\n")}
`;
  }

  if (prevStageSummary) {
    system += `\n上一阶段（${currentStage.id}之前）的表现摘要：
${prevStageSummary}
`;
  }

  if (weaknessSummary) {
    system += `\n该学生的历史薄弱点（来自之前的练习，请适当针对这些方面追问）：
${weaknessSummary}
`;
  }

  // ===== 自适应指令 =====
  if (currentStage.adaptive_rules.difficulty_adjust) {
    system += `\n自适应规则：
- 如果学生回答有深度，提升追问难度
- 如果学生明显答不上来（连续2次表示不清楚），降低难度或转移话题
- 每次回复时在末尾附加一个 JSON 标记（用 <!-- --> 包裹用户不可见）：
  <!-- {"continue": true/false, "difficulty": "up/same/down", "end_stage": true/false} -->
`;
  }

  // ===== 输出格式要求 =====
  system += `\n输出要求：
- 每次只问一个问题，简洁有力
- 用口语化的中文，像真实面试官的语气
- 不要在回复中包含评分或反馈（练习模式的即时反馈由单独调用生成）
- 不要说"好的"、"不错"等过于肯定的词，保持面试官的中立态度
`;

  return {
    system,
    messages: dialogHistory
  };
}
```

### 5.6 面试引擎状态机

```typescript
// src/lib/harness-engine.ts

interface InterviewState {
  sessionId: string;
  harnessConfig: HarnessConfig;
  currentStageIndex: number;
  stageStartTime: number;
  dialogHistory: Message[];       // 当前阶段的对话
  stageSummaries: Record<string, string>; // stageId → 摘要
  isComplete: boolean;
}

class HarnessEngine {
  private state: InterviewState;

  constructor(sessionId: string, config: HarnessConfig) {
    this.state = {
      sessionId,
      harnessConfig: config,
      currentStageIndex: 0,
      stageStartTime: Date.now(),
      dialogHistory: [],
      stageSummaries: {},
      isComplete: false
    };
  }

  getCurrentStage(): Stage {
    return this.state.harnessConfig.stages[this.state.currentStageIndex];
  }

  getElapsedMinutes(): number {
    return (Date.now() - this.state.stageStartTime) / 60000;
  }

  shouldAdvanceStage(aiMetadata?: { continue: boolean; end_stage: boolean }): boolean {
    const stage = this.getCurrentStage();
    const elapsed = this.getElapsedMinutes();
    
    // 时间到了且是严格计时
    if (stage.strict_timer && elapsed >= stage.duration_min) return true;
    
    // 弹性时间：基础时间 + 最大延长
    const maxTime = stage.duration_min + (stage.adaptive_rules?.extend_max_min || 0);
    if (elapsed >= maxTime) return true;
    
    // AI 建议结束阶段
    if (aiMetadata?.end_stage) return true;
    
    return false;
  }

  async advanceStage(): Promise<{ 
    nextStage: Stage | null; 
    summary: string;
  }> {
    // 1. 生成当前阶段摘要
    const summary = await this.generateStageSummary();
    const currentStage = this.getCurrentStage();
    this.state.stageSummaries[currentStage.id] = summary;
    
    // 2. 推进到下一阶段
    this.state.currentStageIndex++;
    this.state.dialogHistory = []; // 清空对话历史
    this.state.stageStartTime = Date.now();
    
    // 3. 判断是否所有阶段完成
    if (this.state.currentStageIndex >= this.state.harnessConfig.stages.length) {
      this.state.isComplete = true;
      return { nextStage: null, summary };
    }
    
    return { nextStage: this.getCurrentStage(), summary };
  }

  private async generateStageSummary(): Promise<string> {
    // 调 LLM 生成阶段摘要（200 token 以内）
    // 输入：本阶段的对话历史
    // 输出：用户表现的关键点、暴露的弱点、值得继续追问的方向
    // 这个摘要传给下一阶段的 prompt
  }

  addMessage(role: "user" | "assistant", content: string) {
    this.state.dialogHistory.push({ role, content });
  }

  getPrevStageSummary(): string | null {
    const stages = this.state.harnessConfig.stages;
    if (this.state.currentStageIndex === 0) return null;
    const prevStageId = stages[this.state.currentStageIndex - 1].id;
    return this.state.stageSummaries[prevStageId] || null;
  }
}
```

### 5.7 多模型路由

```typescript
// src/lib/model-router.ts

interface ModelConfig {
  provider: "anthropic" | "volcengine";
  model: string;
  apiKey: string;
  baseURL: string;
  maxTokens: number;
}

function getModelConfig(tier: "free" | "pro"): ModelConfig {
  if (tier === "pro") {
    return {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseURL: "https://api.anthropic.com",
      maxTokens: 1024
    };
  }
  return {
    provider: "volcengine",
    model: "doubao-pro-32k",
    apiKey: process.env.VOLCENGINE_API_KEY!,
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    maxTokens: 1024
  };
}

// 统一的调用接口，屏蔽不同 provider 的差异
async function callLLM(
  config: ModelConfig,
  system: string,
  messages: Message[],
  stream: boolean = true
): Promise<ReadableStream | string> {
  if (config.provider === "anthropic") {
    // 调 Anthropic Messages API
    // POST https://api.anthropic.com/v1/messages
  } else if (config.provider === "volcengine") {
    // 调豆包 API（兼容 OpenAI 格式）
    // POST https://ark.cn-beijing.volces.com/api/v3/chat/completions
  }
}
```

### 5.8 语音管线

```typescript
// STT: src/hooks/useVoiceInput.ts
// 使用浏览器原生 Web Speech API

function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  
  const startListening = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      const result = Array.from(event.results)
        .map(r => r[0].transcript)
        .join("");
      setTranscript(result);
    };
    
    recognition.start();
    setIsListening(true);
  };
  
  return { isListening, transcript, startListening, stopListening };
}

// TTS: src/lib/tts.ts
// 使用火山引擎 TTS API

async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const response = await fetch("https://openspeech.bytedance.com/api/v1/tts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.VOLCENGINE_TTS_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      app: { appid: process.env.VOLCENGINE_APP_ID },
      user: { uid: "interview-coach" },
      audio: { voice_type: "zh_male_rap", encoding: "mp3" },
      request: { text, operation: "query" }
    })
  });
  return response.arrayBuffer();
}

// 降级方案：如果火山引擎 API 不可用，用浏览器原生 SpeechSynthesis
function fallbackTTS(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
```

### 5.9 反馈报告生成

面试全部阶段结束后，调 LLM 生成结构化报告。

**报告生成 Prompt**：

```
你是面试评估专家。请基于以下面试记录生成一份结构化评估报告。

面试配置：{harness_config_summary}
学生背景：{profile_summary}

各阶段问答记录：
{all_qa_records_formatted}

请输出以下 JSON 格式的评估报告：
{
  "total_score": 72,
  "score_dims": {
    "内容深度": 78,
    "表达清晰度": 70,
    "时间控制": 85,
    "逻辑性": 68,
    "方向匹配度": 75,
    "追问应对": 60
  },
  "highlights": [
    "主动讲了失败案例和分析思路，体现诚实",
    "时间控制好，8分钟汇报用了7:42"
  ],
  "improvements": [
    {
      "issue": "被追问ablation设计细节时含糊",
      "suggestion": "建议复习实验设计的具体步骤和参数选择理由",
      "related_stage": "research_drill"
    }
  ],
  "weakness_update": {
    "ablation设计细节": 0.6,
    "具身项目贡献": 0.5,
    "AI工具使用坦诚度": 0.7
  },
  "question_scores": [
    {
      "question": "你尝试了哪些加速方法？",
      "score": 75,
      "feedback": "回答有内容但缺少定量对比"
    }
  ]
}

评分标准：
- 参考以下教授的面试评判标准：{criteria_insights}
- 总分 0-100，各维度独立评分
- highlights 至少 2 条（增强学生信心）
- improvements 具体到可执行的建议
- weakness_update 中 0-1 的值代表该方面的掌握程度，越低越需要练习
```

### 5.10 定价页 + 体验码

```
定价设计：
- Free: 每天 3 次完整模拟，基础报告，豆包模型
- Pro 月卡: ¥29/月，无限次，详细报告+进步追踪，Claude Sonnet
- 单次 Pro: ¥5/次

16h 内不接真实支付。实现方式：
- 定价页面展示三种方案（静态页面）
- Pro 解锁通过"体验码"输入框
- 给评委准备体验码：DEMO2026
- 输入体验码 → user.tier 改为 "pro"
```

---

## 六、Skill 模板

### 6.1 research_questioning.json

```json
{
  "id": "research_questioning",
  "name": "科研追问策略",
  "version": "1.0",
  "strategy": {
    "question_selection": "从用户科研经历中选择与目标导师方向最匹配的1-2个项目深挖。优先选用户标记为core角色的项目。",
    "follow_up_rules": [
      "第1层：让用户概述项目，观察是否只讲表面。问法：'能详细介绍一下你在XX项目中的工作吗？'",
      "第2层：针对用户提到的具体技术追问 why 和 how。问法：'你提到用了XX方法，为什么选它？有没有对比过其他方案？'",
      "第3层：追问失败/困难 case。问法：'做这个过程中最难的部分是什么？你是怎么解决的？'",
      "兜底：如果用户坦诚说不清楚，给予正面评价并转移到下一个话题"
    ],
    "probing_patterns": [
      "你提到用了{method}，能解释一下它的核心原理吗？",
      "这个实验的baseline是什么？你的方法比baseline好多少？",
      "如果让你重新做这个项目，你会有什么不同的选择？",
      "你在团队中具体负责哪个环节？其他成员做了什么？",
      "这个{outcome}是怎么评估的？用了什么指标？",
      "你觉得这个工作最大的 limitation 是什么？"
    ]
  }
}
```

### 6.2 presentation_coaching.json

```json
{
  "id": "presentation_coaching",
  "name": "汇报评估策略",
  "version": "1.0",
  "strategy": {
    "evaluation_criteria": [
      "是否在前30秒清楚说明了自己是谁、做什么方向",
      "科研经历是否按重要性排序，而非纯时间线",
      "是否突出了与目标导师方向匹配的经历",
      "是否控制好时间（±30秒以内为优）",
      "是否提到了未来规划和对课题组的价值"
    ],
    "common_mistakes": [
      "花太多时间在教育背景，科研部分被压缩",
      "每个项目平均分配时间，没有重点",
      "只说做了什么，不说为什么做和学到什么",
      "超时或大幅提前结束"
    ]
  }
}
```

### 6.3 code_implementation_probing.json

```json
{
  "id": "code_implementation_probing",
  "name": "代码实现追问策略",
  "version": "1.0",
  "strategy": {
    "trigger": "当用户提到自己实现了某个算法或系统时触发",
    "probing_patterns": [
      "这个{component}的代码是你从头写的还是基于开源实现改的？",
      "你用的{framework}版本是什么？遇到过兼容性问题吗？",
      "训练过程中遇到过什么工程问题？比如显存不够、训练不稳定？",
      "如果我让你现在在白板上画出{module}的核心流程，你会怎么画？"
    ],
    "ai_tool_detection": [
      "如果用户提到'我用了Claude/GPT来帮忙写代码'，不要负面评价，而是追问：'那你能解释一下它生成的代码的核心逻辑吗？'",
      "如果用户对实现细节含糊，温和地说：'没关系，不需要记住每一行代码，但核心的设计思路能说说吗？'"
    ]
  }
}
```

### 6.4 ml_basics_questioning.json

```json
{
  "id": "ml_basics_questioning",
  "name": "ML基础出题策略",
  "version": "1.0",
  "strategy": {
    "topic_pools": {
      "diffusion_models": [
        "扩散模型的前向过程和反向过程分别在做什么？",
        "DDPM 和 DDIM 的核心区别是什么？",
        "score matching 和 denoising score matching 有什么联系？",
        "classifier-free guidance 的原理是什么？为什么有效？"
      ],
      "bayesian_dl": [
        "贝叶斯推断和频率派方法的核心区别是什么？",
        "变分推断在做什么？ELBO 的含义是什么？",
        "VAE 的 reparameterization trick 为什么需要？"
      ],
      "general_ml": [
        "Bias-Variance Tradeoff 是什么？怎么在实践中处理？",
        "Transformer 的 self-attention 的时间复杂度是多少？为什么？",
        "BatchNorm 和 LayerNorm 的区别和各自适用场景？",
        "梯度消失和梯度爆炸的原因和解决方法？"
      ],
      "rl": [
        "on-policy 和 off-policy 的区别？各自的代表算法？",
        "PPO 相比 TRPO 的改进是什么？"
      ]
    },
    "selection_rule": "根据用户目标导师的研究方向，优先从匹配的 topic pool 出题。出2-3题即可，不要过多。"
  }
}
```

### 6.5 open_questions.json

```json
{
  "id": "open_questions",
  "name": "开放性问题策略",
  "version": "1.0",
  "strategy": {
    "fixed_questions": [
      "你为什么选择我们这个课题组？",
      "你未来3年的研究规划是什么？",
      "你觉得你能给课题组带来什么价值？",
      "你有什么问题想问我们的？"
    ],
    "dynamic_questions_based_on_profile": [
      "你有{cross_discipline}背景，你觉得这对做{target_direction}有什么帮助？",
      "你提到工程能力强，能举个具体例子说明吗？",
      "你在{company/lab}的实习/实验室经历中，最大的收获是什么？"
    ],
    "evaluation_focus": "不是考察知识，而是考察匹配度、规划清晰度和真诚度。回答真诚比回答完美更重要。"
  }
}
```

---

## 七、前端页面设计要点

### 7.1 Landing Page (`/`)

```
核心信息：
- 标题：InterviewCoach · 面试教练
- 副标题：AI 驱动的个性化面试训练平台
- 三个核心卖点卡片：
  1. 个性化方案 — AI 根据你的背景和目标生成面试方案
  2. 真实压力训练 — 计时、语音、结构化追问
  3. 看得到进步 — 结构化评分，每次都在变好
- CTA 按钮："免费开始"（跳转注册/快速开始）
```

### 7.2 面试进行页 (`/interview/[id]`)

**混合布局**：

```
┌────────────────────────────────────────────────┐
│  左侧面板 (320px)    │   右侧对话流 (flex)      │
│                      │                          │
│  [考官头像]           │   AI: 请做自我介绍...     │
│  考官正在聆听...      │                          │
│                      │   You: 老师好...          │
│  ┌──────────┐        │                          │
│  │  06:32   │        │   AI: 你提到了...?        │
│  └──────────┘        │                          │
│  倒计时器            │                          │
│                      │   ──────────────────      │
│  阶段 2/4            │   [🎤 语音] [⌨️ 文字]     │
│  ● ● ○ ○             │   [发送]                  │
│                      │                          │
│  ┌──────────┐        │                          │
│  │ Free 🔄  │        │                          │
│  └──────────┘        │                          │
└────────────────────────────────────────────────┘
```

**考官头像动画**：TTS 播报时显示"说话中"的 CSS 脉冲动画，播报结束切换为"等待回答"状态。

**计时器**：倒计时，剩余 1 分钟和 30 秒时变色提醒。模考模式下到时间自动切换阶段。

**对话流**：
- AI 消息：左对齐，灰色背景，附带 TTS 播放按钮
- 用户消息：右对齐，蓝色背景
- 系统消息（阶段切换）：居中，分隔线样式
- 练习模式：每个 AI 追问后可以点"查看提示"展开即时反馈

### 7.3 反馈报告页 (`/report/[id]`)

```
布局：
- 顶部：总分（大字）+ 雷达图（6 维度）
- 中部：逐题点评（可展开/折叠）
  - 每题：问题 → 你的回答摘要 → AI 评价 → 改进建议
  - 亮点用绿色标注，待改进用橙色
- 底部：
  - "再练一次"按钮
  - "上传简历获得更精准训练"引导（如果用户没有建档）
  - 飞轮反馈区域（问题评价 + consent）
```

---

## 八、端到端走查视角

以一个真实用户"张三"的视角，走完全流程。

### 走查 Step 1: 首次访问

张三凌晨两点打开 InterviewCoach，看到 Landing Page。点击"免费开始"。

→ 跳转到注册页面，填邮箱密码，3 秒注册完成。

→ 跳转到 Dashboard，看到两个入口：
- "60 秒快速开始 →" （大按钮，醒目）
- "完整建档（更精准）"（次要按钮）

张三选择"60 秒快速开始"。

### 走查 Step 2: 快速开始

弹出轻量表单：
- 面试类型：[夏令营面试] ✓
- 研究方向：[机器学习/生成模型]
- 目标院校（选填）：清华大学
- 目标导师（选填）：朱军

点击"开始"。

**后台**：系统用"清华 朱军"查 rag_index，命中预置模板 tsinghua_cs_zhujun.json，直接加载。跳过 AI 对话生成流程。

→ 跳转到模式选择页：练习模式 / 模考模式。张三选练习模式。Free 档位（默认）。

→ 进入面试。**从注册到面试开始，60 秒以内。**

### 走查 Step 3: 面试进行

**阶段 1 — 个人汇报（8 分钟）**

左侧面板显示考官头像 + 计时器 08:00 开始倒计时。
右侧对话流：AI 说"同学你好，请做自我介绍"（TTS 播报）。

张三点击麦克风按钮，开始语音回答。
Web Speech API 实时转文字，显示在输入框中。
张三说完按发送。

计时器走到 01:00 时，左侧提示"还剩 1 分钟"。
张三来不及讲最后一个项目，提前结束。

**后台**：AI 生成阶段摘要——"讲了扩散模型项目（详细）和具身项目（简略），未提及多模态部署。时间控制：7:42，提前 18 秒结束。"

**阶段 2 — 科研追问（4 分钟）**

AI："你刚才重点介绍了扩散模型加速推理的项目。能具体说说你尝试了哪些方法？各自效果如何？"

张三回答。

AI（追问第 2 层）："你提到 DDIM 效果不理想，你是怎么分析原因的？"

张三回答。

AI（触发 red_flag）："你提到用 Claude Code 辅助了部分实现。那你能解释一下核心的采样加速算法的逻辑吗？不需要说代码，说思路就行。"

→ **练习模式：这题结束后，张三点击"查看反馈"，看到即时点评。**

**阶段 3 & 4** 类似流程...

### 走查 Step 4: 反馈报告

面试结束。跳转到报告页面。

总分 72/100。雷达图展示 6 个维度。

亮点：✓ 主动讲失败案例，体现诚实。✓ 时间控制良好。

待改进：✗ 被追问 ablation 细节时含糊。✗ 具身项目只一句话带过。

每个问题旁边有 👍👎 按钮。张三点了几个。

弹出 consent 弹窗："允许脱敏后用于改进系统？" 张三同意。

底部：提示"上传简历可以获得更个性化的追问 →"

→ 张三觉得有价值，回到 Dashboard，这次选择"完整建档"，上传了简历。

### 走查 Step 5: 第二次练习

张三上传简历后，AI 3 秒回填了档案表单。
张三确认信息，然后进入 Harness 设置。

这次系统已经有了张三的完整档案 + 第一次练习的薄弱点记录。

AI 生成的 Harness 自动调整：科研追问阶段多分配 1 分钟，重点追问 ablation 和具身项目——因为这两个是上次暴露的弱点。

第二次练习的问题更精准，张三的 ablation 回答从 60 分提到了 73 分。

**这就是 ChatGPT 做不到的体验。**

---

## 九、部署指南

### 9.1 服务器准备

```bash
# 阿里云/腾讯云轻量服务器
# 系统：Ubuntu 22.04
# 配置：2C4G 起步

# 1. 添加 SSH 公钥
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDuSpd2QiAYU0Er1upObsQitqG5JQ3senYa2imOvcDQl lbh@MacBookPro.local" >> ~/.ssh/authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICsR0FbL2EzGpR8FytEKni4UFIznz8XiT+xHnX2puF/M di@Dis-MacBook-Air.local" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 2. 安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 pm2
npm install -g pm2

# 4. 克隆项目
git clone https://github.com/your-username/interview-coach.git
cd interview-coach
npm install

# 5. 环境变量
cp .env.example .env
# 编辑 .env 填入 API keys

# 6. 数据库初始化
npx prisma generate
npx prisma db push

# 7. 构建与启动
npm run build
pm2 start npm --name "interview-coach" -- start

# 8. Nginx 反向代理（可选，直接用 3000 端口也行）
```

### 9.2 环境变量

```env
# .env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="随机字符串"
NEXTAUTH_URL="https://your-domain.com"

# AI Models
ANTHROPIC_API_KEY="sk-ant-..."
VOLCENGINE_API_KEY="..."
VOLCENGINE_ENDPOINT_ID="..."

# TTS
VOLCENGINE_TTS_KEY="..."
VOLCENGINE_APP_ID="..."
```

---

## 十、Demo 视频脚本（3 分钟）

```
[0-10s] 直接展示面试进行中的画面
  画面：考官在追问"你用了什么方法？"，计时器在跑，用户用语音回答
  旁白："这是一个知道你简历、按照目标学校流程、能追问到你痛处的面试考官。"

[10-30s] 核心价值陈述
  "InterviewCoach 不是 ChatGPT 套壳。它了解你的背景，按真实面试流程编排，
   追问你的真实弱点，给你结构化的评分和改进建议。"

[30-90s] 核心流程演示
  - 上传简历 → 3 秒建档（wow moment）
  - AI 对话生成面试方案："我搜索到朱军组的面试是 8+7 分钟..."
  - 确认方案 → 开始面试

[90-140s] 面试亮点展示
  - 语音输入 + TTS 播报
  - 精准追问（"ablation 是你做的还是工具辅助的？"）
  - 练习模式即时反馈

[140-160s] 反馈报告
  - 总分 + 雷达图 + 逐题点评
  - "第二次练习，你的追问应对从 60 分提到了 73 分"

[160-180s] 产品愿景
  - "每一次练习都在让系统更懂面试。数据飞轮让第 1000 个用户的体验远好于第 1 个。"
  - 定价页一闪而过
  - "InterviewCoach，让每个学生都有一个了解自己的面试教练。"
```

---

## 十一、Product Memo 大纲

```
1. 目标用户与核心痛点
   - 访谈了 X 位保研学生
   - 核心痛点：找不到人练、没有针对性反馈、不知道教授看重什么

2. 产品设计说明
   - 核心功能：个性化 Harness 编排 + 结构化面试训练 + AI 反馈
   - 刻意不做：视频模态分析（16h 做不好）、真实支付（用体验码替代）
   - 核心取舍：深度 > 广度，保研场景做透

3. 版本迭代记录
   - v1: 最初方案是固定流程面试（类似 ChatGPT 套壳）
   - v2: 引入 Harness 配置化，但需要用户手动配置
   - v3: AI 驱动 Harness 生成，用户只需提供碎片信息
   - 关键问题：RAG 从重资产知识库改为轻量索引+联网搜索

4. 下一步计划（如果再给一周）
   - 进步曲线可视化
   - 社区模板库（用户分享 Harness）
   - 飞轮数据蒸馏（自动生成新 Skill）
   - 端到端语音模型（延迟 <500ms）
   - AI 评分校准（真实面试结果回访对比）

5. AI 工具使用
   - Cursor：全部代码编写
   - Claude：产品设计讨论、架构设计、Prompt 编写
   - 豆包 API / Claude API：产品内的 AI 能力
   - 火山引擎 TTS：语音合成
```

---

## 十二、开发时间线

可用时间窗口：2026.5.22 20:00 → 2026.5.24 23:00（约 51 小时窗口）

```
Day 1 (5.22 晚)：
  20:00-21:00  用户调研（微信快速问5-8个保研同学）
  21:00-23:00  项目搭建 + Prisma schema + NextAuth + 基础 Layout
  23:00-01:00  简历上传解析 + AI 建档 + "60秒快速开始"入口

Day 2 (5.23 全天)：
  09:00-12:00  Harness AI 生成（对话界面 + RAG 索引 + 联网搜索 + JSON 生成）
  12:00-13:00  Harness 表单编辑器 + 预览
  13:00-14:00  午休
  14:00-18:00  面试交互页（混合布局 + 对话流 + Prompt 组装 + 流式输出 + 追问）
  18:00-19:00  语音管线（STT + TTS）
  19:00-20:00  晚饭休息
  20:00-22:00  反馈报告页（评分 + 雷达图 + 逐题点评）
  22:00-24:00  练习模式即时反馈 + 模考模式 + 阶段摘要 + 弱点追踪

Day 3 (5.24)：
  09:00-11:00  定价页 + 体验码 + 多模型路由 + Landing Page
  11:00-13:00  飞轮数据采集（问题评价 + consent） + UI 打磨
  13:00-14:00  考官说话动画 + 细节优化
  14:00-16:00  部署 + SSH key + 测试 + 修 bug
  16:00-18:00  补 commit history + 整理 README
  18:00-20:00  录 Demo 视频 + 写 Product Memo
  20:00-23:00  最终测试 + Buffer + 提交
```

**commit 策略**：每完成一个功能模块就 commit 一次，commit message 格式：`feat: 简历上传解析` / `fix: 语音输入兼容性` / `style: 面试页UI打磨`。不要最后一次性提交。

---

## 十三、注意事项

1. **使用脱敏简历或假数据测试**，不要使用真人个人信息
2. **所有 AI 生成的代码要标注清楚**，在 README 中说明 Cursor 使用情况
3. **截止时间以邮件发送的服务器时间戳为准**，5.24 24:00 后服务器不可有新的构建和部署
4. **确保 SSH 公钥已添加**，评委需要登录服务器查看项目
5. **提供测试账号**在提交邮件中注明
6. **¥150 报销额度**可覆盖：AI 工具订阅、LLM tokens、TTS API、云服务器

---

## 九、设计复盘：外部质疑、回应与后续修正

> 本节用于补充项目评审视角下的产品反思。我们将产品放在“投资人 / 用户 / 考核老师”的视角下重新审视，明确当前设计的风险点、我们的回应，以及需要补充进产品设计和 Demo 叙事中的关键修正。

### 9.1 总体判断

经过复盘，我们认为当前产品方向仍然成立，并且具备较强的差异化潜力。核心原因是：InterviewCoach 不应被定义为一个“AI 面试聊天机器人”，而应被定义为一个面向特定人群的 **个性化面试训练系统**。

本项目的主线应收敛为：

> 面向 CS/AI 保研复试学生，根据用户的目标院校、导师方向、个人简历与历史薄弱点，生成个性化训练方案，进行结构化压力面试，并将每次训练结果沉淀为下一次更精准训练的资产。

这条主线能够同时回应考核中的几个核心问题：

1. 是否真正理解目标用户；
2. 是否抓住最核心的产品功能闭环；
3. 是否比直接使用 ChatGPT 更有训练价值；
4. 是否体现出创业者式的产品取舍和长期平台思考。

---

### 9.2 九个关键质疑与我们的回应

#### 问题 1：产品范围是否过大，容易变成“架构很美，但产品不好用”？

**外部质疑：**

当前规格文档中包含简历解析、AI 建档、训练方案生成、RAG / 联网搜索、多模型路由、语音交互、即时反馈、报告、弱点追踪、飞轮、定价页和体验码等模块。作为短周期项目，这可能导致核心体验被摊薄。

评审可能担心：页面和架构看起来很完整，但真正进入面试后，AI 追问仍然泛泛而谈。

**我们的回应：**

这个风险成立，但不意味着要砍掉长期设计，而是要明确优先级。

我们会将项目拆成三个层级：

- **P0：必须跑通的核心闭环**
  - 60 秒快速开始；
  - 训练方案生成；
  - 面试模拟；
  - 精准追问；
  - 结构化反馈报告；
  - 可公网访问、可实际体验。

- **P1：强化差异化的关键能力**
  - 简历上传解析；
  - RAG / Skill 支撑的专业追问；
  - 语音输入 / 播报；
  - 弱点记录与下一轮针对性训练；
  - 体验码解锁高级模型。

- **P2：用于展示长期产品思考**
  - 平台飞轮；
  - 模板沉淀；
  - 社区经验库；
  - 机构版或导师 / 学长共建机制。

因此，我们不是砍掉复杂能力，而是在 Demo 和开发中保证主线优先：

> 用户能快速进入训练，并在一次完整模拟后得到具体、可执行、能指导下一次练习的反馈。

---

#### 问题 2：“Harness”概念太抽象，普通用户无法理解

**外部质疑：**

“Harness”是内部工程概念，对用户不友好。普通学生不会理解自己为什么要“生成 Harness”。用户真正关心的是：

- 老师会怎么问我？
- 我的简历哪里会被追问？
- 我 8 分钟汇报应该怎么安排？
- 我怎么知道自己哪里答得不好？

**我们的回应：**

这个判断正确。后续产品前端和 Demo 叙事中不再对用户暴露 “Harness” 这个词。

内部仍然保留 Harness 作为工程概念，但用户侧统一替换为：

- 面试训练方案；
- 模拟面试流程；
- AI 考官策略；
- 个性化训练计划。

用户侧推荐表述：

> 我会根据你的目标院校、导师方向和个人背景，生成一套模拟面试流程，包括汇报时间、追问重点和评分标准。

**需要修改的产品表达：**

- “AI 生成 Harness” → “AI 生成面试训练方案”
- “Harness Editor” → “训练方案编辑器”
- “Harness Template” → “面试方案模板”
- “Harness 驱动面试” → “训练方案驱动的结构化模拟面试”

---

#### 问题 3：与 ChatGPT 的差异需要更强的 Wow Moment 证明

**外部质疑：**

仅仅说“我们比 ChatGPT 更个性化”不够。评委需要在 Demo 的前 30 秒看到明确差异，否则产品容易被理解成 ChatGPT wrapper。

**我们的回应：**

这个判断正确。我们会设计多个 Wow Moment，并把最强的放在 Demo 前 30 秒。

可展示的 Wow Moment 包括：

1. **精准简历追问**
   - 用户简历中写到“使用 Claude Code 辅助实现扩散模型加速”；
   - AI 考官直接追问：
     > 你提到部分代码是用 Claude Code 辅助完成的。那你能解释一下它生成代码背后的采样加速逻辑吗？不需要讲每一行代码，说核心思路就行。

2. **训练方案个性化生成**
   - 输入目标院校、导师方向和简历摘要后；
   - 系统生成分阶段训练方案：
     - 8 分钟个人汇报；
     - 科研项目深挖；
     - ML 基础问题；
     - 开放性匹配问题；
     - 每一阶段都有时长、追问深度和评分维度。

3. **端到端反馈回溯**
   - 报告不是只给总分，而是回溯：
     - 原始问题；
     - 用户回答片段；
     - 暴露出的弱点；
     - 面试官可能继续追问的问题；
     - 下一次应该如何组织回答。

4. **飞轮驱动的第二次训练**
   - 第一次训练暴露“AI 工具辅助实现理解不足”；
   - 第二次点击“再练一次”时，系统提示：
     > 本轮将重点训练：代码理解深度、个人贡献边界、实验对比设计。
   - AI 考官在下一轮中主动针对这些历史薄弱点追问。

5. **高质量 PDF 简历解析**
   - 上传脱敏简历；
   - AI 自动提取项目、方法、成果、个人贡献和潜在风险点；
   - 用户确认后进入更精准的训练。

这些 Wow Moment 共同证明：产品不是随机聊天，而是围绕学生真实背景进行结构化训练。

---

#### 问题 4：目标用户仍需进一步收窄

**外部质疑：**

如果同时覆盖保研复试、夏令营面试、博士面试和大厂实习，容易显得泛。短周期项目更需要做深做窄。

**我们的回应：**

这个判断正确。项目 Demo 阶段将优先聚焦：

> CS/AI 方向保研 / 预推免复试学生，尤其是有科研经历、但担心被教授追问技术细节和个人贡献边界的本科生。

这个用户群的典型痛点包括：

- 科研经历写在简历上，但讲不清技术细节；
- 项目中使用过 AI Coding 工具，担心被问到真实理解程度；
- 团队项目中个人贡献边界不清；
- 不知道 8 分钟汇报该突出什么；
- 找不到懂 CS/AI 科研面试的人高频模拟；
- 不知道教授真正看重什么。

因此，Demo 中不重点展示大厂实习和博士面试，而是把一个保研复试学生的完整训练链路打透。

---

#### 问题 5：简历解析不能成为唯一入口

**外部质疑：**

PDF 简历解析虽然有价值，但可能遇到格式复杂、解析不稳定、上传失败等问题。如果把它作为唯一入口，会抬高首次体验门槛，也增加 Demo 风险。

**我们的回应：**

这个判断正确。产品本来就设计为双入口：

1. **60 秒快速开始**
   - 用户只需填写面试类型、目标方向、目标院校 / 导师等少量信息；
   - 系统快速生成通用但结构化的训练方案；
   - 适合首次体验和低门槛使用。

2. **完整建档**
   - 用户上传脱敏简历；
   - AI 解析科研经历、项目方法、成果和个人贡献；
   - 系统生成更精准的训练方案和追问策略；
   - 适合愿意深入训练的用户。

产品叙事中应明确：

> 不上传简历也可以开始；上传简历后，系统会追问得更像真实面试官。

---

#### 问题 6：RAG / 联网搜索不能临时做，必须提前准备高质量资料

**外部质疑：**

RAG 和联网搜索如果只是在 Demo 时临时调用，容易出现结果脏、慢、不相关或质量不稳定的问题。短周期项目中，核心流程不应该依赖不可控搜索结果。

**我们的回应：**

这个判断正确，但我们的策略不是砍掉 RAG，而是在准备阶段提前完成资料筛选和索引设计。

RAG 策略分为三层：

**第一层：本地 Skill 模板**

这是最稳定的能力层，包括：

- 科研项目深挖；
- 个人汇报评估；
- 代码实现追问；
- AI 工具辅助实现追问；
- ML / DL 基础问题；
- 开放性匹配问题。

**第二层：本地 RAG 经验索引**

提前调研并人工筛选高质量来源，形成结构化索引。每条资料标注：

- 适用学校 / 方向；
- 面试流程；
- 常见问题；
- 可信度；
- 可转化的追问方式；
- 对训练方案生成的启发。

示例字段：

```json
{
  "school": "清华大学",
  "direction": "机器学习",
  "scenario": "保研夏令营",
  "process": "8分钟汇报 + 7分钟问答",
  "focus": ["科研细节", "数学基础", "个人贡献", "实验设计"],
  "question_patterns": ["baseline是什么", "为什么选这个方法", "失败案例如何分析"],
  "quality": 4
}
```

**第三层：联网搜索兜底**

当本地索引没有命中目标学校 / 导师 / 方向时，再使用联网搜索补充信息。如果联网结果质量不高，则退回通用 CS/AI 保研模板。

最终策略：

> 本地模板优先，本地 RAG 增强，联网搜索兜底，通用模板降级。

这样既能展示系统有外部经验输入，又能避免核心体验不稳定。

---

#### 问题 7：反馈报告要避免“看起来专业但没用”，需要端到端回溯走查

**外部质疑：**

总分、雷达图、六维评分虽然看起来完整，但可能对用户没有实际帮助。如果报告只写“技术深度不足”“建议加强实验设计”，用户仍然不知道下一次该怎么改。

**我们的回应：**

这个判断正确。反馈报告必须改成端到端回溯结构。

每个关键问题的反馈应包含：

1. **原始问题**
   - AI 面试官问了什么；

2. **用户回答摘要 / 关键片段**
   - 用户具体怎么答的；

3. **暴露的问题**
   - 哪句话或哪种表达暴露了短板；

4. **面试官可能继续追问**
   - 真实面试中老师可能顺着哪里继续问；

5. **改进建议**
   - 不是泛泛建议，而是下一次可直接套用的回答框架；

6. **弱点标签**
   - 如 baseline 不清楚、ablation 设计含糊、个人贡献模糊、AI 工具理解不足等；

7. **是否进入下一轮训练重点**
   - 系统判断这个弱点是否需要在下次训练中优先追问。

示例：

```text
原始问题：
你提到 DDIM 加速效果不理想，你是怎么分析原因的？

用户回答摘要：
用户只回答“效果不太好，可能是步数太少”，但没有说明评价指标、baseline 对比和验证过程。

暴露的问题：
回答停留在直觉判断，没有形成实验分析闭环。

面试官可能继续追问：
你当时用什么指标判断效果不好？有没有和 DDPM 或其他采样方法对比？你如何排除是参数设置导致的问题？

改进建议：
下次可以按“三步法”回答：
1. 先说观察到的指标变化；
2. 再说可能原因假设；
3. 最后说自己做过或下一步会做的验证实验。
```

这类报告能让用户明确感受到：系统不仅评估我，还能训练我下一次答得更好。

---

#### 问题 8：双边平台和定价不能讲得太早，Demo 初期应先聚焦学生端

**外部质疑：**

学生付费能力有限，保研复试又是强周期场景。如果过早讲双边平台、学长供给侧和长期社区，可能显得商业模式跳得太远。

**我们的回应：**

这个判断正确。Demo 初期先聚焦学生用户，不把自己包装成成熟双边平台。

当前阶段的商业假设是：

> 先验证学生端 AI 面试训练闭环，再逐步拓展到模板沉淀、经验库共建和机构合作。

定价页在 MVP 中的作用不是立刻收钱，而是展示商业思考和用户分层：

- **Free**
  - 低门槛体验；
  - 快速模拟；
  - 基础报告；
  - 使用基础模型。

- **单次 Pro**
  - 适合临近面试前的高强度训练；
  - 解锁完整报告、更强模型和更精准追问。

- **备考月卡**
  - 面向 1-2 个月备考周期；
  - 提供更高训练额度、历史弱点追踪和多轮训练计划。

- **未来机构版**
  - 面向保研社群、学院、实验室或升学辅导机构；
  - 不在本次 MVP 中实现，只作为下一步方向。

因此，我们现阶段不主打“双边平台”，而是主打：

> 一个先从学生端切入、未来可以沉淀经验库和训练模板网络的 AI 面试训练平台。

---

#### 问题 9：简历与训练数据涉及隐私，需要提前说明

**外部质疑：**

产品会处理用户简历、学校、导师、科研项目、面试回答等敏感信息。如果没有隐私提示，评委可能质疑数据合规和用户信任问题。

**我们的回应：**

这个判断正确。产品需要在两个位置加入隐私说明：

1. **简历上传前**
   - 提醒用户上传脱敏简历；
   - 说明仅用于生成训练方案和面试追问；
   - 不会未经授权用于样例展示或系统改进。

2. **训练结束后**
   - 弹出数据授权确认；
   - 用户可以选择是否允许脱敏后用于改进系统；
   - 用户可以对单个问题进行 👍 / 👎 反馈。

推荐文案：

> 请上传脱敏简历。系统仅使用简历内容生成本次训练方案与追问策略；未经你的明确授权，我们不会将你的简历或回答用于样例展示或产品改进。

这不仅是合规补丁，也是产品信任感的一部分。

---

### 9.3 用户明确认可并需要落实的修改点

以下是复盘中用户明确表示“你说得对”或认可需要调整的点，需要在产品设计、前端文案和 Demo 叙事中落实：

1. **不要在用户侧谈 “Harness” 这个词**
   - 内部可以保留；
   - 用户侧改为“面试训练方案 / 模拟流程 / AI 考官策略”。

2. **Wow Moment 可以设计多个**
   - 精准简历追问；
   - PDF 简历解析；
   - 个性化训练方案生成；
   - 端到端反馈报告；
   - 第二次训练注入历史薄弱点。

3. **目标用户需要进一步收窄**
   - Demo 阶段聚焦 CS/AI 保研复试学生；
   - 不要同时展示太多泛面试场景。

4. **简历解析不能是唯一入口**
   - 保留“60 秒快速开始”和“完整建档”两个入口；
   - 降低首次体验门槛，同时保留个性化上限。

5. **RAG / 联网搜索要在准备阶段提前做**
   - 先筛选调研网址；
   - 判断哪些接入本地 RAG；
   - 哪些只作为人工参考；
   - 联网搜索和本地 RAG 都找不到时，再使用本地通用模板。

6. **反馈报告需要补充端到端回溯走查**
   - 从问题、回答、暴露弱点、可能追问、改进建议到下一轮训练重点；
   - 让报告真正具备训练价值，而不是只有评分。

7. **Demo 初期先针对学生用户**
   - 不过早强调双边平台；
   - 后期再慢慢拓展到模板库、学长经验、机构版等。

---

### 9.4 飞轮设计：保留，并且要做得可被看见

飞轮是本项目区别于普通 AI 面试工具的重要设计，不能砍掉。否则产品很容易退化成一次性 ChatGPT wrapper。

但飞轮不能只停留在口头叙事中，需要在 Demo 中被用户和评委直接看见。

#### 飞轮输入

每次训练后，系统沉淀三类数据：

1. **问题质量反馈**
   - 用户对每个追问进行 👍 / 👎；
   - 系统记录哪些问题被认为有训练价值。

2. **弱点标签**
   - 系统从回答中抽取薄弱点；
   - 如 baseline 不清楚、个人贡献模糊、AI 工具理解不足、实验分析不完整等。

3. **训练方案效果**
   - 不同学校 / 方向 / 阶段模板的使用情况；
   - 用户完成率、评分、反馈和复练行为。

#### 飞轮输出

这些数据回流到三处：

1. **个人下一次训练**
   - 系统根据历史弱点调整下一轮训练重点；
   - 例如优先追问“代码理解深度”和“个人贡献边界”。

2. **相似用户训练**
   - 高评分问题和高质量追问策略被沉淀；
   - 相似方向的用户可以获得更有效的训练方案。

3. **平台经验库**
   - 长期形成方向化、学校化、场景化的面试训练知识库；
   - 例如“AI/ML 保研常见追问模式”“科研项目深挖模板”“8 分钟汇报评分标准”。

#### Demo 中的可视化方式

推荐在报告页或 Dashboard 中加入一个“下次训练重点”模块：

```text
根据你本次表现，下次训练将重点强化：

1. AI 工具辅助实现理解
   暴露问题：能说出使用了 Claude Code，但对生成代码的核心逻辑解释不足。

2. 实验对比设计
   暴露问题：提到效果不好，但缺少 baseline、指标和验证过程。

3. 个人贡献边界
   暴露问题：团队项目中没有清楚区分自己负责的部分和他人贡献。
```

当用户点击“再练一次”时，系统应展示：

```text
本轮训练已注入你的历史薄弱点：
- 代码理解深度
- 个人贡献边界
- 实验对比设计
```

这样飞轮不是抽象商业概念，而是变成用户能感知到的训练体验。

---

### 9.5 更新后的产品信心判断

在上述修正后，我们对项目判断更积极。

如果同组项目大多是在 16 小时内完成，而平均水平为中等偏上，则本项目的竞争力主要来自：

1. **目标人群足够窄**
   - 聚焦 CS/AI 保研复试，而不是泛面试。

2. **痛点足够真实**
   - 科研经历讲不清；
   - 项目怕被追问；
   - AI 工具辅助工作怕露怯；
   - 找不到专业人士高频模拟。

3. **训练闭环完整**
   - 训练前：建档 / 快速开始；
   - 训练中：结构化阶段、计时、追问；
   - 训练后：端到端报告、弱点标签；
   - 下一次：历史薄弱点注入。

4. **和 ChatGPT 有明显差异**
   - ChatGPT 是一次性对话；
   - InterviewCoach 是结构化训练系统；
   - 核心差别来自训练方案、专业 Skill、RAG 经验、历史弱点和反馈回流。

5. **具备平台化思考**
   - 先做学生端闭环；
   - 再沉淀问题、模板、经验和弱点标签；
   - 未来拓展到经验库、机构版或共建模板网络。

最终判断：

> 如果只完成基础版，项目会是中上水平；  
> 如果完成“窄人群 + 精准追问 + 端到端报告 + 可见飞轮”，项目有机会进入第一梯队。

本项目最应该坚持的 Demo 核心感受是：

> 让一个 CS/AI 保研学生在 10 分钟内感受到：这个系统真的知道我会在哪里被老师问穿，并且能帮我下一次答得更好。

