#!/usr/bin/env python3
"""
seed:reset — 清空所有用户数据，重新 seed 两个 Demo 账号。
用法: python3 prisma/seed_reset.py
"""
import sqlite3, hashlib, json, os, sys, time, uuid
from datetime import datetime, timezone

DB_PATH = os.environ.get(
    "DATABASE_URL", "file:/home/ubuntu/ai-interview/interview-coach/prisma/dev.db"
).replace("file:", "")

if not os.path.exists(DB_PATH):
    print(f"[ERROR] Database not found: {DB_PATH}")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

def cuid():
    """Generate a simple cuid-like id."""
    return "c" + uuid.uuid4().hex[:23]

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

def bcrypt_hash(password: str) -> str:
    """Use bcryptjs via node to hash. Fallback: store a marker."""
    try:
        import subprocess, json as j
        result = subprocess.run(
            ["node", "-e",
             f"const b = require('bcryptjs'); b.hash('{password}', 10).then(h => console.log(h));"],
            capture_output=True, text=True, timeout=10,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        h = result.stdout.strip()
        if h.startswith("$2"):
            return h
    except Exception as e:
        print(f"[WARN] bcrypt via node failed: {e}")
    # Fallback: bcrypt via Python if available
    try:
        import bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(10)).decode()
    except ImportError:
        pass
    print("[ERROR] Cannot hash password. Install bcrypt or ensure node/bcryptjs is available.")
    sys.exit(1)

print("=== InterviewCoach seed:reset ===")
print(f"Database: {DB_PATH}")
print()

# ── 1. Wipe all user-related data ──────────────────────────────────────────
print("Clearing all user data...")
tables = ["QARecord", "WeaknessSummary", "Session", "Experience", "Profile", "User"]
for t in tables:
    cur.execute(f'DELETE FROM "{t}"')
    print(f"  ✓ {t}: cleared")
conn.commit()

# ── 2. Hash password ────────────────────────────────────────────────────────
print("\nHashing passwords...")
password_hash = bcrypt_hash("Demo2026!")
print("  ✓ password hashed")

# ── 3. Create demo user (Free, no profile, no history) ─────────────────────
demo_id = cuid()
cur.execute("""
    INSERT INTO "User" (id, email, passwordHash, name, tier, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
""", (demo_id, "demo@interviewcoach.ai", password_hash, "Demo 用户", "free", now_iso()))
print(f"\n  ✓ demo@interviewcoach.ai (free, no profile)")

# ── 4. Create zs user (Pro, full profile + 1 completed session) ────────────
zs_id = cuid()
cur.execute("""
    INSERT INTO "User" (id, email, passwordHash, name, tier, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
""", (zs_id, "zs@interviewcoach.ai", password_hash, "张三", "pro", now_iso()))

# Profile
profile_id = cuid()
strengths = json.dumps([
    "扩散模型推理加速有实际工程经验",
    "多学科背景（了解博弈论）",
    "工程能力强，具身全栈经验",
    "主动汇报习惯，导师对科研进度非常清楚",
])
concerns = json.dumps([
    "部分实现使用了 Claude Code 辅助，担心被追问细节",
    "某项目 ablation 实验设计不够完整",
    "团队项目个人贡献边界不够清晰",
])
profile_summary = (
    "张三，某985计算机系大四，GPA 3.85，目标清华朱军组。"
    "核心项目：扩散模型推理加速（DDPM/DDIM对比实验，Claude Code辅助实现，有阶段性结果）；"
    "具身机器人全栈工程（数据/算法/部署均参与）。"
    "优势：工程能力强、主动沟通、多学科背景。"
    "潜在追问点：Claude Code辅助代码理解深度、ablation设计逻辑、团队项目个人贡献边界。"
)
resume_text = (
    "张三\n某985大学 计算机科学与技术 大四\nGPA: 3.85/4.0\n\n"
    "科研经历：\n1. 扩散模型推理加速（2024.3-至今）\n   core 负责人\n"
    "   方法: DDPM, DDIM, score matching, PyTorch\n   成果: 特定场景推理加速约 30%，论文初稿撰写中\n\n"
    "2. 具身机器人全栈工程（2023.9-至今）\n   participant\n"
    "   方法: ROS, Python, 数据处理 pipeline, 模型部署\n   成果: 参与组内重要项目\n\n"
    "技能：Python, PyTorch, CUDA, ROS\n奖项：国家奖学金"
)
cur.execute("""
    INSERT INTO "Profile" (id, userId, university, major, gpa, targetSchool, targetAdvisor,
        advisorDirection, strengths, concerns, profileSummary, resumeText, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (profile_id, zs_id, "某 985 大学", "计算机科学与技术", "3.85/4.0（专业前 8%）",
      "清华大学", "朱军", "扩散模型 / 贝叶斯深度学习",
      strengths, concerns, profile_summary, resume_text, now_iso(), now_iso()))

# Experiences
for i, exp in enumerate([
    ("扩散模型推理加速", "2024.3-至今", "core",
     "DDPM, DDIM, score matching, PyTorch, CUDA",
     "特定场景推理加速约 30%，论文初稿撰写中",
     "独立负责采样算法对比实验，部分实现借助 Claude Code"),
    ("具身机器人全栈工程", "2023.9-至今", "participant",
     "ROS, Python, 数据处理 pipeline, 模型部署",
     "参与组内重要项目，改善了团队数据对齐流程",
     "负责数据处理和推理部署，有真机调试经验"),
]):
    cur.execute("""
        INSERT INTO "Experience" (id, profileId, projectName, timeRange, role, methods,
            outcome, contributionSummary, sortOrder, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cuid(), profile_id, exp[0], exp[1], exp[2], exp[3], exp[4], exp[5], i, now_iso()))

print(f"  ✓ zs@interviewcoach.ai (pro, profile + experiences)")

# ── 5. Create 1 completed session for zs ───────────────────────────────────
# Load harness template
harness_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "knowledge", "harness_templates", "tsinghua_cs_zhujun.json"
)
with open(harness_path, "r", encoding="utf-8") as f:
    harness = json.load(f)

session_id = cuid()
score_dims = {
    "内容深度": 82, "表达清晰度": 78, "时间控制": 85,
    "逻辑性": 80, "方向匹配度": 88, "追问应对": 76,
}
total_score = round(sum(score_dims.values()) / len(score_dims), 1)

harness["_engineState"] = json.dumps({
    "currentStageIdx": 2, "isComplete": True,
    "stageSummaries": {
        "intro": "张三完成了8分钟汇报，重点介绍了扩散模型推理加速项目，表达流畅，时间控制良好。",
        "questioning": "在追问阶段较好地解释了DDPM/DDIM原理，对ablation设计有一定理解，个人贡献边界稍模糊。"
    }
})

cur.execute("""
    INSERT INTO "Session" (id, userId, profileId, mode, status, currentStage,
        harnessSnapshot, totalScore, scoreDims, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (session_id, zs_id, profile_id, "practice", "completed", "questioning",
      json.dumps(harness), total_score, json.dumps(score_dims),
      now_iso(), now_iso()))

# QA records
qa_data = [
    ("intro", "请介绍你的研究背景和项目经历。",
     "我主要做扩散模型推理加速，通过对比DDPM和DDIM两种采样方法，在特定场景下实现了约30%的推理加速。同时参与了具身机器人全栈项目，负责数据处理和模型部署。", 0, 82),
    ("questioning", "你提到用了DDIM，能解释一下它相比DDPM加速的核心原理吗？",
     "DDIM通过引入确定性的采样路径，跳过了DDPM中的马尔科夫链步骤，可以用更少的采样步骤生成质量相近的图片。理论上可以将步数从1000步减少到50步左右。", 0, 80),
    ("questioning", "你们的ablation实验是怎么设计的？去掉哪个模块影响最大？",
     "我们主要对比了不同采样步数和schedule的组合。去掉了一个自适应步长调整模块后，在复杂场景的生成质量下降比较明显，大概有5-8%的FID提升。", 1, 75),
]
for stageId, question, answer, depth, score in qa_data:
    cur.execute("""
        INSERT INTO "QARecord" (id, sessionId, stageId, question, answer,
            followUpDepth, score, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (cuid(), session_id, stageId, question, answer, depth, score, now_iso()))

# WeaknessSummary
weakness = {"ablation实验设计": 0.5, "个人贡献边界": 0.4}
cur.execute("""
    INSERT INTO "WeaknessSummary" (id, userId, weaknesses, basedOnSessions, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
""", (cuid(), zs_id, json.dumps(weakness, ensure_ascii=False),
      json.dumps([session_id]), now_iso(), now_iso()))

print(f"  ✓ zs session: score={total_score}, dims={score_dims}")

conn.commit()
conn.close()

print("\n=== seed:reset 完成 ===")
print(f"  demo@interviewcoach.ai  / Demo2026!  (free, 无 profile)")
print(f"  zs@interviewcoach.ai    / Demo2026!  (pro, 有 profile + 1 条面试记录)")
