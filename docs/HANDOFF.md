# InterviewCoach — AI 交接文档 (HANDOFF.md)

> 本文档面向接手开发的 AI。假设你完全不了解这个项目，请从头到尾通读。
> 
> **当前日期**：2026-05-23  
> **项目地址**：`/home/ubuntu/ai-interview/interview-coach/`  
> **线上访问**：`http://43.128.106.155:3000`  
> **开发服务器**：已用 `nohup npm run dev` 运行，日志在 `/tmp/nextjs.log`

---

## 一、产品概述

**InterviewCoach** 是一个面向 CS/AI 保研学生的 AI 面试训练平台。

核心价值主张：
1. **个性化 Harness 编排**——根据目标院校、导师方向、个人背景，匹配结构化面试训练方案
2. **数据飞轮**——每次训练后的 QA 记录、用户评价、弱点标签都沉淀回知识层，让系统越来越懂面试
3. **结构化压力训练**——计时器、阶段强制切换、语音交互，创造接近真实的面试环境

Demo 聚焦场景：清华大学朱军课题组夏令营面试（扩散模型/贝叶斯方向）。产品架构对所有 CS/AI 院校通用。

---

## 二、技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Next.js 14 (App Router) |
| UI | Tailwind CSS + 自建 shadcn-like 组件 |
| 数据库 | SQLite + Prisma ORM v6 |
| 认证 | NextAuth.js (Credentials Provider) |
| LLM | OpenRouter API（Free: DeepSeek / Pro: Claude Sonnet 4） |
| 语音输入 | Web Speech API (webkitSpeechRecognition) |
| 语音输出 | Web SpeechSynthesis（待升级 Edge TTS） |
| 知识层 | 本地 JSON 文件（`knowledge/` 目录） |

---

## 三、已完成功能（阶段 1-3）

### 阶段 1：脚手架 + 基础认证

- [x] Next.js 项目初始化，Tailwind、TypeScript、App Router
- [x] Prisma schema（见 `prisma/schema.prisma`）
- [x] NextAuth.js Credentials 登录 + JWT session
- [x] 用户注册 API (`/api/auth/register`)
- [x] 体验码 Pro 升级 API (`/api/auth/promo`)，体验码：`DEMO2026`
- [x] Landing Page (`/`)
- [x] 登录/注册页 (`/login`)，含 Demo 账号快速填写
- [x] Dashboard (`/dashboard`)：历史记录、快速入口、Pro 解锁
- [x] SSH 公钥配置完成（两位评委公钥已加入 `~/.ssh/authorized_keys`）
- [x] 数据库预置两个 Demo 账号：
  - `demo@interviewcoach.ai` / `Demo2026!`（Free 用户）
  - `zs@interviewcoach.ai` / `Demo2026!`（Pro 用户，已有完整档案 + 科研经历）

### 阶段 2：核心面试功能

- [x] **知识层**（`knowledge/` 目录）：
  - 5 个 Skill JSON（追问策略）：`research_questioning`、`presentation_coaching`、`code_implementation_probing`、`ml_basics_questioning`、`open_questions`
  - 3 个 Harness 模板：清华朱军夏令营、通用保研复试、通用夏令营
  - RAG 索引（`rag_index.json`）：10 条面试经验 + 评审标准条目

- [x] **lib 核心逻辑**（`src/lib/`）：
  - `model-router.ts`：OpenRouter 调用封装，Free/Pro 双路由
  - `rag-router.ts`：tag 评分式 RAG 检索
  - `skill-loader.ts`：Skill + Harness 模板加载 + 智能匹配
  - `harness-engine.ts`：面试状态机（阶段管理、推进、序列化到 DB）
  - `prompt-assembler.ts`：5 层 Prompt 组装（人设 → 阶段指令 → Skill → RAG → 用户档案）

- [x] **档案页** (`/profile/edit`)：表单填写 + PDF 简历上传 AI 解析（`pdf-parse`）

- [x] **60 秒快速开始** (`/interview/quick-start`)：两步选择面试类型 + 目标

- [x] **面试页** (`/interview/[id]`)：
  - 流式 SSE 对话（server-sent events）
  - 阶段进度条 + 计时器
  - 汇报阶段「我已汇报完毕」按钮
  - 语音输入（STT）+ 语音播放（TTS）
  - 剩余 <20s 自动跳至下一阶段
  - 剩余 60s 系统消息提醒

- [x] **反馈报告页** (`/report/[id]`)：总分环形图、6 维评分条、改进建议、逐题点评

- [x] **定价页** (`/pricing`)：Free/Pro 对比、体验码兑换、FAQ

- [x] **API 路由**：
  - `GET/POST /api/profile`
  - `POST /api/upload`（PDF 简历解析）
  - `POST /api/harness`（模板匹配 + session 创建）
  - `GET /api/harness/session`（面试页初始化）
  - `POST /api/interview/chat`（流式对话 + 阶段推进）
  - `POST /api/report`（生成报告 + 弱点追踪写库）

### 阶段 3：Bug 修复

- [x] 修复 StrictMode double-invoke 导致的重复开场白（`useRef` flag）
- [x] 输入框改为 auto-grow `textarea`，Enter 发送，Shift+Enter 换行
- [x] PDF 简历解析修复（`pdf-parse` 服务端提取）
- [x] 计时同步：剩余 60s 时前端插入系统消息
- [x] 汇报阶段 prompt 禁止 AI 打断，加「我说完了」按钮
- [x] 剩余 <20s 自动 advance_stage
- [x] Prompt 禁止 `*旁白*`、`[动作]` 等格式
- [x] 档案页必填校验（院校、专业、目标院校、研究方向标红星）

---

## 四、待完成功能（阶段 4-6）

### 阶段 4：数据飞轮闭环（最重要差异化功能，约 4h）

这是本产品区别于"ChatGPT 套壳"的核心。评委会重点看这部分。

#### 4.1 飞轮数据采集 UI

**报告页底部加「飞轮反馈区域」**，包含：
1. 整体评分（1-5 星）→ 写 `Session.userRating`
2. 主观反馈文本框 → 写 `Session.userFeedback`
3. Consent 弹窗/区域：
   - **拒绝**：只蒸馏脱敏数据（弱点标签聚合、问题有效性统计），不保留个人信息
   - **同意**：可蒸馏有上下文数据（Q&A + 方向/院校标签）进入 RAG 和 Skill

```typescript
// Consent 后端字段：
Session.consentToShare = true/false   // 用户授权
QARecord.userThumbsUp = true/false/null  // 逐题评价
```

4. 逐题 👍/👎 评价按钮（在报告页逐题点评区域）→ 写 `QARecord.userThumbsUp`

所需 API：
- `POST /api/session/rate`：`{ sessionId, rating, feedback, consentToShare }`
- `POST /api/qa/feedback`：`{ qaRecordId, thumbsUp }`

#### 4.2 蒸馏 API（飞轮核心）

`POST /api/admin/distill`（需 admin 验证或只在服务器运行）

逻辑：
```
1. 拉取所有 consentToShare=true 的 session（QA 记录 + 方向标签）
   → AI 分析 → 生成新 RAG 条目 → 追加到 knowledge/rag_index.json
   （标注 source: "community"，distilled_from: [sessionId...]）

2. 拉取所有 session（脱敏：只保留问题模式 + thumbsUp 评价）
   → AI 分析高分问题模式 → 生成新 Skill 追问策略片段
   → 追加到对应 knowledge/skills/*.json 的 probing_patterns 数组
   （标注 distilled: true，quality: n）

3. 返回蒸馏摘要：新增 N 条 RAG，更新 M 个 Skill 策略
```

#### 4.3 可见飞轮 UI

Dashboard 加「平台积累统计」：
```
本平台已积累 127 次训练 · 34 条社区经验 · 18 个蒸馏 Skill 策略
```
（从 DB 统计 session 数 + RAG 条目数 + distilled Skill 条目数）

#### 4.4 Skill 树形结构

将 `knowledge/skills/` 改为层级目录：
```
knowledge/skills/
├── research/
│   ├── research_questioning.json    # 通用追问框架
│   ├── code_implementation_probing.json
│   └── ml_specifics/
│       ├── diffusion_models.json    # 方向专属（自动蒸馏后产生）
│       └── embodied_ai.json
└── soft/
    ├── presentation_coaching.json
    └── open_questions.json
```

`skill-loader.ts` 的 `loadSkill(id)` 需要支持递归目录遍历。

#### 4.5 练习模式即时反馈

在面试页，每次 AI 提问后，用户可以点击「查看本题提示」：
- 调一次轻量 LLM：分析用户上一条回答，给出"这题你答得如何 + 可以补充什么"
- 仅练习模式可用，模考模式不显示

需在 `/api/interview/hint` 实现（小的一次性调用，非流式）。

#### 4.6 进步曲线

Dashboard 加折线图（近 10 次 `Session.totalScore` 随时间变化）。可用简单 CSS/SVG 实现，无需引入 chart 库。

---

### 阶段 5：语音升级 + 高级功能（约 3h）

#### 5.1 TTS 升级（问题 9）

**目标**：替换浏览器 SpeechSynthesis，改用 Edge TTS（微软，免费，自然音色）。

推荐方案：
```typescript
// 后端 /api/tts route
// 调用 edge-tts npm 包（或直接 fetch Microsoft TTS API）
// 返回 audio/mp3 stream
// 推荐声音：zh-CN-YunxiNeural（男）或 zh-CN-XiaoxiaoNeural（女）
// 前端用 Audio() 播放
```

npm 包：`edge-tts`（`npm install edge-tts`）

#### 5.2 STT 体验优化（问题 1）

当前问题：录音中无视觉反馈，用户不知道是否在录。

改进：
- 录音中显示波形动画（用 CSS 模拟 3 根跳动的条）
- 识别结果实时显示在输入框（已实现）
- 录音结束自动停止，显示「识别完成，请确认后发送」提示

#### 5.3 PPT 上传翻页（问题 3）

**目标**：用户可以上传 PPT（转 PDF），面试时展示当前页供 AI 参考。

实现方案：
1. 上传端：`POST /api/upload/ppt`，接收 PDF 文件，存储到 `/tmp/ppt-[sessionId].pdf`
2. 前端：用 `pdf.js` 渲染，加上翻页按钮（←/→）
3. AI 侧：每页翻页时，截取当前页为 base64 图片，附加到下一条消息的 prompt 里

注：需要 OpenRouter 支持视觉模型（Claude Sonnet 4 支持）。

#### 5.4 联网搜索论文验证（问题 4）

当用户提到具体论文标题时，AI 可以搜索验证。

实现：
- 在 chat API 中检测用户消息是否包含「论文」「发表」「arXiv」等关键词
- 若检测到，调用 `Tavily Search API`（`npm install tavily`，需申请免费 key）
- 搜索结果作为 system 消息注入该轮对话

```typescript
// TAVILY_API_KEY 加入 .env
// 调用：POST https://api.tavily.com/search
// { query: "论文标题 arxiv", search_depth: "basic", max_results: 3 }
```

#### 5.5 非 CS/AI 方向处理（问题 12）

快速开始页的方向选择列表中加一个「其他方向」选项，选中后显示：
> 「目前我们的追问知识库主要覆盖 CS/AI 方向。其他方向也可以使用通用面试流程，但追问精度可能较低。」

---

### 阶段 6：收尾（约 2h）

#### 6.1 Demo 数据清理脚本

```bash
# npm run seed:reset
```

修改 `prisma/package.json`（或 `package.json` scripts），提供：
- `npm run seed`：补充缺失的 demo 数据（幂等）
- `npm run seed:reset`：清空所有用户数据，重新 seed

seed 目标：
- `demo@interviewcoach.ai`（Free）- 无 profile，无历史
- `zs@interviewcoach.ai`（Pro）- 有完整 profile（朱军组方向）+ 1 条已完成的模拟面试记录（带报告）

#### 6.2 端到端验证 Checklist

```
□ 访问首页 http://43.128.106.155:3000
□ 注册新账号，成功跳转 Dashboard
□ 输入体验码 DEMO2026，升级为 Pro
□ 完善档案（上传 PDF 简历 → AI 解析填充）
□ 60 秒快速开始 → 选清华朱军 + 扩散模型 → 进入面试
□ 汇报阶段：输入一段汇报内容，点「我已汇报完毕」→ AI 开始追问
□ 追问阶段：STT 语音输入 → AI 流式回复 → TTS 播放
□ 面试结束 → 查看报告 → 6 维评分 + 逐题点评
□ 报告页：点赞/踩 + 整体评分 + Consent 选择（同意/拒绝）
□ 回 Dashboard：进步曲线更新
□ 登录 zs@interviewcoach.ai → 查看已有报告
```

#### 6.3 评委 Memo 文档

在 `/home/ubuntu/ai-interview/docs/` 创建 `REVIEWER_MEMO.md`，包含：

```markdown
# InterviewCoach 评委验证指南

## 快速访问
- 地址：http://43.128.106.155:3000
- SSH：ssh ubuntu@43.128.106.155（你的 SSH 公钥已配置）

## Demo 账号
| 账号 | 密码 | 说明 |
|------|------|------|
| demo@interviewcoach.ai | Demo2026! | Free 用户，从零开始体验 |
| zs@interviewcoach.ai | Demo2026! | Pro 用户，已有完整档案，直接开始面试 |

## 体验码
DEMO2026 → 登录后在 Dashboard 输入，升级为 Pro

## 推荐验证路径（10 分钟）
1. 用 zs 账号登录
2. 点「60 秒快速开始」
3. 选「夏令营面试」→ 清华大学 / 朱军 / 扩散模型
4. 进入面试，做一段汇报，点「我已汇报完毕」
5. 回答 2-3 个追问
6. 点「结束面试」→ 查看评估报告
7. 在报告页评分 + 授权数据共享（飞轮演示）
```

---

## 五、关键文件索引

```
/home/ubuntu/ai-interview/interview-coach/
├── .env                          # 环境变量（OpenRouter key 等）
├── prisma/
│   ├── schema.prisma             # 数据库模型定义
│   ├── seed.ts                   # Demo 数据（用 Python 直接写 SQLite）
│   └── dev.db                    # SQLite 数据库文件
├── knowledge/
│   ├── skills/                   # 5 个 Skill JSON 追问策略
│   ├── harness_templates/        # 3 个 Harness 模板
│   └── rag_index.json            # RAG 经验索引（10 条）
├── src/
│   ├── lib/
│   │   ├── auth.ts               # NextAuth 配置
│   │   ├── db.ts                 # Prisma singleton
│   │   ├── model-router.ts       # OpenRouter 调用封装
│   │   ├── rag-router.ts         # RAG 检索逻辑
│   │   ├── skill-loader.ts       # Skill + Harness 加载 + 匹配
│   │   ├── harness-engine.ts     # 面试状态机
│   │   └── prompt-assembler.ts   # 5 层 Prompt 组装器
│   └── app/
│       ├── page.tsx              # Landing Page
│       ├── login/                # 登录/注册页
│       ├── dashboard/            # 用户控制台
│       ├── profile/edit/         # 档案编辑页
│       ├── interview/
│       │   ├── quick-start/      # 60 秒配置入口
│       │   └── [id]/             # 面试主界面（流式对话）
│       ├── report/[id]/          # 评估报告页
│       ├── pricing/              # 定价页
│       └── api/
│           ├── auth/             # NextAuth + 注册 + 体验码
│           ├── profile/          # 档案 CRUD
│           ├── upload/           # PDF 简历解析
│           ├── harness/          # 模板匹配 + session 创建
│           ├── interview/chat/   # 流式对话 + 阶段推进
│           └── report/           # 报告生成 + 弱点追踪
```

---

## 六、Prisma Schema 关键字段说明

```prisma
model Session {
  // 飞轮相关
  userRating    Int?      // 用户整体评分 1-5（待 UI）
  userFeedback  String?   // 用户文字反馈（待 UI）
  consentToShare Boolean @default(false)  // 同意数据共享（待 UI）
  harnessSnapshot String? // JSON，包含完整 Harness 配置 + _engineState（面试状态序列化）
}

model QARecord {
  userThumbsUp Boolean?  // 逐题评价（待 UI）
  stageId      String    // 所属阶段 id
  followUpDepth Int      // 追问深度
}

model WeaknessSummary {
  weaknesses      String  // JSON: {"弱点标签": 0.0-1.0 权重}
  basedOnSessions String  // JSON: [sessionId...]
}
```

---

## 七、数据飞轮架构（待实现）

```
用户面试完成
    ↓
报告页「飞轮反馈区域」
    ├── 1-5 星评分 + 文字反馈
    ├── 逐题 👍/👎
    └── Consent 弹窗
         ├── 拒绝 → 只记录脱敏聚合数据
         │         （弱点标签权重 + 问题有效性分）
         └── 同意 → 记录有上下文数据
                   （Q&A + 方向/院校标签）
    ↓
POST /api/admin/distill（手动触发或定时）
    ├── consentToShare=true sessions:
    │   AI 分析 → 新 RAG 条目（source: "community"）
    │   → 追加到 knowledge/rag_index.json
    └── 所有 sessions（脱敏）:
        AI 分析高分问题模式 → 新 Skill 追问片段
        → 追加到 knowledge/skills/*.json
    ↓
下一个用户：RAG 命中更多经验，Skill 追问更精准
```

**可见飞轮**（在 Dashboard 展示）：
```
本平台已积累 N 次训练 · M 条社区经验 · K 个蒸馏 Skill 策略
```

---

## 八、环境变量（`.env`）

```env
DATABASE_URL="file:/home/ubuntu/ai-interview/interview-coach/prisma/dev.db"
NEXTAUTH_SECRET="interviewcoach-secret-2026-change-in-prod"
NEXTAUTH_URL="http://43.128.106.155:3000"
OPENROUTER_API_KEY="your-openrouter-api-key-here"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
FREE_MODEL="deepseek/deepseek-chat-v3-0324"
PRO_MODEL="anthropic/claude-sonnet-4"
PROMO_CODE="DEMO2026"
# 待添加：
# TAVILY_API_KEY="..."  （联网搜索）
# EDGE_TTS_VOICE="zh-CN-YunxiNeural"  （TTS 升级）
```

---

## 九、已知技术债 / 注意事项

1. **开发模式访问**：服务器运行的是 `next dev`（非 production build）。`next.config.ts` 已配置 `allowedDevOrigins: ["43.128.106.155"]` 允许公网访问 HMR。评委看到的是开发模式。
2. **Prisma 生成路径**：Prisma client 生成在 `src/generated/prisma/`（非默认路径），`db.ts` import 路径为 `@/generated/prisma/client`。
3. **Session 的 Harness 配置**：没有使用 `HarnessTemplate` DB 表存配置，而是把完整 JSON 序列化在 `Session.harnessSnapshot` 里（含 `_engineState`、`_ragContext`、`_matchedBy` 内部字段）。
4. **Seed 数据**：由于 `tsx` 对 Prisma generated client 有兼容问题，seed 是用 Python 直接写 SQLite 实现的（非 `prisma db seed`）。如需 reset，参考 `seed:reset` 命令（待实现）。
5. **StrictMode Double-invoke**：已用 `useRef initCalledRef` 修复面试页的重复初始化问题。其他 useEffect 如有副作用也需注意。
6. **弱点追踪范围**：当前 `WeaknessSummary` 只追踪当前用户的历史弱点并注入下次追问，不做跨用户聚合（跨用户聚合是飞轮蒸馏任务的职责）。

---

## 十、下一步 Action Items（按优先级）

```
P0（阶段 4）：飞轮采集 UI + 蒸馏 API + 可见飞轮统计
P1（阶段 4）：练习模式即时反馈 + 进步曲线
P1（阶段 5）：Edge TTS 升级（问题 9）
P2（阶段 5）：PPT 翻页 + 联网搜索论文
P2（阶段 5）：Skill 树形目录重构
P0（阶段 6）：seed:reset 脚本 + 评委 Memo + 端到端验证
```

如有疑问，可参考原始规格文档：`/home/ubuntu/ai-interview/docs/InterviewCoach_项目规格文档_补充设计复盘.md`（2000+ 行，极详细）。

---

*文档由首席开发 AI 于 2026-05-23 生成，对应代码版本：阶段 1-3 全部完成。*
