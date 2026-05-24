import Link from "next/link";
import {
  Zap,
  Timer,
  BarChart3,
  ChevronRight,
  Brain,
  Target,
  MessageSquareMore,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">
              InterviewCoach
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors hidden sm:block"
            >
              定价
            </Link>
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              登录
            </Link>
            <Link
              href="/login?tab=register"
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-50/60 to-transparent rounded-full blur-3xl -z-10" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            专为 CS/AI 保研复试设计
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
            面试教练
            <span className="block gradient-text mt-1">InterviewCoach</span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-4 leading-relaxed">
            AI 驱动的个性化面试训练平台
          </p>
          <p className="text-base text-slate-500 max-w-xl mx-auto mb-12">
            不是更好的聊天机器人，而是一套{" "}
            <span className="text-slate-700 font-medium">
              懂你、训练你、追踪你进步
            </span>{" "}
            的面试系统
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/login?tab=register"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] group"
            >
              开始训练
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              了解产品
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 mt-16 text-sm text-slate-500">
            {[
              { label: "个性化训练方案", value: "AI 驱动生成" },
              { label: "结构化压力面试", value: "计时 · 追问 · 报告" },
              { label: "进步可量化", value: "每次都在变好" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-semibold text-slate-900 text-base">
                  {s.value}
                </div>
                <div className="text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              为什么不直接用 ChatGPT？
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              ChatGPT 可以问问题，但它不知道你是谁、你的简历里哪里容易被追问穿、你上次在哪里卡壳
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "个性化训练方案",
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                desc: "根据你的目标院校、导师方向和个人简历，AI 生成专属的结构化面试训练流程，阶段时长、追问策略、评分标准全部个性化",
                points: [
                  "清华朱军组 / 浙大等各校模板",
                  "8 分钟汇报 + 追问全流程",
                  "覆盖全国 CS/AI 保研场景",
                ],
              },
              {
                icon: Timer,
                title: "真实压力训练",
                color: "text-violet-600",
                bg: "bg-violet-50",
                desc: "计时器、强制阶段切换、语音问答，复刻接近真实的面试压力环境。在无压力环境下练 10 次，不如有压力练 3 次",
                points: [
                  "精确倒计时，还剩 1 分钟变色提醒",
                  "AI 追问你简历里真实弱点",
                  "语音输入，更接近真实面试",
                ],
              },
              {
                icon: BarChart3,
                title: "看得到进步",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                desc: "每次训练后生成结构化评分报告，六维雷达图展示薄弱点，下一次训练自动注入历史弱点，你能清楚看到「ablation 应对从 60 分提到 73 分」",
                points: [
                  "六维结构化评分",
                  "逐题追溯 + 改进建议",
                  "第二次训练更精准",
                ],
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div
                  className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-4`}
                >
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">
                  {f.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  {f.desc}
                </p>
                <ul className="space-y-1.5">
                  {f.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-2 text-sm text-slate-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Pain Points */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              我们从真实调研中发现的痛点
            </h2>
            <p className="text-slate-500">
              这些焦虑，在保研面试前的每个深夜都真实存在
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: "😰",
                pain: "科研经历零散，不知道 8 分钟该讲哪些、怎么排序",
              },
              {
                icon: "🤖",
                pain: "用了 Claude Code 辅助实现，怕老师追问技术细节露馅",
              },
              {
                icon: "👥",
                pain: "团队项目贡献分散，说不清楚自己具体做了什么",
              },
              {
                icon: "🔍",
                pain: "找不到懂 CS/AI 科研的人高频模拟追问",
              },
              {
                icon: "🎯",
                pain: "不确定该重点讲有成果的，还是和导师方向更贴近的",
              },
              {
                icon: "❓",
                pain: "不知道教授真正看重什么，价值感和潜力怎么展示",
              },
            ].map((item) => (
              <div
                key={item.pain}
                className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <span className="text-2xl shrink-0">{item.icon}</span>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {item.pain}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-lg font-semibold text-slate-900 mb-2">
              InterviewCoach 是专门为这些场景设计的
            </p>
            <p className="text-slate-500 text-sm">
              不是泛用的 AI 面试工具，而是深度理解保研复试场景的训练系统
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-gradient-to-b from-slate-950 to-indigo-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              60 秒开始，训练一次
              <span className="text-indigo-400">真正有价值的面试</span>
            </h2>
            <p className="text-slate-400">
              从注册到进入模拟面试，60 秒内完成
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: Zap,
                title: "选择场景",
                desc: "保研复试 / 夏令营，填写目标院校和研究方向",
              },
              {
                step: "02",
                icon: Brain,
                title: "生成方案",
                desc: "AI 匹配对应模板，生成个性化训练流程",
              },
              {
                step: "03",
                icon: MessageSquareMore,
                title: "开始面试",
                desc: "计时、阶段切换、语音追问，全程压力训练",
              },
              {
                step: "04",
                icon: BarChart3,
                title: "查看报告",
                desc: "六维评分 + 逐题回溯，下次针对弱点加强",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-indigo-400/30 font-bold text-5xl mb-3 leading-none">
                  {s.step}
                </div>
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center mb-3">
                  <s.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            开始你的第一次模拟面试
          </h2>
          <p className="text-slate-500 mb-10 text-lg">
            免费使用，无需信用卡。60 秒内进入面试。
          </p>
          <Link
            href="/login?tab=register"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-indigo-200 hover:scale-[1.02] group"
          >
            免费注册开始
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="text-xs text-slate-400 mt-4">
            演示体验码：<code className="font-mono bg-slate-50 px-1.5 py-0.5 rounded">DEMO2026</code>（解锁 Pro 模型）
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
              <Brain className="w-3 h-3 text-white" />
            </div>
            <span>InterviewCoach · 面试教练</span>
          </div>
          <p>© 2026 InterviewCoach. 专为 CS/AI 保研复试设计</p>
        </div>
      </footer>
    </div>
  );
}
