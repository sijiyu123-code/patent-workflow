export const meta = {
  name: 'patent-writer',
  description: '专利撰写：auto模式全自动 / interactive模式每阶段暂停确认',
  phases: [
    { title: '加载配置', detail: '读取config.json' },
    { title: '准备摘要库', detail: '自动提取专利文本+生成摘要(首次或mine/更新后)' },
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

const configResult = await agent(`先尝试Read ${configPath}，如果不存在再尝试 ${projectRoot}/config.example.json。
读取成功后返回JSON（取数组第一个元素）:
{
  "loaded": true/false,
  "mode": "auto"或"interactive",
  "direction_hint": "预设方向(可为空)",
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
      direction_hint: { type: 'string' },
      writer: { type: 'string' },
      phase1: { type: 'object', properties: { gap_finder:{type:'string'}, combinator:{type:'string'}, extender:{type:'string'} }, required: ['gap_finder','combinator','extender'] },
      phase2: { type: 'object', properties: { judge_novelty:{type:'string'}, judge_feasibility:{type:'string'}, judge_value:{type:'string'}, chief_judge:{type:'string'} }, required: ['judge_novelty','judge_feasibility','judge_value','chief_judge'] },
      phase3: { type: 'object', properties: { architect:{type:'string'}, critic:{type:'string'}, synthesizer:{type:'string'}, novelty:{type:'string'} }, required: ['architect','critic','synthesizer','novelty'] },
      phase4: { type: 'object', properties: { draft:{type:'string'}, review:{type:'string'} }, required: ['draft','review'] },
    },
    required: ['loaded','mode','direction_hint','writer','phase1','phase2','phase3','phase4']
  }
})

const cfg = configResult?.loaded ? configResult : {
  loaded: false, mode: 'auto', direction_hint: '', writer: 'sonnet',
  phase1: { gap_finder:'sonnet', combinator:'sonnet', extender:'sonnet' },
  phase2: { judge_novelty:'sonnet', judge_feasibility:'sonnet', judge_value:'sonnet', chief_judge:'sonnet' },
  phase3: { architect:'sonnet', critic:'sonnet', synthesizer:'sonnet', novelty:'sonnet' },
  phase4: { draft:'sonnet', review:'sonnet' },
}

const mode = cfg.mode || 'auto'
const hint = (cfg.direction_hint || '').trim()
const hintTag = hint ? `\n\n【限定方向】本次专利撰写聚焦于: ${hint}。所有分析和建议都应围绕这个方向展开。` : ''

log(`模式: ${mode === 'auto' ? '🤖 全自动' : '👆 半自动交互'}${hint ? ' | 方向: ' + hint : ''}`)
log(`模型: ${cfg.phase1.gap_finder}/${cfg.phase2.chief_judge}/${cfg.phase3.synthesizer}/${cfg.phase4.draft}`)

// ==================== Phase 0: 自动准备摘要库 ====================
phase('准备摘要库')

const hasSummaries = await agent(`检查 ${summaryDir}/ 目录下是否存在 _summary.md 文件（至少3个）。
用 Bash: ls ${summaryDir}/*_summary.md 2>/dev/null | wc -l
返回JSON: {"count": 数字}`, {
  label: '检查摘要库',
  phase: '准备摘要库',
  schema: { type:'object', properties:{count:{type:'number'}}, required:['count'] }
})

if ((hasSummaries?.count || 0) < 3) {
  log(`摘要库不足(当前${hasSummaries?.count||0}份)，自动生成中...`)

  // Step 1: 提取 mine/ 下的 .docx/.doc 文本
  const extractResult = await agent(`执行以下Python脚本提取专利文本:
python3 << 'PYEOF'
import docx, os, json
mine_dir = "${projectRoot}/mine"
out_dir = "${projectRoot}/extracted_texts"
os.makedirs(out_dir, exist_ok=True)
results = []
for fname in sorted(os.listdir(mine_dir)):
    if fname.startswith('~$'): continue
    fpath = os.path.join(mine_dir, fname)
    if not (fname.endswith('.docx') or fname.endswith('.doc')): continue
    try:
        doc = docx.Document(fpath)
        text = "\\n".join([p.text.strip() for p in doc.paragraphs if p.text.strip()])
        txt_name = fname.rsplit('.',1)[0] + '.txt'
        with open(os.path.join(out_dir, txt_name), 'w') as f: f.write(text)
        results.append({"file":fname, "len":len(text), "status":"ok"})
    except Exception as e:
        results.append({"file":fname, "len":0, "status":str(e)[:60]})
print(json.dumps({"total":len(results),"files":results}))
PYEOF
用 Bash 工具执行。`, {
    label: '提取专利文本',
    phase: '准备摘要库',
    agentType: 'general-purpose',
  })
  log(`文本提取: ${typeof extractResult === 'string' ? extractResult.slice(0,100) : 'done'}`)

  // Step 2: 批量生成结构化摘要
  const txtDir = projectRoot + '/extracted_texts'
  const txtFiles = await agent(`列出 ${txtDir}/ 下的 .txt 文件并返回文件名数组。
用 Bash: ls ${txtDir}/*.txt 2>/dev/null
返回JSON: {"files": ["文件名1","文件名2",...]}`, {
    label: '列出文本文件',
    phase: '准备摘要库',
    schema: { type:'object', properties:{files:{type:'array',items:{type:'string'}}}, required:['files'] }
  })

  const files = txtFiles?.files || []
  if (files.length > 0) {
    // 分批并行生成摘要
    const batchSize = 5
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      await parallel(batch.map(f => () => {
        const name = f.replace('.txt','').replace(/^.*\//,'')
        return agent(`读取 ${txtDir}/${f}，这是一份专利文档。
生成结构化摘要，用 Write 保存到 ${summaryDir}/${name}_summary.md:
## 专利基本信息（名称/领域/要解决的问题）
## 技术方案概要（200字）
## 核心技术组件（3-5个）
## 创新点（2-4个）
## 权利要求方向
## 技术关键词（5-10个）`, {
          label: `摘要:${name.slice(0,25)}`,
          phase: '准备摘要库',
          model: 'deepseek/deepseek-v4-pro',
        })
      }))
    }
    log(`摘要生成: ${files.length} 份完成`)
  }

  // Step 3: 生成格式模板 + 专利全景地图
  const template = agent(`读取 ${txtDir}/ 下3-4份代表性专利文本，提取通用格式模板。
输出: 章节结构、用语规范、权利要求模板、检查清单。
用 Write 保存到 ${summaryDir}/format_template.md`, {
    label: '格式模板',
    phase: '准备摘要库',
    model: 'deepseek/deepseek-v4-pro',
  })

  const landscape = agent(`读取 ${summaryDir}/ 下所有 _summary.md，生成专利全景地图。
包含: 总览、技术方向分类、交叉图谱、新方向建议。
用 Write 保存到 ${summaryDir}/patent_landscape.md`, {
    label: '专利地图',
    phase: '准备摘要库',
    model: 'deepseek/deepseek-v4-pro',
  })

  log(`摘要库准备完成！`)
} else {
  log(`摘要库已就绪 (${hasSummaries.count} 份)`)
}

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

  const gapFinder = agent(`"技术空白发现者"。${dirCtx}${hintTag}
提出4-5个新方向。用 Write 保存到 ${outputDir}/auto_gap_finder.md`, {
    label: '空白发现', phase: '方向分析', model: cfg.phase1.gap_finder,
  })
  const combinator = agent(`"组合创新者"。${dirCtx}${hintTag}
拆解专利组件拼出新方向。用 Write 保存到 ${outputDir}/auto_combinator.md`, {
    label: '组合创新', phase: '方向分析', model: cfg.phase1.combinator,
  })
  const extender = agent(`"延伸拓展者"。${dirCtx}${hintTag}
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

  const judgeNovelty = agent(`"新颖性评委"(权重50%)。${jCtx}${hintTag} 用 Write 保存到 ${outputDir}/auto_judge_novelty.md`, {
    label: '新颖性评委', phase: '评委决策', model: cfg.phase2.judge_novelty,
  })
  const judgeFeasibility = agent(`"可行性评委"(权重50%)。${jCtx}${hintTag} 用 Write 保存到 ${outputDir}/auto_judge_feasibility.md`, {
    label: '可行性评委', phase: '评委决策', model: cfg.phase2.judge_feasibility,
  })
  const judgeValue = agent(`"价值评委"(权重50%)。${jCtx}${hintTag} 用 Write 保存到 ${outputDir}/auto_judge_value.md`, {
    label: '价值评委', phase: '评委决策', model: cfg.phase2.judge_value,
  })

  const chiefAnalysis = await agent(`"首席评委"。读取三位评委评分，加权汇总选最优方向。${hintTag}直接输出裁决报告，不要用Write。`, {
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
  const aAnalysis = await agent(`"架构师"。读取 auto_decision.md + 专利摘要。提出完整技术方案，标注薄弱点。${hintTag}直接输出，不要用Write。`, {
    label: '架构师分析', phase: '技术辩论', model: cfg.phase3.architect,
  })
  await relayWrite(aAnalysis, `${outputDir}/auto_architect_plan.md`, '架构方案')

  const critic = await agent(`"批判者"。读取 auto_architect_plan.md + 专利摘要。逐模块质疑，指出缺失和过度设计。${hintTag}用 Write 保存到 ${outputDir}/auto_critic_challenge.md`, {
    label: '批判者挑战', phase: '技术辩论', model: cfg.phase3.critic,
  })

  const sAnalysis = await agent(`"合成者"。读取架构方案+批判意见。逐条回应，综合定稿。${hintTag}直接输出，不要用Write。`, {
    label: '合成者分析', phase: '技术辩论', model: cfg.phase3.synthesizer,
  })
  await relayWrite(sAnalysis, `${outputDir}/auto_tech_plan.md`, '技术方案')

  const novelty = await agent(`"审查员"。读取 auto_tech_plan.md + 专利摘要。逐组件对比、创新评估、风险预警。${hintTag}用 Write 保存到 ${outputDir}/auto_novelty.md`, {
    label: '新颖性审查', phase: '技术辩论', model: cfg.phase3.novelty,
  })

  await exitPhase(3, '技术辩论')
  if (mode === 'interactive') { return { phase: 3, status: 'done' } }
}

// ==================== Phase 4: 撰写+审核 ====================
const p4 = await enterPhase(4, '撰写审核')
if (p4 === 'stop') { return { phase: 4, status: 'awaiting_approval' } }

if (p4 !== 'skip') {
  const dAnalysis = await agent(`"撰写工程师"。读取 format_template.md + auto_tech_plan.md + auto_novelty.md + auto_decision.md。撰写完整专利交底书（6章节，严格遵循format_template格式）。${hintTag}直接输出，不要用Write。`, {
    label: '撰写分析', phase: '撰写审核', model: cfg.phase4.draft,
  })
  await relayWrite(dAnalysis, `${outputDir}/auto_patent_draft.md`, '专利初稿')

  const review = await agent(`"审核员"。读取 auto_patent_draft.md + format_template.md。4维打分(格式/逻辑/区分度/语言各10分)+问题清单+修复建议。${hintTag}用 Write 保存到 ${outputDir}/auto_quality_review.md`, {
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
