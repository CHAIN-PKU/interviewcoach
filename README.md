# InterviewCoach · 面试教练

AI 驱动的个性化面试训练平台，面向 **CS/AI 保研夏令营 / 复试** 学生。不是 ChatGPT 套壳，而是一套「懂你背景 → 结构化压力训练 → 可执行反馈 → 越练越准」的面试系统。

**线上 Demo：** https://43.128.106.155:3000  
（自签名 HTTPS 证书，浏览器需点击「继续访问」）

---

## 核心功能

- **60 秒快速开始** — 选面试类型 + 研究方向，AI 生成个性化训练方案
- **完整建档** — 上传 PDF 简历，AI 解析科研经历与潜在追问点
- **分阶段模拟面试** — 汇报 / 科研追问 / 专业基础 / 开放问题，计时驱动
- **练习模式即时提示** — 每题可查看 AI 反馈（模考模式数据层已预留）
- **结构化报告** — 总分、六维评分、逐题点评、改进建议
- **弱点追踪** — 历史薄弱点注入下一轮训练
- **数据飞轮** — 用户授权后，从「答不好的环节」蒸馏改进追问策略
- **Free / Pro 双档** — Free 用 DeepSeek；Pro 用 Claude Sonnet（体验码解锁）

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 16 (App Router) + Tailwind CSS |
| 数据库 | SQLite + Prisma ORM |
| 认证 | NextAuth.js (Credentials + JWT) |
| LLM | OpenRouter（Free: DeepSeek / Pro: Claude Sonnet 4） |
| STT | 本地 Whisper (`scripts/transcribe.py`) + 领域术语纠错 |
| TTS | Edge TTS API |
| 知识层 | 本地 JSON（`knowledge/skills/`、`harness_templates/`、`rag_index.json`） |
| 部署 | Nginx (HTTPS :3000) → Next.js (:3001) |

---

## 快速开始（本地）

### 1. 环境要求

- Node.js 20+
- Python 3（Whisper STT，可选）
- `OPENROUTER_API_KEY`（必需）

### 2. 安装与初始化

```bash
cd interview-coach
npm install

# 配置环境变量
cp .env.example .env   # 若不存在，见下方变量说明
# 编辑 .env 填入 OPENROUTER_API_KEY 等

# 数据库
npx prisma generate
npx prisma db push
npm run seed             # 或 npm run seed:reset
```

### 3. 启动开发服务器

```bash
npm run dev -p 3001
# 访问 http://localhost:3001
```

### 4. 环境变量

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://your-domain:3000"
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
FREE_MODEL="deepseek/deepseek-chat-v3-0324"
PRO_MODEL="anthropic/claude-sonnet-4"
PROMO_CODE="DEMO2026"
GROQ_API_KEY=""          # 可选，加速 STT
ADMIN_SECRET=""            # 可选，手动触发蒸馏
```

---

## Demo 账号

| 账号 | 密码 | 说明 |
|------|------|------|
| `demo@interviewcoach.ai` | `Demo2026!` | Free 用户，可体验完整流程 |
| `zs@interviewcoach.ai` | `Demo2026!` | Pro 用户，含完整档案与历史记录 |

**体验码：** `DEMO2026`（Dashboard 输入后升级 Pro）

---

## 项目结构

```
interview-coach/
├── knowledge/                 # 知识层（不进 DB）
│   ├── skills/                # 追问策略 Skill
│   ├── harness_templates/     # 面试方案模板
│   ├── skills/distilled/      # 社区蒸馏（弱项驱动）
│   └── rag_index.json         # 经验索引
├── prisma/                    # 数据模型 + seed
├── scripts/transcribe.py      # Whisper STT
├── src/
│   ├── app/                   # 页面 + API Routes
│   ├── components/            # UI 组件
│   └── lib/                   # 核心逻辑
│       ├── harness-engine.ts  # 阶段状态机
│       ├── prompt-assembler.ts
│       ├── harness-generator.ts
│       ├── distill.ts         # 飞轮蒸馏
│       └── report-scoring.ts
└── README.md
```

---

## 部署说明（当前 Demo 环境）

```nginx
# Nginx :3000 SSL → proxy_pass http://127.0.0.1:3001
# error_page 497 处理 HTTP→HTTPS 跳转
```

```bash
cd /path/to/interview-coach
nohup npm run dev -p 3001 > /tmp/next-dev.log 2>&1 &
```

重置 Demo 数据：

```bash
npm run seed:reset
```

---

## AI 工具使用声明

本项目在 **Cursor** 辅助下开发。产品设计、用户调研、Prompt 策略与迭代决策由作者主导；代码、配置与知识层内容由 AI 辅助生成并人工审核。详见 Product Memo。

---

## 作者

**陈润材** · 北京大学工学院 · 2300011108  
16 小时项目挑战 · 2026 年 5 月 24 日
