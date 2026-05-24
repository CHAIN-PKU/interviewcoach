# InterviewCoach 评委验证指南

## 快速访问

- **线上地址**：http://43.128.106.155:3000
- **SSH**：`ssh ubuntu@43.128.106.155`（你的 SSH 公钥已配置）
- **项目路径**：`/home/ubuntu/ai-interview/interview-coach/`

---

## Demo 账号

| 账号 | 密码 | 说明 |
|------|------|------|
| `demo@interviewcoach.ai` | `Demo2026!` | Free 用户，从零开始体验 |
| `zs@interviewcoach.ai` | `Demo2026!` | Pro 用户，已有完整档案 + 1 条历史记录，直接开始面试 |

**体验码**：`DEMO2026`（登录后在 Dashboard 输入，Free 升级为 Pro）

---

## 推荐验证路径（约 10 分钟）

### 路径 A：完整体验（用 zs 账号）

1. 访问 http://43.128.106.155:3000，用 `zs@interviewcoach.ai / Demo2026!` 登录
2. 在 Dashboard 查看：
   - **飞轮统计横幅**（训练次数 · 社区经验 · 蒸馏策略数）
   - **进步曲线**（右侧，有 1 条历史记录会显示初始状态）
   - 历史练习记录中有 1 条已完成的模拟面试
3. 点击「60 秒快速开始」
4. 选「夏令营面试」→ 下一步
5. 目标院校填「清华大学」，导师「朱军」，方向选「扩散模型」→ 开始面试
6. 面试中：
   - **汇报阶段**：输入一段科研汇报，点「我已汇报完毕，请开始提问」
   - **追问阶段（练习模式）**：回答问题后，点「查看本题提示」查看即时反馈
   - 点击🔊图标开启 **Edge TTS 语音播放**，点击🎤开启 **STT 语音输入**（录音中显示波形动画）
7. 点「结束面试」→ 查看评估报告
8. 在报告页底部**飞轮反馈区域**：
   - 逐题点击👍/👎
   - 给 1-5 星整体评分
   - 填写主观反馈（选填）
   - 选择数据授权方式 → 提交反馈

### 路径 B：从零注册（用 demo 账号）

1. 访问首页 → 注册新账号
2. 在 Dashboard 输入体验码 `DEMO2026` → 升级为 Pro
3. 点「完整建档」→ 填写档案（可上传 PDF 简历测试 AI 解析）
4. 走完整面试流程

---

## 核心差异化功能说明

### 1. 数据飞轮（最重要）

**位置**：报告页底部「帮助平台变得更好」区域

演示要点：
- **逐题 👍/👎**：点击后即时写入 `QARecord.userThumbsUp`
- **1-5 星评分 + 文字反馈**
- **Consent 授权**：同意共享 → 完整 Q&A 数据可被蒸馏；拒绝 → 仅脱敏统计

**蒸馏触发**（手动，需服务器端调用）：
```bash
curl -X POST http://43.128.106.155:3000/api/admin/distill \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: （ADMIN_SECRET 环境变量）"
# 或登录 demo@interviewcoach.ai 后调用（免密）
```

### 2. 可见飞轮统计

**位置**：Dashboard 顶部横幅

展示平台累积：训练次数 · 社区经验条目数 · 蒸馏追问策略数

### 3. 进步曲线

**位置**：Dashboard 右侧（完成 2 次以上面试后显示折线图）

### 4. 练习模式即时反馈

**位置**：面试页输入框上方（仅练习模式）

每次 AI 提问后，点「查看本题提示」→ AI 分析上一条回答 → 即时点评

### 5. Edge TTS 语音升级

**位置**：面试页右上角🔊按钮

使用微软 Edge TTS（zh-CN-YunxiNeural），比浏览器内置 SpeechSynthesis 自然度高得多。点击开启后，AI 每次回复自动朗读。

---

## 重置 Demo 数据

```bash
cd /home/ubuntu/ai-interview/interview-coach
npm run seed:reset
```

重置后恢复初始状态：
- `demo@interviewcoach.ai`：无档案，无记录
- `zs@interviewcoach.ai`：完整档案 + 1 条已完成的模拟面试

---

## 开发服务器状态

```bash
# 查看服务器日志
tail -50 /tmp/nextjs.log

# 重启服务器（如有需要）
pkill -f "next dev"
cd /home/ubuntu/ai-interview/interview-coach
nohup npm run dev > /tmp/nextjs.log 2>&1 &
```

---

## 技术架构速览

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 (App Router) + Tailwind CSS |
| 数据库 | SQLite + Prisma ORM |
| LLM | OpenRouter（Free: DeepSeek / Pro: Claude Sonnet 4） |
| TTS | Edge TTS（zh-CN-YunxiNeural，微软神经网络语音） |
| STT | Web Speech API（webkitSpeechRecognition） |
| 知识层 | 本地 JSON（skills/ + harness_templates/ + rag_index.json） |

*文档更新：2026-05-23，对应代码版本：阶段 1-5 完成*
