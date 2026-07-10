export const meta = {
  name: 'phase1-direction-brainstorm',
  description: 'Phase 1: 多Agent从不同视角分析已有专利+当前工作，brainstorm新专利方向',
  phases: [
    { title: '多视角分析', detail: '空白发现者、组合创新者、延伸拓展者、工作映射者并行分析' },
    { title: '方向合成', detail: '汇总各方建议，去重排序，生成3-5个候选专利方向' },
  ],
}

const projectRoot = '/workspace/project-nas-1000073/sijiyu/demos/zhuanliproject'
const summaryDir = projectRoot + '/patent_summaries'
const outputDir = projectRoot + '/outputs'

// Phase 1: 多视角并行分析
phase('多视角分析')

// 读取工作内容（如果存在）
const workContentFile = projectRoot + '/work_content.md'
let hasWorkContent = false
// We'll pass this info to agents via the prompt

const commonContext = `
工作目录: ${projectRoot}

你需要读取以下资料来完成任务：
1. 专利全景地图: ${summaryDir}/patent_landscape.md （了解整体专利布局和技术空白）
2. 所有专利摘要: ${summaryDir}/ 目录下的所有 _summary.md 文件（深入理解每个专利的技术方案）
3. 格式模板: ${summaryDir}/format_template.md （了解专利撰写规范）
4. 当前工作内容: ${workContentFile} （如果该文件存在且非空，则结合当前工作进行思考；如果文件为空或不存在，则纯粹基于已有专利的技术空白和扩展方向来构思）

请先用 Read 工具读取上述文件，充分理解已有专利的布局和当前工作（如有），然后从你的特定视角进行分析。
`

// Agent A: 空白发现者
const agentA = agent(`你是一个"技术空白发现者"专利分析师。${commonContext}

你的任务是从"填补技术空白"的视角出发：
1. 仔细阅读 patent_landscape.md 中每个技术方向下标注的"技术空白/可扩展方向"
2. 结合专利摘要，确认这些空白是否确实未被覆盖
3. 从以下角度发现更多空白：
   - 当前专利方案的应用场景局限（如只覆盖了MOBA，未覆盖FPS/战术竞技）
   - 技术演进的自然下一站（如从"分析"到"决策"，从"2D定位"到"3D重建"）
   - 新兴技术的可融合机会（如Agent框架、RAG、实时音视频处理等）
   - 商业场景的延伸（如从直播扩展到短视频、从游戏扩展到泛娱乐）
4. 如果有工作内容输入，分析工作中哪些技术点尚未被任何专利覆盖

输出格式（严格JSON）：
{
  "perspective": "空白发现者",
  "findings": [
    {
      "direction_name": "新方向名称",
      "problem": "要解决的技术问题",
      "gap_analysis": "为什么现有专利没覆盖这个方向",
      "innovation_angle": "核心创新角度",
      "feasibility": "high/medium/low",
      "related_patents": ["参考的已有专利名称"],
      "work_based": true/false  // 是否基于当前工作内容
    }
  ]
}

提出4-6个方向建议。`,
{
  label: '空白发现者',
  phase: '多视角分析',
  schema: {
    type: 'object',
    properties: {
      perspective: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            direction_name: { type: 'string' },
            problem: { type: 'string' },
            gap_analysis: { type: 'string' },
            innovation_angle: { type: 'string' },
            feasibility: { type: 'string' },
            related_patents: { type: 'array', items: { type: 'string' } },
            work_based: { type: 'boolean' },
          },
          required: ['direction_name', 'problem', 'gap_analysis', 'innovation_angle', 'feasibility', 'related_patents', 'work_based']
        }
      }
    },
    required: ['perspective', 'findings']
  }
})

// Agent B: 组合创新者
const agentB = agent(`你是一个"组合创新者"专利分析师。${commonContext}

你的任务是从"跨方向技术融合"的视角出发：
1. 阅读 patent_landscape.md 中的"三、交叉技术图谱"，理解8个核心技术主题和5种技术组合模式
2. 寻找尚未被组合的技术主题对，例如：
   - "时序建模 + LoRA微调" → 时序自适应的动态LoRA切换？
   - "弱监督学习 + 注意力机制" → 弱监督驱动的注意力掩码学习？
   - "偏好对齐 + 闭环自进化" → 基于用户隐式反馈的持续偏好学习？
3. 将不同专利的核心技术组件拆解后重新拼接，形成新的技术方案
4. 注意跨领域的组合：如将"直播方向"的技术与"游戏AI方向"组合

输出格式（严格JSON）：
{
  "perspective": "组合创新者",
  "findings": [
    {
      "direction_name": "新方向名称",
      "problem": "要解决的技术问题",
      "combination": "将哪些已有技术进行了怎样的组合创新",
      "innovation_angle": "核心创新角度",
      "feasibility": "high/medium/low",
      "source_patents": ["组合来源的专利名称"],
      "work_based": false
    }
  ]
}

提出4-6个方向建议。`,
{
  label: '组合创新者',
  phase: '多视角分析',
  schema: {
    type: 'object',
    properties: {
      perspective: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            direction_name: { type: 'string' },
            problem: { type: 'string' },
            combination: { type: 'string' },
            innovation_angle: { type: 'string' },
            feasibility: { type: 'string' },
            source_patents: { type: 'array', items: { type: 'string' } },
            work_based: { type: 'boolean' },
          },
          required: ['direction_name', 'problem', 'combination', 'innovation_angle', 'feasibility', 'source_patents', 'work_based']
        }
      }
    },
    required: ['perspective', 'findings']
  }
})

// Agent C: 延伸拓展者
const agentC = agent(`你是一个"延伸拓展者"专利分析师。${commonContext}

你的任务是从"在已有专利基础上做深度延伸"的视角出发：
1. 阅读每份专利摘要，思考每件专利的"下一步"可以是什么：
   - 方法论深化：从特殊场景推广到通用场景
   - 性能提升：从能做到做得好、做得快
   - 系统化：从单一模块到完整系统
   - 跨场景迁移：从游戏到其他领域的应用
2. 重点看 patent_landscape.md 中每个方向下列出的"技术空白/可扩展方向"
3. 如果有工作内容，看工作中的哪些技术创新可以"嫁接"到已有专利框架上形成新专利

输出格式（严格JSON）：
{
  "perspective": "延伸拓展者",
  "findings": [
    {
      "direction_name": "新方向名称",
      "problem": "要解决的技术问题",
      "base_patent": "基于哪个已有专利进行延伸",
      "extension_path": "延伸路径（方法论深化/性能提升/系统化/跨场景迁移）",
      "innovation_angle": "与原始专利的本质区别和创新点",
      "feasibility": "high/medium/low",
      "work_based": true/false
    }
  ]
}

提出4-6个方向建议。`,
{
  label: '延伸拓展者',
  phase: '多视角分析',
  schema: {
    type: 'object',
    properties: {
      perspective: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            direction_name: { type: 'string' },
            problem: { type: 'string' },
            base_patent: { type: 'string' },
            extension_path: { type: 'string' },
            innovation_angle: { type: 'string' },
            feasibility: { type: 'string' },
            work_based: { type: 'boolean' },
          },
          required: ['direction_name', 'problem', 'base_patent', 'extension_path', 'innovation_angle', 'feasibility', 'work_based']
        }
      }
    },
    required: ['perspective', 'findings']
  }
})

// Agent D: 当前工作映射者（条件执行）
const agentD = agent(`你是一个"工作内容映射者"。${commonContext}

你的任务是：先检查 ${workContentFile} 文件是否存在且有实质内容。
- 如果文件不存在或为空：直接返回空数组，不分析。
- 如果文件存在且有内容：从当前工作内容中提炼可专利化的技术创新。

分析步骤：
1. 仔细阅读工作内容，识别其中涉及的技术创新点
2. 对照 patent_landscape.md 中的已有专利方向和各方向的"技术空白"
3. 将工作内容中的创新点映射到最接近的专利方向或技术空白
4. 判断新方向与已有专利的差异化程度

输出格式（严格JSON）：
{
  "perspective": "工作内容映射者",
  "has_work_content": true/false,
  "findings": [
    {
      "direction_name": "新方向名称",
      "problem": "要解决的技术问题",
      "work_innovation_source": "工作内容中的哪个具体创新点",
      "mapped_patent_area": "映射到的已有专利方向",
      "differentiation": "与已有专利的差异化定位",
      "feasibility": "high/medium/low",
      "work_based": true
    }
  ]
}

如果 has_work_content 为 false，findings 为空数组。如果为 true，提出2-3个方向。`,
{
  label: '工作内容映射者',
  phase: '多视角分析',
  schema: {
    type: 'object',
    properties: {
      perspective: { type: 'string' },
      has_work_content: { type: 'boolean' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            direction_name: { type: 'string' },
            problem: { type: 'string' },
            work_innovation_source: { type: 'string' },
            mapped_patent_area: { type: 'string' },
            differentiation: { type: 'string' },
            feasibility: { type: 'string' },
            work_based: { type: 'boolean' },
          },
          required: ['direction_name', 'problem', 'work_innovation_source', 'mapped_patent_area', 'differentiation', 'feasibility', 'work_based']
        }
      }
    },
    required: ['perspective', 'has_work_content', 'findings']
  }
})

// Phase 2: 方向合成
phase('方向合成')

const allFindings = [agentA, agentB, agentC, agentD].filter(Boolean)

const synthesisPrompt = `你是一个专利方向决策委员会。

以下是4位专家从不同视角提出的新专利方向建议：

## 空白发现者
${JSON.stringify(agentA?.findings || [], null, 2)}

## 组合创新者
${JSON.stringify(agentB?.findings || [], null, 2)}

## 延伸拓展者
${JSON.stringify(agentC?.findings || [], null, 2)}

## 工作内容映射者
${JSON.stringify(agentD?.findings || [], null, 2)}

请执行以下任务：
1. 去重：合并相同或高度相似的方向建议
2. 排序：按以下维度综合评分（每个维度1-5分）：
   - 新颖性：与已有专利的差异化程度
   - 可行性：技术基础的成熟度
   - 保护价值：商业价值和竞争壁垒
   - 可扩展性：未来可衍生子专利的潜力
3. 精选出3-5个最佳候选方向

对每个候选方向，输出：
- 方向名称
- 综合评分（4个维度分别打分 + 总分）
- 要解决的技术问题（清晰定义）
- 核心技术思路（300字概述）
- 与已有专利的关系（哪些是基础，哪些是差异化）
- 推荐理由

请用 Write 工具将最终结果保存到 ${outputDir}/phase1_candidate_directions.md。

格式要求：
- 使用清晰的中文markdown格式
- 每个候选方向一个完整章节
- 最后附一个"方向对比表"（表格形式，方便横向比较）
- 在文档顶部注明：
  - 生成时间
  - 是否基于工作内容
  - 参与分析的agent数量和视角
  - 原始建议总数 → 去重后 → 精选后数量

注意：结果将直接呈现给用户进行审核和选择，请确保内容清晰、有说服力。`

const synthesisResult = await agent(synthesisPrompt, {
  label: '方向合成与排序',
  phase: '方向合成',
})

log(`Phase 1 完成！候选方向已生成，请查看 ${outputDir}/phase1_candidate_directions.md`)
log(`参与分析的Agent: 4个视角 (空白发现/组合创新/延伸拓展/工作映射)`)
log(`找到的方向建议数量: ${[...(agentA?.findings||[]), ...(agentB?.findings||[]), ...(agentC?.findings||[]), ...(agentD?.findings||[])].length}`)

return {
  totalRawFindings: [...(agentA?.findings||[]), ...(agentB?.findings||[]), ...(agentC?.findings||[]), ...(agentD?.findings||[])].length,
  perspectives: [agentA?.perspective, agentB?.perspective, agentC?.perspective, agentD?.perspective].filter(Boolean),
  outputFile: outputDir + '/phase1_candidate_directions.md',
}
