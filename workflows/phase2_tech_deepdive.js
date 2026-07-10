export const meta = {
  name: 'phase2-tech-deepdive',
  description: 'Phase 2: 针对选定方向进行技术方案深挖与新颖性论证',
  phases: [
    { title: '技术调研', detail: '从已有专利和工作内容中提取可复用的技术组件，设计完整技术方案' },
    { title: '新颖性论证', detail: '验证方案与已有专利的本质区别，评估技术效果和风险点' },
  ],
}

const projectRoot = '/workspace/project-nas-1000073/sijiyu/demos/zhuanliproject'
const summaryDir = projectRoot + '/patent_summaries'
const outputDir = projectRoot + '/outputs'

// Read the selected direction from Phase 1 output
const directionFile = outputDir + '/phase1_selected_direction.md'
log(`正在读取选定方向: ${directionFile}`)

// Phase 1: 技术调研
phase('技术调研')

const techResearchPrompt = `你是一个资深技术架构师和专利工程师。

请先读取以下文件了解背景：
1. 选定方向: ${directionFile} （用户在前一阶段选定的专利方向）
2. Phase 1 候选方向报告: ${outputDir}/phase1_candidate_directions.md
3. 专利全景地图: ${summaryDir}/patent_landscape.md
4. 所有相关专利摘要: ${summaryDir}/ 目录下的 _summary.md 文件
5. 格式模板: ${summaryDir}/format_template.md
6. 当前工作内容（如有）: ${projectRoot}/work_content.md

你的任务是设计完整的技术方案：

1. **技术组件提取**：
   - 从已有专利中提取可复用的技术模块/组件
   - 从当前工作内容中提取可融入的创新技术
   - 标注每个组件的来源

2. **技术方案设计**：
   - 系统整体架构（可用文字描述+伪代码）
   - 核心算法/流程（分步骤详述）
   - 关键技术难点及解决思路
   - 数据流/信息流设计

3. **实施路径**：
   - 需要的训练数据及获取方式
   - 模型选型建议
   - 关键实验设计

4. **预期效果**：
   - 量化指标预测
   - 与已有方法的对比优势

请用 Write 工具将结果保存到 ${outputDir}/phase2_tech_plan_draft.md。

格式要求：
- 采用技术交底书的详细程度
- 每个技术决策都说明"为什么"
- 用伪代码或框图描述关键流程
- 标注与已有专利的关联关系`

const techPlan = await agent(techResearchPrompt, {
  label: '技术方案设计',
  phase: '技术调研',
  agentType: 'general-purpose',
})

// Phase 2: 新颖性论证
phase('新颖性论证')

const noveltyPrompt = `你是一个专利审查员和知识产权专家。

请先读取技术方案: ${outputDir}/phase2_tech_plan_draft.md
以及所有已有专利摘要: ${summaryDir}/ 目录下的 _summary.md 文件

你的任务是对技术方案进行严格的新颖性论证：

1. **逐项对比**：
   - 将技术方案的每个核心组件与已有专利逐一对比
   - 明确哪些是已有专利覆盖的，哪些是新的
   - 标注重叠度和差异化程度

2. **新颖性评估**：
   - 整体方案的创新高度（incremental / substantial / breakthrough）
   - 最具新颖性的技术点排名（top 3）
   - 可能存在新颖性争议的技术点及应对策略

3. **侵权风险评估**：
   - 是否可能落入已有专利的权利要求范围
   - 建议的权利要求规避策略

4. **强化建议**：
   - 如何进一步增强方案的新颖性和创造性
   - 可添加哪些差异化技术特征
   - 建议调整的技术方向

请用 Write 工具将结果保存到 ${outputDir}/phase2_novelty_assessment.md。

注意：
- 论证要实事求是，不要为了通过而夸大新颖性
- 对于确实存在重叠的部分，给出诚实的评估
- 如果方案新颖性不足，明确指出并给出改进方向`

const noveltyResult = await agent(noveltyPrompt, {
  label: '新颖性论证',
  phase: '新颖性论证',
  agentType: 'general-purpose',
})

log(`Phase 2 完成！`)
log(`技术方案: ${outputDir}/phase2_tech_plan_draft.md`)
log(`新颖性论证: ${outputDir}/phase2_novelty_assessment.md`)
log(`请审核技术方案和新颖性论证，确认后进入 Phase 3 撰写阶段。`)

return {
  techPlanFile: outputDir + '/phase2_tech_plan_draft.md',
  noveltyFile: outputDir + '/phase2_novelty_assessment.md',
}
