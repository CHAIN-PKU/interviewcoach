const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Demo2026!", 10);

  const demo = await prisma.user.upsert({
    where: { email: "demo@interviewcoach.ai" },
    update: {},
    create: {
      email: "demo@interviewcoach.ai",
      passwordHash: password,
      name: "Demo 用户",
      tier: "free",
    },
  });

  const zs = await prisma.user.upsert({
    where: { email: "zs@interviewcoach.ai" },
    update: {},
    create: {
      email: "zs@interviewcoach.ai",
      passwordHash: password,
      name: "张三",
      tier: "pro",
      profile: {
        create: {
          university: "某 985 大学",
          major: "计算机科学与技术",
          gpa: "3.85/4.0（专业前 8%）",
          targetSchool: "清华大学",
          targetAdvisor: "朱军",
          advisorDirection: "扩散模型 / 贝叶斯深度学习",
          strengths: JSON.stringify([
            "扩散模型推理加速有实际工程经验",
            "多学科背景（了解博弈论）",
            "工程能力强，具身全栈经验",
            "主动汇报习惯，导师对科研进度非常清楚",
          ]),
          concerns: JSON.stringify([
            "部分实现使用了 Claude Code 辅助，担心被追问细节",
            "某项目 ablation 实验设计不够完整",
            "团队项目个人贡献边界不够清晰",
          ]),
          profileSummary:
            "张三，某985计算机系大四，GPA 3.85，目标清华朱军组。核心项目：扩散模型推理加速（DDPM/DDIM对比实验，Claude Code辅助实现，有阶段性结果）；具身机器人全栈工程（数据/算法/部署均参与）。优势：工程能力强、主动沟通、多学科背景。潜在追问点：Claude Code辅助代码理解深度、ablation设计逻辑、团队项目个人贡献边界。",
          resumeText:
            "张三\n某985大学 计算机科学与技术 大四\nGPA: 3.85/4.0\n\n科研经历：\n1. 扩散模型推理加速（2024.3-至今）\n   core 负责人\n   方法: DDPM, DDIM, score matching, PyTorch\n   成果: 特定场景推理加速约 30%，论文初稿撰写中\n   说明: 部分采样算法借助 Claude Code 实现\n\n2. 具身机器人全栈工程（2023.9-至今）\n   participant\n   方法: ROS, Python, 数据处理 pipeline, 模型部署\n   成果: 参与组内重要项目，优化了团队数据对齐流程\n   说明: 有真机调试经验，负责上下游工程协调\n\n技能：Python, PyTorch, CUDA, ROS\n奖项：国家奖学金",
          experiences: {
            create: [
              {
                projectName: "扩散模型推理加速",
                timeRange: "2024.3-至今",
                role: "core",
                methods: "DDPM, DDIM, score matching, PyTorch, CUDA",
                outcome: "特定场景推理加速约 30%，论文初稿撰写中",
                contributionSummary:
                  "独立负责采样算法对比实验，部分实现借助 Claude Code",
                sortOrder: 0,
              },
              {
                projectName: "具身机器人全栈工程",
                timeRange: "2023.9-至今",
                role: "participant",
                methods: "ROS, Python, 数据处理 pipeline, 模型部署",
                outcome: "参与组内重要项目，改善了团队数据对齐流程",
                contributionSummary:
                  "负责数据处理和推理部署，有真机调试经验",
                sortOrder: 1,
              },
            ],
          },
        },
      },
    },
  });

  console.log("✓ demo:", demo.email);
  console.log("✓ zs:", zs.email);
  console.log("\nTest accounts:");
  console.log("  demo@interviewcoach.ai / Demo2026!  (free, no profile)");
  console.log("  zs@interviewcoach.ai   / Demo2026!  (pro, full profile)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
