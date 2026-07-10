export const meta = {
  name: 'phase3-patent-draft',
  description: 'Phase 3: 根据确定的技术方案，按照已有专利格式模板撰写完整专利初稿',
  phases: [
    { title: '专利撰写', detail: '按照格式模板撰写完整专利初稿（技术交底书）' },
    { title: '自检审核', detail: '独立Agent检查格式一致性、逻辑完整性、与已有专利的区分度' },
  ],
}

const projectRoot = '/workspace/project-nas-1000073/sijiyu/demos/zhuanliproject'
const summaryDir = projectRoot + '/patent_summaries'
const outputDir = projectRoot + '/outputs'

// Phase 1: 专利撰写
phase('专利撰写')

const draftPrompt = `你是一个资深专利撰写工程师，擅长撰写高质量的技术发明专利交底书。

请先读取以下资料：
1. 格式模板（必须严格遵循）: ${summaryDir}/format_template.md
2. 技术方案: ${outputDir}/phase2_tech_plan_draft.md
3. 新颖性论证: ${outputDir}/phase2_novelty_assessment.md
4. 选定方向: ${outputDir}/phase1_selected_direction.md
5. 相关已有专利摘要（用于编写"背景技术"章节）: ${summaryDir}/ 目录下相关的 _summary.md 文件

你的任务是撰写一份完整的技术发明专利交底书（初稿），必须严格按照 format_template.md 的章节结构和用语规范。

## 交底书必须包含以下章节：

### 1. 缩略语和关键术语定义
（定义本专利中使用的所有专业术语和缩写）

### 2. 本发明所要解决的技术问题（发明目的）
（清晰阐述：现有技术存在什么问题 → 本发明的目的）

### 3. 相关技术背景，与本发明最相近似的现有实现方案
- 引用已有专利中的相关方案（用专利名称）
- 分析每个现有方案的缺陷
- 总结：为什么现有方案无法解决本发明的技术问题

### 4. 本发明技术方案的详细阐述
这是最核心的章节，必须：
- 分模块/阶段详细描述技术方案
- 每个模块说明：遇到了什么困难 → 通过什么技术手段解决 → 为什么这样设计
- 包含具体的实现细节（模型结构、算法流程、数据处理方式等）
- 用伪代码或结构化描述说明关键步骤
- 提供至少一个完整的实施例

### 5. 本发明技术方案带来的有益效果
（与现有方案对比，量化或定性描述技术效果优势）

### 6. 本发明的技术关键点或欲保护点是什么
（列出独立权利要求和从属权利要求的保护点，至少5个）

### 7. 附图说明（可选，如有需要）

## 写作要求：
- 严格按照 format_template.md 中的用语风格规范
- 使用"本发明旨在..."、"其特征在于..."等专利特有表达
- 技术描述要足够详细，使本领域技术人员能够实现
- 突出与已有专利的差异化
- 每个技术决策都要说明"为什么"
- 篇幅：正文 3000-5000 字

请用 Write 工具将初稿保存到 ${outputDir}/phase3_patent_draft.md。

文件头部注明：专利名称、发明人、日期、版本（初稿v1）。`

const draft = await agent(draftPrompt, {
  label: '撰写专利初稿',
  phase: '专利撰写',
  agentType: 'general-purpose',
})

// Phase 2: 自查审核
phase('自检审核')

const reviewPrompt = `你是一个严格的专利质量审核员。请对刚撰写的专利初稿进行审核。

请读取：${outputDir}/phase3_patent_draft.md
同时参考：${summaryDir}/format_template.md 的检查清单

请从以下维度逐项审核：

### A. 格式一致性（满分10分）
- 章节结构是否完整
- 编号方式是否规范
- 术语使用是否一致
- 引用格式是否正确

### B. 逻辑完整性（满分10分）
- 技术问题 → 现有方案缺陷 → 本发明方案 → 有益效果 的逻辑链是否闭合
- 每个 claimed 的创新点是否在技术方案中有充分展开
- 技术方案是否可实施（本领域技术人员能否根据描述复现）

### C. 与已有专利的区分度（满分10分）
- 背景技术章节是否如实引用了最接近的已有方案
- 本发明的技术方案与已有方案的差异是否清晰
- 权利要求保护点是否与已有专利有实质区别

### D. 语言质量（满分10分）
- 是否符合专利用语规范
- 是否有模糊、歧义的表述
- 技术描述是否精确

对每个维度给出评分和改进建议。如果发现严重问题，标注为"必须修改"。如果发现可优化点，标注为"建议修改"。

请用 Write 工具将审核报告保存到 ${outputDir}/phase3_quality_review.md。

格式：表格形式列出问题，每行包含：章节 | 问题描述 | 严重程度 | 修改建议`

const review = await agent(reviewPrompt, {
  label: '专利质量审核',
  phase: '自检审核',
  agentType: 'general-purpose',
})

log(`Phase 3 完成！`)
log(`专利初稿: ${outputDir}/phase3_patent_draft.md`)
log(`质量审核报告: ${outputDir}/phase3_quality_review.md`)
log(`请审核初稿和质量报告。Phase 4 将根据你的修改意见进行迭代打磨。`)
log(`你可以直接与 Agent 讨论修改意见，或提供具体的修改指令。`)

return {
  draftFile: outputDir + '/phase3_patent_draft.md',
  reviewFile: outputDir + '/phase3_quality_review.md',
}
