export const meta = {
  name: 'full-auto-patent',
  description: '全自动专利撰写：3Agent方向分析 → 3评委决策 → 3Agent辩论深挖 → 撰写+审核',
  phases: [
    { title: '加载配置', detail: '读取config.json获取各Agent模型分配' },
    { title: '方向分析', detail: '空白发现/组合创新/延伸拓展 3Agent并行' },
    { title: '评委决策', detail: '3评委独立评分→首席评委终裁' },
    { title: '技术辩论', detail: '架构师提案→批判者质疑→合成者定稿→新颖性审查' },
    { title: '撰写审核', detail: '按模板撰写初稿→审核Agent打分+改进建议' },
  ],
}

const projectRoot = '/workspace/project-nas-1000073/sijiyu/demos/zhuanliproject'
const summaryDir = projectRoot + '/patent_summaries'
const outputDir = projectRoot + '/outputs'
const configPath = projectRoot + '/config.json'

// ==================== Phase 0: 加载配置 ====================
phase('加载配置')

const configResult = await agent(`读取配置文件: ${configPath}
如果文件存在，返回其中的models对象的原始内容（保留数组/字符串类型）。
如果不存在，返回默认配置。

返回JSON:
{
  "loaded": true/false,
  "phase1": {"gap_finder": "model", "combinator": "model", "extender": "model"},
  "phase2": {"judge_novelty": "model", "judge_feasibility": "model", "judge_value": "model", "chief_judge": "model"},
  "phase3": {"architect": "model", "critic": "model", "synthesizer": "model", "novelty": "model"},
  "phase4": {"draft": "model", "review": "model"}
}
注意：每个字段取数组的第一个元素作为模型名。例如 config 中 gap_finder: ["deepseek/xxx", "google/xxx"] → 返回 "deepseek/xxx"`, {
  label: '读取模型配置',
  phase: '加载配置',
  schema: {
    type: 'object',
    properties: {
      loaded: { type: 'boolean' },
      phase1: {
        type: 'object',
        properties: {
          gap_finder: { type: 'string' },
          combinator: { type: 'string' },
          extender: { type: 'string' },
        },
        required: ['gap_finder', 'combinator', 'extender']
      },
      phase2: {
        type: 'object',
        properties: {
          judge_novelty: { type: 'string' },
          judge_feasibility: { type: 'string' },
          judge_value: { type: 'string' },
          chief_judge: { type: 'string' },
        },
        required: ['judge_novelty', 'judge_feasibility', 'judge_value', 'chief_judge']
      },
      phase3: {
        type: 'object',
        properties: {
          architect: { type: 'string' },
          critic: { type: 'string' },
          synthesizer: { type: 'string' },
          novelty: { type: 'string' },
        },
        required: ['architect', 'critic', 'synthesizer', 'novelty']
      },
      phase4: {
        type: 'object',
        properties: {
          draft: { type: 'string' },
          review: { type: 'string' },
        },
        required: ['draft', 'review']
      },
    },
    required: ['loaded', 'phase1', 'phase2', 'phase3', 'phase4']
  }
})

const cfg = configResult?.loaded ? configResult : {
  loaded: false,
  phase1: { gap_finder: 'sonnet', combinator: 'sonnet', extender: 'sonnet' },
  phase2: { judge_novelty: 'sonnet', judge_feasibility: 'sonnet', judge_value: 'sonnet', chief_judge: 'opus' },
  phase3: { architect: 'sonnet', critic: 'sonnet', synthesizer: 'opus', novelty: 'sonnet' },
  phase4: { draft: 'opus', review: 'sonnet' },
}

log(`模型配置: ${cfg.loaded ? 'config.json' : 'defaults'}`)
log(`  Phase1: ${cfg.phase1.gap_finder} / ${cfg.phase1.combinator} / ${cfg.phase1.extender}`)
log(`  Phase2: ${cfg.phase2.judge_novelty}/${cfg.phase2.judge_feasibility}/${cfg.phase2.judge_value} → 首席${cfg.phase2.chief_judge}`)
log(`  Phase3: ${cfg.phase3.architect}→${cfg.phase3.critic}→${cfg.phase3.synthesizer}→${cfg.phase3.novelty}`)
log(`  Phase4: 撰写${cfg.phase4.draft} 审核${cfg.phase4.review}`)

// ==================== Phase 1: 方向分析 ====================
phase('方向分析')

const dirCtx = `工作目录: ${projectRoot}
读取资料: ${summaryDir}/patent_landscape.md + ${summaryDir}/ 下所有 _summary.md + ${projectRoot}/work_content.md`

const gapFinder = agent(`"技术空白发现者"。${dirCtx}
从技术空白和场景扩展视角，提出4-5个新方向。
用 Write 保存到 ${outputDir}/auto_gap_finder.md`, {
  label: '空白发现',
  phase: '方向分析',
  model: cfg.phase1.gap_finder,
})

const combinator = agent(`"组合创新者"。${dirCtx}
从跨方向技术融合视角，拆解专利组件重新拼接，提出4-5个新方向。
用 Write 保存到 ${outputDir}/auto_combinator.md`, {
  label: '组合创新',
  phase: '方向分析',
  model: cfg.phase1.combinator,
})

const extender = agent(`"延伸拓展者"。${dirCtx}
在已有专利上做延伸（方法论深化/性能提升/系统化/跨场景迁移），提出4-5个新方向。
用 Write 保存到 ${outputDir}/auto_extender.md`, {
  label: '延伸拓展',
  phase: '方向分析',
  model: cfg.phase1.extender,
})

// ==================== Phase 2: 评委决策 ====================
phase('评委决策')

const judgeCtx = `读取: ${outputDir}/auto_gap_finder.md, auto_combinator.md, auto_extender.md + ${summaryDir}/patent_landscape.md
对所有方向按你的侧重点打分（1-5分）。`

const judgeNovelty = agent(`"新颖性评委"。权重: 新颖性50% 可行性30% 价值20%。${judgeCtx}
用 Write 保存到 ${outputDir}/auto_judge_novelty.md`, {
  label: '新颖性评委',
  phase: '评委决策',
  model: cfg.phase2.judge_novelty,
})

const judgeFeasibility = agent(`"可行性评委"。权重: 可行性50% 新颖性30% 价值20%。${judgeCtx}
用 Write 保存到 ${outputDir}/auto_judge_feasibility.md`, {
  label: '可行性评委',
  phase: '评委决策',
  model: cfg.phase2.judge_feasibility,
})

const judgeValue = agent(`"价值评委"。权重: 商业价值50% 可行性30% 新颖性20%。${judgeCtx}
用 Write 保存到 ${outputDir}/auto_judge_value.md`, {
  label: '价值评委',
  phase: '评委决策',
  model: cfg.phase2.judge_value,
})

const chiefJudge = await agent(`"首席评委"。读取三位评委评分（auto_judge_novelty/feasibility/value.md），
加权汇总（新颖性×0.35+可行性×0.30+价值×0.35），选1个方向，输出裁决报告。
用 Write 保存到 ${outputDir}/auto_decision.md`, {
  label: '首席评委终裁',
  phase: '评委决策',
  model: cfg.phase2.chief_judge,
})

log(`评委决策完成 → ${outputDir}/auto_decision.md`)

// ==================== Phase 3: 技术辩论 ====================
phase('技术辩论')

const architect = await agent(`"架构师"。读取 ${outputDir}/auto_decision.md + 专利摘要。
提出完整技术方案（架构/模块/数据流/实施路径），标注薄弱点。
用 Write 保存到 ${outputDir}/auto_architect_plan.md`, {
  label: '架构师提案',
  phase: '技术辩论',
  model: cfg.phase3.architect,
})

const critic = await agent(`"批判者"。读取 ${outputDir}/auto_architect_plan.md + 专利摘要。
逐模块质疑（替代方案/专利冲突/风险），指出缺失维度和过度设计。
用 Write 保存到 ${outputDir}/auto_critic_challenge.md`, {
  label: '批判者挑战',
  phase: '技术辩论',
  model: cfg.phase3.critic,
})

const synthesizer = await agent(`"合成者"。读取架构师方案 + 批判意见。
逐条回应批判，综合定稿最终技术方案。
用 Write 保存到 ${outputDir}/auto_tech_plan.md`, {
  label: '合成者定稿',
  phase: '技术辩论',
  model: cfg.phase3.synthesizer,
})

const novelty = await agent(`"专利审查员"。读取 ${outputDir}/auto_tech_plan.md + 专利摘要。
逐组件对比、创新高度评估、Top-3创新点、风险预警。
用 Write 保存到 ${outputDir}/auto_novelty.md`, {
  label: '新颖性审查',
  phase: '技术辩论',
  model: cfg.phase3.novelty,
})

log(`技术辩论完成 → ${outputDir}/auto_tech_plan.md`)

// ==================== Phase 4: 撰写+审核 ====================
phase('撰写审核')

const draft = await agent(`"专利撰写工程师"。读取 format_template.md + auto_tech_plan.md + auto_novelty.md + auto_decision.md。
撰写完整技术发明专利交底书（6个必须章节，严格遵循format_template）。
用 Write 保存到 ${outputDir}/auto_patent_draft.md`, {
  label: '撰写初稿',
  phase: '撰写审核',
  model: cfg.phase4.draft,
})

const review = await agent(`"专利质量审核员"。读取 auto_patent_draft.md + format_template.md。
4维度逐项打分（格式/逻辑/区分度/语言，各10分），输出问题清单+自动修复建议。
用 Write 保存到 ${outputDir}/auto_quality_review.md`, {
  label: '质量审核',
  phase: '撰写审核',
  model: cfg.phase4.review,
})

log(`========================================`)
log(`  全自动专利撰写完成！`)
log(`========================================`)
log(`模型: ${cfg.phase1.gap_finder} / ${cfg.phase2.chief_judge} / ${cfg.phase3.synthesizer} / ${cfg.phase4.draft}`)
log(`产出:`)
log(`  方向: auto_gap_finder / auto_combinator / auto_extender`)
log(`  决策: auto_decision`)
log(`  辩论: auto_architect_plan → auto_critic_challenge → auto_tech_plan`)
log(`  审查: auto_novelty`)
log(`  初稿: auto_patent_draft.md ⭐`)
log(`  审核: auto_quality_review.md`)

return { done: true }
