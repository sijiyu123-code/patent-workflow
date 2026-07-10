export const meta = {
  name: 'patent-writer',
  description: '专利撰写：auto模式全自动 / interactive模式每阶段暂停确认',
  phases: [
    { title: '加载配置', detail: '读取config.json' },
    { title: '方向分析', detail: '空白发现/组合创新/延伸拓展 3Agent并行' },
    { title: '评委决策', detail: '3评委独立评分→首席评委终裁' },
    { title: '技术辩论', detail: '架构师→批判者→合成者→新颖性审查' },
    { title: '撰写审核', detail: '撰写初稿→质量审核' },
  ],
}

const projectRoot = '/workspace/project-nas-1000073/sijiyu/demos/zhuanliproject'
const summaryDir = projectRoot + '/patent_summaries'
const outputDir = projectRoot + '/outputs'
const configPath = projectRoot + '/config.json'

// ==================== Phase 0: 加载配置 ====================
phase('加载配置')

const configResult = await agent(`读取: ${configPath}
返回JSON（mode字段 + models子对象，取数组第一个元素）:
{
  "loaded": true/false,
  "mode": "auto"或"interactive",
  "writer": "model",
  "phase1": {"gap_finder":"model","combinator":"model","extender":"model"},
  "phase2": {"judge_novelty":"model","judge_feasibility":"model","judge_value":"model","chief_judge":"model"},
  "phase3": {"architect":"model","critic":"model","synthesizer":"model","novelty":"model"},
  "phase4": {"draft":"model","review":"model"}
}`, {
  label: '读取配置',
  phase: '加载配置',
  schema: {
    type: 'object',
    properties: {
      loaded: { type: 'boolean' },
      mode: { type: 'string' },
      writer: { type: 'string' },
      phase1: { type: 'object', properties: { gap_finder:{type:'string'}, combinator:{type:'string'}, extender:{type:'string'} }, required: ['gap_finder','combinator','extender'] },
      phase2: { type: 'object', properties: { judge_novelty:{type:'string'}, judge_feasibility:{type:'string'}, judge_value:{type:'string'}, chief_judge:{type:'string'} }, required: ['judge_novelty','judge_feasibility','judge_value','chief_judge'] },
      phase3: { type: 'object', properties: { architect:{type:'string'}, critic:{type:'string'}, synthesizer:{type:'string'}, novelty:{type:'string'} }, required: ['architect','critic','synthesizer','novelty'] },
      phase4: { type: 'object', properties: { draft:{type:'string'}, review:{type:'string'} }, required: ['draft','review'] },
    },
    required: ['loaded','mode','writer','phase1','phase2','phase3','phase4']
  }
})

const cfg = configResult?.loaded ? configResult : {
  loaded: false, mode: 'auto', writer: 'sonnet',
  phase1: { gap_finder:'sonnet', combinator:'sonnet', extender:'sonnet' },
  phase2: { judge_novelty:'sonnet', judge_feasibility:'sonnet', judge_value:'sonnet', chief_judge:'sonnet' },
  phase3: { architect:'sonnet', critic:'sonnet', synthesizer:'sonnet', novelty:'sonnet' },
  phase4: { draft:'sonnet', review:'sonnet' },
}

const mode = cfg.mode || 'auto'

log(`模式: ${mode === 'auto' ? '🤖 全自动' : '👆 半自动交互'}`)
log(`模型: ${cfg.phase1.gap_finder}/${cfg.phase2.chief_judge}/${cfg.phase3.synthesizer}/${cfg.phase4.draft}`)

// write-relay: 不能调Write的模型通过deepseek写文件
async function relayWrite(text, file, label) {
  return agent(`将以下内容原样写入文件（不要修改、总结、添加任何额外文字）:\n\n文件: ${file}\n\n=== 内容 ===\n${typeof text === 'string' ? text.slice(0, 30000) : JSON.stringify(text)}\n=== 结束 ===\n\n用 Write 工具写入。`, {
    label: `写入:${label}`,
    model: cfg.writer || 'deepseek/deepseek-v4-pro',
  })
}

// 阶段完成信号
function signalFile(phase) { return outputDir + '/.phase' + phase + '_done' }

// 阶段入口：auto直接进，interactive检查是否已完成
async function enterPhase(num, name) {
  phase(name)
  if (mode === 'auto') return 'run'

  const doneFile = signalFile(num)
  const checkResult = await agent(`用Read检查 ${doneFile} 是否存在。返回JSON: {"exists": true/false}`, {
    label: `检查Phase${num}`,
    schema: { type:'object', properties:{exists:{type:'boolean'}}, required:['exists'] }
  })

  if (checkResult?.exists) {
    log(`Phase ${num} 已完成，跳过`)
    return 'skip'
  }
  return 'run'
}

// 阶段退出：interactive模式写信号+暂停
async function exitPhase(num, name) {
  if (mode === 'auto') return
  const doneFile = signalFile(num)
  await agent(`用 Write 写入 ${doneFile}，内容: done`, {
    label: `信号:Phase${num}`,
    model: cfg.writer,
  })
  log(`========================================`)
  log(`Phase ${num} (${name}) ✅ 完成`)
  log(`查看 outputs/ 确认后，重新运行 workflow 继续下一阶段`)
  log(`========================================`)
}

// ==================== Phase 1: 方向分析 ====================
const p1 = await enterPhase(1, '方向分析')
if (p1 === 'stop') { return { phase: 1, status: 'awaiting_approval' } }

if (p1 !== 'skip') {
  const dirCtx = `读取: ${summaryDir}/patent_landscape.md + _summary.md + ${projectRoot}/work_content.md`

  const gapFinder = agent(`"技术空白发现者"。${dirCtx}
提出4-5个新方向。用 Write 保存到 ${outputDir}/auto_gap_finder.md`, {
    label: '空白发现', phase: '方向分析', model: cfg.phase1.gap_finder,
  })
  const combinator = agent(`"组合创新者"。${dirCtx}
拆解专利组件拼出新方向。用 Write 保存到 ${outputDir}/auto_combinator.md`, {
    label: '组合创新', phase: '方向分析', model: cfg.phase1.combinator,
  })
  const extender = agent(`"延伸拓展者"。${dirCtx}
在已有专利上做延伸。用 Write 保存到 ${outputDir}/auto_extender.md`, {
    label: '延伸拓展', phase: '方向分析', model: cfg.phase1.extender,
  })

  await exitPhase(1, '方向分析')
  if (mode === 'interactive') { return { phase: 1, status: 'done' } }
}

// ==================== Phase 2: 评委决策 ====================
const p2 = await enterPhase(2, '评委决策')
if (p2 === 'stop') { return { phase: 2, status: 'awaiting_approval' } }

if (p2 !== 'skip') {
  const jCtx = `读取: ${outputDir}/auto_gap_finder.md, auto_combinator.md, auto_extender.md + ${summaryDir}/patent_landscape.md`

  const judgeNovelty = agent(`"新颖性评委"(权重50%)。${jCtx} 用 Write 保存到 ${outputDir}/auto_judge_novelty.md`, {
    label: '新颖性评委', phase: '评委决策', model: cfg.phase2.judge_novelty,
  })
  const judgeFeasibility = agent(`"可行性评委"(权重50%)。${jCtx} 用 Write 保存到 ${outputDir}/auto_judge_feasibility.md`, {
    label: '可行性评委', phase: '评委决策', model: cfg.phase2.judge_feasibility,
  })
  const judgeValue = agent(`"价值评委"(权重50%)。${jCtx} 用 Write 保存到 ${outputDir}/auto_judge_value.md`, {
    label: '价值评委', phase: '评委决策', model: cfg.phase2.judge_value,
  })

  const chiefAnalysis = await agent(`"首席评委"。读取三位评委评分，加权汇总选最优方向。直接输出裁决报告，不要用Write。`, {
    label: '首席评委分析', phase: '评委决策', model: cfg.phase2.chief_judge,
  })
  await relayWrite(chiefAnalysis, `${outputDir}/auto_decision.md`, '首席裁决')

  await exitPhase(2, '评委决策')
  if (mode === 'interactive') { return { phase: 2, status: 'done' } }
}

// ==================== Phase 3: 技术辩论 ====================
const p3 = await enterPhase(3, '技术辩论')
if (p3 === 'stop') { return { phase: 3, status: 'awaiting_approval' } }

if (p3 !== 'skip') {
  const aAnalysis = await agent(`"架构师"。读取 auto_decision.md + 专利摘要。提出完整技术方案，标注薄弱点。直接输出，不要用Write。`, {
    label: '架构师分析', phase: '技术辩论', model: cfg.phase3.architect,
  })
  await relayWrite(aAnalysis, `${outputDir}/auto_architect_plan.md`, '架构方案')

  const critic = await agent(`"批判者"。读取 auto_architect_plan.md + 专利摘要。逐模块质疑，指出缺失和过度设计。用 Write 保存到 ${outputDir}/auto_critic_challenge.md`, {
    label: '批判者挑战', phase: '技术辩论', model: cfg.phase3.critic,
  })

  const sAnalysis = await agent(`"合成者"。读取架构方案+批判意见。逐条回应，综合定稿。直接输出，不要用Write。`, {
    label: '合成者分析', phase: '技术辩论', model: cfg.phase3.synthesizer,
  })
  await relayWrite(sAnalysis, `${outputDir}/auto_tech_plan.md`, '技术方案')

  const novelty = await agent(`"审查员"。读取 auto_tech_plan.md + 专利摘要。逐组件对比、创新评估、风险预警。用 Write 保存到 ${outputDir}/auto_novelty.md`, {
    label: '新颖性审查', phase: '技术辩论', model: cfg.phase3.novelty,
  })

  await exitPhase(3, '技术辩论')
  if (mode === 'interactive') { return { phase: 3, status: 'done' } }
}

// ==================== Phase 4: 撰写+审核 ====================
const p4 = await enterPhase(4, '撰写审核')
if (p4 === 'stop') { return { phase: 4, status: 'awaiting_approval' } }

if (p4 !== 'skip') {
  const dAnalysis = await agent(`"撰写工程师"。读取 format_template.md + auto_tech_plan.md + auto_novelty.md + auto_decision.md。撰写完整专利交底书（6章节，严格遵循format_template格式）。直接输出，不要用Write。`, {
    label: '撰写分析', phase: '撰写审核', model: cfg.phase4.draft,
  })
  await relayWrite(dAnalysis, `${outputDir}/auto_patent_draft.md`, '专利初稿')

  const review = await agent(`"审核员"。读取 auto_patent_draft.md + format_template.md。4维打分(格式/逻辑/区分度/语言各10分)+问题清单+修复建议。用 Write 保存到 ${outputDir}/auto_quality_review.md`, {
    label: '质量审核', phase: '撰写审核', model: cfg.phase4.review,
  })

  await exitPhase(4, '撰写审核')
}

log(`========================================`)
log(`  ${mode === 'auto' ? '全自动撰写完成！' : '全部阶段完成！'}`)
log(`========================================`)
log(`产出: auto_patent_draft.md ⭐ + auto_quality_review.md`)
if (mode === 'auto') log(`查看初稿后可与Claude讨论修改。`)

return { mode, done: true }
