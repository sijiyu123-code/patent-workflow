# 专利撰写 Workflow 系统

## 概述

基于已有专利分析和当前工作内容，半自动化地完成新专利的：**方向构思 → 技术深挖 → 初稿撰写 → 迭代打磨**。

## 工作目录结构

```
zhuanliproject/
├── mine/                          # 已有专利原文 (.docx/.doc)
├── extracted_texts/               # Phase 0 产出: 提取的专利文本
├── patent_summaries/              # Phase 0 产出: 结构化摘要库
│   ├── *_summary.md              # 每份专利的结构化摘要
│   ├── patent_landscape.md       # 专利全景地图（方向分类+空白分析+建议）
│   ├── format_template.md        # 格式撰写模板
│   └── _patent_groups.json       # 专利分组信息
├── workflows/                     # Phase 1-3 的 workflow 脚本
│   ├── phase1_direction_brainstorm.js
│   ├── phase2_tech_deepdive.js
│   └── phase3_patent_draft.js
├── outputs/                       # 各 Phase 的输出
│   ├── phase1_candidate_directions.md   # Phase 1 产出
│   ├── phase1_selected_direction.md    # 用户选定方向 (需手动创建)
│   ├── phase2_tech_plan_draft.md       # Phase 2 产出
│   ├── phase2_novelty_assessment.md    # Phase 2 产出
│   ├── phase3_patent_draft.md          # Phase 3 产出
│   └── phase3_quality_review.md        # Phase 3 产出
└── work_content.md                # 当前工作内容（可选输入）
```

## 使用流程

### Phase 0: 离线准备（已完成）

已有专利深度分析 → 结构化摘要库 + 格式模板 + 专利全景地图。

**产出文件**：
- `patent_summaries/` 下 21 份结构化摘要
- `patent_summaries/patent_landscape.md` — 专利全景地图
- `patent_summaries/format_template.md` — 格式撰写模板

当新增专利时，可重新运行 Phase 0 增量更新。

---

### Phase 1: 专利方向构思（自动 → 你审核）

**运行方式**：
```
Workflow({scriptPath: "workflows/phase1_direction_brainstorm.js"})
```

**流程**：
1. 4 个 Agent 从不同视角并行分析：空白发现者、组合创新者、延伸拓展者、工作映射者
2. Synthesis Agent 汇总去重 → 输出 3-5 个候选方向
3. **你来审核**：阅读 `outputs/phase1_candidate_directions.md`

**你的操作**：
- 选择一个方向，创建 `outputs/phase1_selected_direction.md`
- 或与 Agent 讨论某个方向的可行性，调整方向后再创建
- 方向文件只需包含：方向名称 + 你的选择理由 + 任何特殊要求

---

### Phase 2: 技术方案深挖（自动 → 你审核）

**运行方式**：
```
Workflow({scriptPath: "workflows/phase2_tech_deepdive.js"})
```

**前置条件**：`outputs/phase1_selected_direction.md` 必须存在。

**流程**：
1. 技术调研 Agent：设计完整技术方案（架构、算法、实施路径）
2. 新颖性论证 Agent：独立验证与已有专利的差异、评估风险
3. **你来审核**：阅读 `outputs/phase2_tech_plan_draft.md` 和 `phase2_novelty_assessment.md`

**你的操作**：
- 审核通过 → 进入 Phase 3
- 需要修改 → 与 Agent 讨论，手动修改方案文件，或重新运行 Phase 2

---

### Phase 3: 专利初稿撰写（自动 → 你审核）

**运行方式**：
```
Workflow({scriptPath: "workflows/phase3_patent_draft.js"})
```

**前置条件**：Phase 2 的技术方案已确认。

**流程**：
1. 撰写 Agent：按照 format_template.md 严格格式撰写完整专利交底书
2. 自检 Agent：从格式、逻辑、区分度、语言 4 维度审核
3. **你来审核**：阅读 `outputs/phase3_patent_draft.md` 和 `phase3_quality_review.md`

---

### Phase 4: 迭代打磨（你与 Agent 交互讨论）

**这阶段不需要 workflow 脚本**，直接与 Claude 对话即可：

- 针对审核报告中的问题逐条修改
- 讨论某个技术细节的表述方式
- 补充/调整权利要求
- 多次迭代直到满意

对话示例：
- "根据质量审核报告的第3条，修改技术方案阐述部分"
- "权利要求2的范围太窄了，帮我扩大一下"
- "有益效果部分需要更量化，帮我想几个可量化的指标"

---

## 可选：提供当前工作内容

如果希望基于当前工作进行专利撰写，在项目根目录创建 `work_content.md`：

```markdown
# 当前工作内容

## 项目概述
（简要描述你正在做的项目）

## 核心技术点
1. xxx
2. xxx

## 技术创新
（你认为有创新性的技术方案）

## 相关数据/实验结果
（如有）
```

如果 `work_content.md` 为空或不存在，Phase 1 将纯粹基于已有专利的技术空白进行方向构思。

---

## Phase 0 更新

当有新的专利文档时：

1. 将新 .docx 放入 `mine/`
2. 运行文本提取脚本
3. 重新运行 Phase 0 的摘要生成 workflow

---

## 技术栈

- **工作流引擎**：Claude Code Workflow（多 Agent 编排）
- **文档分析**：python-docx + 直接 XML 解析
- **专利领域**：AI/多模态/游戏/直播
