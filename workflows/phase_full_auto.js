export const meta = {
  name: 'full-auto-patent',
  description: '全自动专利撰写：多模型方向分析 → 3评委决策 → 3Agent辩论深挖 → 撰写+审核，全程无交互',
  phases: [
    { title: '加载配置', detail: '读取config.json获取各Agent模型分配' },
    { title: '方向分析', detail: '空白发现/组合创新/延伸拓展，每角色可配多模型并行→合并' },
    { title: '评委决策', detail: '3评委独立评分→首席评委终裁' },
    { title: '技术辩论', detail: '架构师提案→批判者质疑→合成者定稿→新颖性审查' },
    { title: '撰写审核', detail: '按模板撰写初稿→审核Agent打分+改进建议' },
  ],
}

const projectRoot = '/workspace/project-nas-1000073/sijiyu/demos/zhuanliproject'
const summaryDir = projectRoot + '/patent_summaries'
const outputDir = projectRoot + '/outputs'
const configPath = projectRoot + '/config.json'

// 标准化模型配置：字符串→数组
function normalizeModels(models) {
  const normalized = {}
  for (const [phase, roles] of Object.entries(models)) {
    normalized[phase] = {}
    for (const [role, val] of Object.entries(roles)) {
      normalized[phase][role] = Array.isArray(val) ? val : [val]
    }
  }
  return normalized
}

// ==================== Phase 0: 加载配置 ====================
phase('加载配置')

const defaultConfig = {
  phase1_direction: { gap_finder: ['sonnet'], combinator: ['sonnet'], extender: ['sonnet'] },
  phase2_decision: { judge_novelty: ['sonnet'], judge_feasibility: ['sonnet'], judge_value: ['sonnet'], chief_judge: ['opus'] },
  phase3_deepdive: { architect: ['sonnet'], critic: ['sonnet'], synthesizer: ['opus'], novelty: ['sonnet'] },
  phase4_writing: { draft: ['opus'], review: ['sonnet'] },
}

const configResult = await agent(`读取配置文件: ${configPath}
用 Read 工具读取该JSON文件。如果文件存在，返回其models对象（每个字段可能是字符串或字符串数组）。
如果文件不存在或读取失败，返回默认配置。

返回JSON格式：
{
  "loaded": true/false,
  "models": { ... 原始配置内容 ... },
  "source": "config.json" 或 "defaults"
}

注意：models中的每个值保持原始类型不变（字符串或数组）`, {
  label: '读取模型配置',
  phase: '加载配置',
})

// 解析并标准化
let rawModels = {}
if (configResult?.loaded && configResult.models) {
  rawModels = configResult.models
} else {
  rawModels = defaultConfig
}

const m = normalizeModels(rawModels)

log(`模型配置: ${configResult?.source || 'defaults'}`)
log(`  Phase1 空白发现: ${m.phase1_direction.gap_finder.join(' + ')}`)
log(`  Phase1 组合创新: ${m.phase1_direction.combinator.join(' + ')}`)
log(`  Phase1 延伸拓展: ${m.phase1_direction.extender.join(' + ')}`)
log(`  Phase2: 评委${m.phase2_decision.judge_novelty}/${m.phase2_decision.judge_feasibility}/${m.phase2_decision.judge_value} 首席${m.phase2_decision.chief_judge}`)
log(`  Phase3: 架构${m.phase3_deepdive.architect}→批判${m.phase3_deepdive.critic}→合成${m.phase3_deepdive.synthesizer}→审查${m.phase3_deepdive.novelty}`)
log(`  Phase4: 撰写${m.phase4_writing.draft} 审核${m.phase4_writing.review}`)

// ==================== Phase 1: 方向分析（多模型并行 + 合并） ====================
phase('方向分析')

const directionContext = `工作目录: ${projectRoot}
需要读取的资料：
1. 专利全景地图: ${summaryDir}/patent_landscape.md
2. 所有专利摘要: ${summaryDir}/ 目录下的 _summary.md 文件
3. 当前工作内容（如有）: ${projectRoot}/work_content.md
请先用 Read 工具读取上述文件，然后从你的特定视角分析。`

// 辅助函数：运行多模型Agent + 合并
async function runMultiModelAgents(role, roleCN, models, prompt, outputFile) {
  if (models.length === 1) {
    // 单模型，直接运行
    return agent(prompt, {
      label: roleCN,
      phase: '方向分析',
      model: models[0],
    })
  }

  // 多模型：每个模型独立运行 → 合并
  const modelOutputs = []
  const modelLabels = models.map((model, i) => `${roleCN}(${model.split('/').pop()})`)

  // 并行运行多个模型
  const results = await parallel(models.map((model, i) => () => {
    const individualPrompt = `${prompt}

请将你的分析结果用 Write 保存到 ${outputFile.replace('.md', `_${i}.md`)}`
    return agent(individualPrompt, {
      label: modelLabels[i],
      phase: '方向分析',
      model: model,
    })
  }))

  // 合并Agent：读取所有模型的输出，取长补短
  const mergeFiles = models.map((_, i) => outputFile.replace('.md', `_${i}.md`))
  const mergeAgent = await agent(`你是方向合成者。${models.length}个模型（${models.join(', ')}）各自独立完成了"${roleCN}"的分析。

请读取它们的输出：
${mergeFiles.map(f => `- ${f}`).join('\n')}

任务：
1. 汇总所有方向建议
2. 去重：合并相同或高度相似的方向
3. 互补：如果模型A提出了某个方向但深度不够，模型B恰好有补充细节，将两者融合
4. 冲突处理：如果两个模型对同一方向给出矛盾判断，选择论证更充分的一方，并说明理由
5. 最终输出合并后的完整方向分析（4-6个方向），包含交叉验证过的技术细节

用 Write 保存到 ${outputFile}`, {
    label: `合并:${roleCN}`,
    phase: '方向分析',
    model: 'sonnet',
  })

  return mergeAgent
}

// 三个方向角色并行执行（每个角色内部多模型并行→合并）
const [gapFinder, combinator, extender] = await Promise.all([
  runMultiModelAgents(
    'gap_finder', '空白发现',
    m.phase1_direction.gap_finder,
    `你是"技术空白发现者"。${directionContext}
从技术空白和场景扩展视角，提出4-5个新专利方向。
每个方向：方向名称、要解决的问题、gap分析、创新角度、可行性(high/medium/low)。`,
    `${outputDir}/auto_gap_finder.md`
  ),
  runMultiModelAgents(
    'combinator', '组合创新',
    m.phase1_direction.combinator,
    `你是"组合创新者"。${directionContext}
从跨方向技术融合视角，拆解已有专利技术组件重新拼接，提出4-5个新方向。
每个方向：方向名称、要解决的问题、融合了哪些技术、创新角度、可行性。`,
    `${outputDir}/auto_combinator.md`
  ),
  runMultiModelAgents(
    'extender', '延伸拓展',
    m.phase1_direction.extender,
    `你是"延伸拓展者"。${directionContext}
在已有专利上做深度延伸（方法论深化/性能提升/系统化/跨场景迁移），提出4-5个新方向。
每个方向：方向名称、要解决的问题、基于哪个专利、延伸路径、核心创新、可行性。`,
    `${outputDir}/auto_extender.md`
  )
])

log(`方向分析完成: 3个角色 × ${m.phase1_direction.gap_finder.length + m.phase1_direction.combinator.length + m.phase1_direction.extender.length}个模型 → 合并为3份报告`)

// ==================== Phase 2: 评委决策（3评委 + 首席评委） ====================
phase('评委决策')

const judgeCommon = `你是专利方向评审委员会成员。三位分析专家已提出方向建议：
- ${outputDir}/auto_gap_finder.md
- ${outputDir}/auto_combinator.md
- ${outputDir}/auto_extender.md

请读取这些报告和专利全景地图 ${summaryDir}/patent_landscape.md

你需要对所有方向建议进行独立评分。每个方向按你被分配的侧重点打分（1-5分），同时给出简要评语。`

const judgeNovelty = agent(`${judgeCommon}

你是"新颖性评审"，你的核心权重是新颖性（占你评分的50%），其次可行性30%、价值20%。
你最关心：这个方向跟已有专利的差异有多大？是不是真正的新东西？
对每个方向给新颖性打高分的是那些有明显技术跳跃的方案。

用 Write 保存评分结果到 ${outputDir}/auto_judge_novelty.md`, {
  label: '新颖性评委',
  phase: '评委决策',
  model: m.phase2_decision.judge_novelty[0],
})

const judgeFeasibility = agent(`${judgeCommon}

你是"可行性评审"，你的核心权重是可行性（占你评分的50%），其次新颖性30%、价值20%。
你最关心：这个方向能不能落地？技术组件是否成熟？数据好不好获取？
对每个方向给可行性打高分的是那些工程路径清晰、风险可控的方案。

用 Write 保存评分结果到 ${outputDir}/auto_judge_feasibility.md`, {
  label: '可行性评委',
  phase: '评委决策',
  model: m.phase2_decision.judge_feasibility[0],
})

const judgeValue = agent(`${judgeCommon}

你是"价值评审"，你的核心权重是商业价值（占你评分的50%），其次可行性30%、新颖性20%。
你最关心：这个方向有没有商业价值？保护范围够不够大？能否形成竞争壁垒？
对每个方向给价值打高分的是那些应用场景广、商业想象空间大的方案。

用 Write 保存评分结果到 ${outputDir}/auto_judge_value.md`, {
  label: '价值评委',
  phase: '评委决策',
  model: m.phase2_decision.judge_value[0],
})

const chiefJudge = await agent(`你是首席评委。三位独立评委已提交评分：
- 新颖性评委: ${outputDir}/auto_judge_novelty.md
- 可行性评委: ${outputDir}/auto_judge_feasibility.md
- 价值评委: ${outputDir}/auto_judge_value.md

任务：
1. 将三位评委的评分加权汇总（新颖性×0.35 + 可行性×0.30 + 价值×0.35）
2. 如果前三名分数差在1分以内，说明存在分歧，请分析分歧原因并给出你的倾向
3. 最终只选1个方向，输出裁决报告：
   - 所有候选方向的加权评分对比表（列明每位评委的原始打分）
   - 前三名的详细分析（分歧点、共识点）
   - 最终选定方向及裁决理由
   - 该方向的核心技术思路（500字概述）

用 Write 保存到 ${outputDir}/auto_decision.md

你必须做出明确的选择，不能模棱两可。`, {
  label: '首席评委终裁',
  phase: '评委决策',
  model: m.phase2_decision.chief_judge[0],
})

log(`评委决策完成: 3评委独立评分 + 首席裁决，已选定方向`)

// ==================== Phase 3: 技术辩论（3 Agent辩论 + 新颖性审查） ====================
phase('技术辩论')

const architect = await agent(`你是资深技术架构师。请读取：
- 选定方向: ${outputDir}/auto_decision.md
- 专利全景地图: ${summaryDir}/patent_landscape.md
- 所有相关专利摘要: ${summaryDir}/ 下的 _summary.md
- 当前工作内容: ${projectRoot}/work_content.md

你的任务是提出一套完整的技术方案（第一版）：
1. 系统整体架构（文字+流程描述）
2. 核心技术模块（每个说明：解决什么困难→用什么手段→为什么这样设计）
3. 数据流和关键算法（伪代码）
4. 实施路径

请把你设计的方案中你认为可能存在争议或薄弱的地方也标注出来（"自曝其短"），
这样后续的批判者可以更有针对性地挑战。

用 Write 保存到 ${outputDir}/auto_architect_plan.md`, {
  label: '架构师提案',
  phase: '技术辩论',
  model: m.phase3_deepdive.architect[0],
})

const critic = await agent(`你是技术批判者，角色是"唱反调"——找出方案中的漏洞、风险和被忽视的替代方案。

请读取架构师的方案: ${outputDir}/auto_architect_plan.md
以及所有已有专利摘要: ${summaryDir}/ 下的 _summary.md

你的任务是严格的批判分析：
1. 逐模块挑战：对架构师的每个技术模块，提出至少1个质疑：
   - 这个设计有没有更简单的替代方案？
   - 是否存在已有专利已经覆盖了这个思路？
   - 实施中最大的风险是什么？
2. 缺失维度检查：架构师有没有遗漏的重要技术问题？
3. 过度设计检查：哪些模块是"为了复杂而复杂"，可以砍掉或简化？
4. 提出替代方案：对于你认为有问题的模块，给出具体的替代设计。

用 Write 保存到 ${outputDir}/auto_critic_challenge.md

你要犀利但不刻薄，目标是让方案更强，而不是推翻它。`, {
  label: '批判者挑战',
  phase: '技术辩论',
  model: m.phase3_deepdive.critic[0],
})

const synthesizer = await agent(`你是技术合成者。架构师提出了方案，批判者指出了问题，你来拍板定稿。

请读取：
- 架构师方案: ${outputDir}/auto_architect_plan.md
- 批判者意见: ${outputDir}/auto_critic_challenge.md
- 已有专利摘要: ${summaryDir}/ 下的 _summary.md

你的任务是综合双方意见，产出最终技术方案：
1. 逐条回应批判：对批判者提出的每个质疑，给出你的判断（接受/部分接受/驳回）及理由
2. 采纳与修改：明确哪些批判意见导致方案调整，调整了什么
3. 最终方案：输出调整后的完整技术方案，包含：
   - 系统架构（采纳修改后）
   - 核心技术模块（标注哪些是架构师原版、哪些经过批判修正）
   - 数据流/算法伪代码
   - 实施路径与预期效果
   - 与已有专利的差异对照表

用 Write 保存到 ${outputDir}/auto_tech_plan.md

你拥有最终决定权，但每个决定都要给出理由。`, {
  label: '合成者定稿',
  phase: '技术辩论',
  model: m.phase3_deepdive.synthesizer[0],
})

const novelty = await agent(`你是专利审查员，独立审查最终技术方案。

请读取：
- 最终方案: ${outputDir}/auto_tech_plan.md
- 所有已有专利摘要: ${summaryDir}/ 下的 _summary.md
- 架构师原案: ${outputDir}/auto_architect_plan.md
- 批判意见: ${outputDir}/auto_critic_challenge.md

进行新颖性论证：
1. 逐组件对比：技术方案的每个核心组件与已有专利一一对比
2. 创新高度评估：整体方案是 incremental / substantial / breakthrough？
3. Top-3 创新点：最具新颖性的3个技术点
4. 风险预警：哪些技术点可能被审查员质疑新颖性？如何应对？
5. 强化建议：如果在撰写专利时需要进一步强化新颖性，应该强调什么？

用 Write 保存到 ${outputDir}/auto_novelty.md`, {
  label: '新颖性审查',
  phase: '技术辩论',
  model: m.phase3_deepdive.novelty[0],
})

log(`技术辩论完成: 架构师→批判者→合成者→新颖性审查，四轮递进`)

// ==================== Phase 4: 撰写+审核 ====================
phase('撰写审核')

const draft = await agent(`你是资深专利撰写工程师。请读取：
1. 格式模板（严格遵循）: ${summaryDir}/format_template.md
2. 最终技术方案: ${outputDir}/auto_tech_plan.md
3. 新颖性论证: ${outputDir}/auto_novelty.md
4. 方向决策: ${outputDir}/auto_decision.md
5. 相关已有专利摘要: ${summaryDir}/ 下的 _summary.md

撰写一份完整的技术发明专利交底书，严格遵循 format_template.md 的章节结构和用语规范：

必须包含的章节：
1. 缩略语和关键术语定义
2. 本发明所要解决的技术问题（发明目的）
3. 相关技术背景与最相近似的现有实现方案（引用已有专利）
4. 本发明技术方案的详细阐述（核心章节，分模块详述）
5. 本发明技术方案带来的有益效果
6. 本发明的技术关键点或欲保护点（至少5个权利要求方向）

写作要求：
- 使用"本发明旨在..."、"其特征在于..."等专利用语
- 技术描述使本领域技术人员能够复现
- 突出与已有专利的差异化
- 正文 3000-5000 字

用 Write 保存到 ${outputDir}/auto_patent_draft.md`, {
  label: '撰写初稿',
  phase: '撰写审核',
  model: m.phase4_writing.draft[0],
})

const review = await agent(`你是专利质量审核员，你要像真正的专利代理机构审核员一样严格审查。

请读取：
- 专利初稿: ${outputDir}/auto_patent_draft.md
- 格式模板: ${summaryDir}/format_template.md
- 技术方案: ${outputDir}/auto_tech_plan.md
- 新颖性论证: ${outputDir}/auto_novelty.md

从4个维度逐项审核打分（每项满分10分，总分40分）：

### A. 格式与规范（满分10分）
- [ ] 章节结构是否完整
- [ ] 编号方式是否规范
- [ ] 术语使用前后是否一致
- [ ] 图表/表格引用格式是否正确

### B. 逻辑与完整性（满分10分）
- [ ] "技术问题→现有缺陷→本发明方案→有益效果"逻辑链是否闭合
- [ ] 每个权利要求保护点是否在技术方案中有充分展开
- [ ] 技术方案是否可实施
- [ ] 是否有遗漏的关键技术细节

### C. 新颖性与区分度（满分10分）
- [ ] 背景技术章节是否如实引用了最接近的已有方案
- [ ] 本发明与已有方案的差异是否表述清晰
- [ ] 没有夸大或模糊化与已有方案的差异
- [ ] 权利要求保护范围是否与已有专利有实质区别

### D. 语言与表述（满分10分）
- [ ] 是否符合专利用语规范
- [ ] 是否有模糊歧义的表述
- [ ] 技术描述是否精确
- [ ] 篇幅和信息密度是否合适

输出格式：
1. 整体评分表（ABCD四项分数+总分）
2. 逐项详细问题清单，每行：章节 | 问题 | 严重程度(必须改/建议改/可选) | 修改建议
3. 自动修复：对于"必须改"级别的问题，直接给出修改后的文段
4. 总结：该初稿是否达到提交水准？

用 Write 保存到 ${outputDir}/auto_quality_review.md`, {
  label: '质量审核',
  phase: '撰写审核',
  model: m.phase4_writing.review[0],
})

// 统计模型使用情况
const totalModels = Object.values(m).flatMap(p => Object.values(p)).flat().length
const uniqueModels = [...new Set(Object.values(m).flatMap(p => Object.values(p)).flat())]

log(`========================================`)
log(`  全自动专利撰写完成！`)
log(`========================================`)
log(`使用模型: ${uniqueModels.join(', ')}`)
log(`模型配置: ${configResult?.source || 'defaults'}`)
log(`📋 产出文件清单:`)
log(`  方向分析: auto_gap_finder.md / auto_combinator.md / auto_extender.md`)
log(`  评委评分: auto_judge_novelty.md / auto_judge_feasibility.md / auto_judge_value.md`)
log(`  最终决策: auto_decision.md`)
log(`  技术辩论: auto_architect_plan.md → auto_critic_challenge.md → auto_tech_plan.md`)
log(`  新颖性审查: auto_novelty.md`)
log(`  专利初稿: auto_patent_draft.md ⭐`)
log(`  质量审核: auto_quality_review.md`)
log(``)
log(`查看初稿后如需修改，直接与Claude讨论即可。`)

return {
  config: configResult,
  phase1: { gapFinder, combinator, extender },
  phase2: { judgeNovelty, judgeFeasibility, judgeValue, chiefJudge },
  phase3: { architect, critic, synthesizer, novelty },
  phase4: { draft, review },
}
