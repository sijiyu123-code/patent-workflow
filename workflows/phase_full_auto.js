export const meta = {
  name: 'full-auto-patent',
  description: '全自动专利撰写：方向脑暴 → 技术深挖 → 初稿撰写，一步到底无需交互',
  phases: [
    { title: '方向分析', detail: '多Agent并行分析已有专利+工作内容' },
    { title: '方向决策', detail: '自动评分选最优方向' },
    { title: '技术深挖', detail: '技术方案设计+新颖性论证' },
    { title: '专利撰写', detail: '按模板撰写完整初稿+质量自检' },
  ],
}

const projectRoot = '/workspace/project-nas-1000073/sijiyu/demos/zhuanliproject'
const summaryDir = projectRoot + '/patent_summaries'
const outputDir = projectRoot + '/outputs'

// ==================== Phase 1: 方向分析 ====================
phase('方向分析')

const commonContext = `工作目录: ${projectRoot}
你需要读取以下资料：
1. 专利全景地图: ${summaryDir}/patent_landscape.md
2. 所有专利摘要: ${summaryDir}/ 目录下的所有 _summary.md 文件
3. 当前工作内容（如有）: ${projectRoot}/work_content.md
请先用 Read 工具读取上述文件，充分理解已有专利布局和当前工作，然后从你的特定视角进行分析。`

// 3个分析Agent并行
const gapFinder = agent(`你是"技术空白发现者"。${commonContext}
从技术空白和场景扩展视角，提出4-5个新专利方向。忽略 work_content 为空的情况。
对每个方向给出：方向名称、要解决的问题、gap分析、创新角度、可行性(high/medium/low)。
用 Write 保存到 ${outputDir}/auto_gap_finder.md`, {
  label: '空白发现',
  phase: '方向分析',
  agentType: 'general-purpose',
})

const combinator = agent(`你是"组合创新者"。${commonContext}
从跨方向技术融合视角，将不同专利的技术组件拆解重组，提出4-5个新方向。
对每个方向给出：方向名称、要解决的问题、组合了哪些技术、创新角度、可行性。
用 Write 保存到 ${outputDir}/auto_combinator.md`, {
  label: '组合创新',
  phase: '方向分析',
  agentType: 'general-purpose',
})

const extender = agent(`你是"延伸拓展者"。${commonContext}
在已有专利基础上做深度延伸（方法论深化/性能提升/系统化/跨场景迁移），提出4-5个新方向。
对每个方向给出：方向名称、要解决的问题、基于哪个专利延伸、延伸路径、创新点、可行性。
用 Write 保存到 ${outputDir}/auto_extender.md`, {
  label: '延伸拓展',
  phase: '方向分析',
  agentType: 'general-purpose',
})

log(`方向分析完成: 3个Agent各提出方向建议`)

// ==================== Phase 2: 自动决策 ====================
phase('方向决策')

const decisionPrompt = `你是专利方向决策委员会。三位专家已提出方向建议，请读取他们的报告：
- ${outputDir}/auto_gap_finder.md
- ${outputDir}/auto_combinator.md
- ${outputDir}/auto_extender.md

并参考 ${summaryDir}/patent_landscape.md

任务：
1. 汇总所有方向建议，去重合并
2. 按以下维度自动评分（每个1-5分）：
   - 新颖性：与已有专利的差异化
   - 可行性：技术基础成熟度
   - 价值度：商业价值和保护范围
   - 匹配度：与当前工作内容的相关性（如果有 work_content）
3. 选出综合得分最高的1个方向作为最终选题
4. 输出决策报告，包含：
   - 所有候选方向的评分对比表
   - 最终选定的方向及理由
   - 该方向的核心技术思路（500字概述）

用 Write 保存到 ${outputDir}/auto_decision.md

注意：只选1个方向，直接给出最终决策，不要让用户选择。`

const decision = await agent(decisionPrompt, {
  label: '自动决策',
  phase: '方向决策',
  agentType: 'general-purpose',
})

log(`方向决策完成，已自动选定最优方向`)

// ==================== Phase 3: 技术深挖 ====================
phase('技术深挖')

const techResearchPrompt = `你是资深技术架构师。请读取：
1. 选定方向: ${outputDir}/auto_decision.md
2. 专利全景地图: ${summaryDir}/patent_landscape.md
3. 所有相关专利摘要: ${summaryDir}/ 下的 _summary.md
4. 格式模板: ${summaryDir}/format_template.md
5. 当前工作内容: ${projectRoot}/work_content.md

设计完整技术方案：
1. 系统整体架构
2. 核心技术模块（每个模块：困难→手段→设计原因）
3. 数据流/算法流程（伪代码）
4. 实施路径和预期效果
5. 与已有专利的关联和区分

用 Write 保存到 ${outputDir}/auto_tech_plan.md`

const noveltyPrompt = `你是专利审查员。请读取：
- 技术方案: ${outputDir}/auto_tech_plan.md
- 所有已有专利摘要: ${summaryDir}/ 下的 _summary.md

进行新颖性论证：
1. 逐项对比每个技术组件与已有专利
2. 评估整体创新高度
3. 标注最具新颖性的技术点（top 3）
4. 风险评估和规避策略
5. 强化建议

用 Write 保存到 ${outputDir}/auto_novelty.md`

const techPlan = await agent(techResearchPrompt, {
  label: '技术方案设计',
  phase: '技术深挖',
  agentType: 'general-purpose',
})

const noveltyResult = await agent(noveltyPrompt, {
  label: '新颖性论证',
  phase: '技术深挖',
  agentType: 'general-purpose',
})

log(`技术深挖完成`)

// ==================== Phase 4: 专利撰写 ====================
phase('专利撰写')

const draftPrompt = `你是资深专利撰写工程师。请读取：
1. 格式模板（严格遵循）: ${summaryDir}/format_template.md
2. 技术方案: ${outputDir}/auto_tech_plan.md
3. 新颖性论证: ${outputDir}/auto_novelty.md
4. 选定方向: ${outputDir}/auto_decision.md
5. 相关已有专利摘要: ${summaryDir}/ 下的 _summary.md

撰写一份完整的技术发明专利交底书，必须严格遵循 format_template.md 的章节结构和用语规范：

## 必须包含的章节：
1. 缩略语和关键术语定义
2. 本发明所要解决的技术问题（发明目的）
3. 相关技术背景与最相近似的现有实现方案（引用已有专利）
4. 本发明技术方案的详细阐述（核心章节，分模块详述）
5. 本发明技术方案带来的有益效果
6. 本发明的技术关键点或欲保护点（至少5个权利要求方向）

写作要求：
- 使用"本发明旨在..."、"其特征在于..."等专利用语
- 技术描述要足够详细，使本领域技术人员能够实现
- 突出与已有专利的差异化
- 正文 3000-5000 字

用 Write 保存到 ${outputDir}/auto_patent_draft.md`

const reviewPrompt = `你是专利质量审核员。请读取：
- 专利初稿: ${outputDir}/auto_patent_draft.md
- 格式模板: ${summaryDir}/format_template.md

从以下4个维度审核（每项10分）：
- A. 格式一致性（章节完整/编号规范/术语统一/引用正确）
- B. 逻辑完整性（问题→方案→效果逻辑链闭合）
- C. 区分度（与已有专利的差异清晰）
- D. 语言质量（专利用语规范/无歧义/描述精确）

给出评分和改进建议，标注"必须修改"和"建议修改"。

用 Write 保存到 ${outputDir}/auto_quality_review.md`

const draft = await agent(draftPrompt, {
  label: '撰写初稿',
  phase: '专利撰写',
  agentType: 'general-purpose',
})

const review = await agent(reviewPrompt, {
  label: '质量审核',
  phase: '专利撰写',
  agentType: 'general-purpose',
})

log(`========================================`)
log(`全自动专利撰写完成！`)
log(`========================================`)
log(`方向决策: ${outputDir}/auto_decision.md`)
log(`技术方案: ${outputDir}/auto_tech_plan.md`)
log(`新颖性论证: ${outputDir}/auto_novelty.md`)
log(`专利初稿: ${outputDir}/auto_patent_draft.md`)
log(`质量审核: ${outputDir}/auto_quality_review.md`)
log(``)
log(`查看初稿后如需修改，直接与Claude讨论即可。`)

return {
  outputFiles: [
    outputDir + '/auto_decision.md',
    outputDir + '/auto_tech_plan.md',
    outputDir + '/auto_novelty.md',
    outputDir + '/auto_patent_draft.md',
    outputDir + '/auto_quality_review.md',
  ]
}
