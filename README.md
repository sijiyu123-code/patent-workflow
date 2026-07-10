# 专利撰写 Workflow 系统

## 概述

基于已有专利分析和当前工作内容，全自动/半自动地完成新专利的：**方向构思 → 技术深挖 → 初稿撰写 → 迭代打磨**。

---

## 使用方法

### 1. 准备已有专利

把你的专利 .docx/.doc 文件放入 `mine/` 目录，然后运行 Phase 0 生成摘要库：

```
mine/                        ← 放入已有专利文件
  ├── 专利1.docx
  ├── 专利2.docx
  └── ...

patent_summaries/            ← Phase 0 自动生成
  ├── *_summary.md           ← 每份专利的结构化摘要
  ├── patent_landscape.md    ← 专利全景地图
  └── format_template.md     ← 撰写格式模板
```

### 2. 准备工作内容（可选）

```bash
cp work_content.example.md work_content.md
# 编辑 work_content.md，填入你的近期工作/绩效
```

不填也行，workflow 会纯基于已有专利的技术空白来构思方向。

### 3. 设定方向（可选）

在 `config.json` 中设置 `direction_hint`，限定本次撰写的专利方向：

```json
{
  "direction_hint": "游戏AI多模态推理",
  // 或 "直播内容理解"、"LoRA微调"、"端侧部署" 等
  // 留空 "" 则不限定方向
}
```

这个 hint 会注入到所有 Agent 的 prompt 中，确保全流程围绕该方向展开。

### 4. 运行

```js
// 全自动模式（一键到底出初稿）
Workflow({scriptPath: "workflows/phase_full_auto.js"})

// 半自动交互模式（每阶段暂停等你确认）
// 先改 config.json: "mode": "interactive"
// 然后同样运行，每阶段结束后重跑自动继续
Workflow({scriptPath: "workflows/phase_full_auto.js"})
```

**全自动**一次跑完，直接输出专利初稿。**半自动**每阶段暂停，你审完重跑自动跳到下一阶段。

### 5. 切换模型

编辑 `config.json`：

```json
{
  "mode": "auto",
  "models": {
    "writer": "deepseek/deepseek-v4-pro",
    "phase1_direction": {
      "gap_finder": "deepseek/deepseek-v4-pro",
      "combinator": "z-ai/glm-5.2",
      "extender": "deepseek/deepseek-v4-pro"
    },
    "phase2_decision": { "chief_judge": "google/gemini-2.5-pro", ... },
    "phase3_deepdive": { "architect": "google/gemini-2.5-pro", ... },
    "phase4_writing": { "draft": "google/gemini-2.5-pro", "review": "z-ai/glm-5.2" }
  }
}
```

可用模型：`deepseek/deepseek-v4-pro`、`google/gemini-2.5-pro`、`z-ai/glm-5.2`、`anthropic/claude-haiku-4-5`。

> gemini 不支持 Write 工具，workflow 自动用 deepseek relay 写文件，无需额外配置。

### 6. 产出

```
outputs/
├── auto_gap_finder.md          # Phase 1: 方向分析
├── auto_combinator.md
├── auto_extender.md
├── auto_judge_novelty.md       # Phase 2: 评委评分
├── auto_judge_feasibility.md
├── auto_judge_value.md
├── auto_decision.md            # 最终选定方向
├── auto_architect_plan.md      # Phase 3: 技术辩论
├── auto_critic_challenge.md
├── auto_tech_plan.md           # 最终技术方案
├── auto_novelty.md             # 新颖性审查
├── auto_patent_draft.md        # ⭐ 专利初稿
└── auto_quality_review.md      # 质量审核报告
```

### 7. 迭代打磨

初稿出来后直接跟 Claude 对话修改：

```
"权利要求2范围太窄了，帮我扩大"
"有益效果需要量化指标"
"背景技术部分引用不够，补充一下"
```

---

## 配置说明

### 方向限定

| 参数 | 说明 | 示例 |
|------|------|------|
| `direction_hint` | 预设专利方向，注入所有Agent的prompt。可为空。 | `"游戏AI"`, `"多模态融合"`, `"LoRA微调"`, `""` |

### 模式

| mode | 行为 |
|------|------|
| `auto` | 全自动，一次运行到底 |
| `interactive` | 每阶段暂停，重跑自动跳过已完成阶段 |

### 模型

| 角色 | 说明 | 推荐模型 |
|------|------|---------|
| writer | 写文件 relay（gemini 等不兼容模型的兜底） | deepseek |
| gap_finder | 空白发现者 | deepseek |
| combinator | 组合创新者 | glm-5.2 |
| extender | 延伸拓展者 | deepseek |
| judge_* | 三维评委 | deepseek / glm-5.2 |
| chief_judge | 首席评委终裁 | gemini |
| architect | 架构师提案 | gemini |
| critic | 批判者挑战 | glm-5.2 |
| synthesizer | 合成者定稿 | gemini |
| novelty | 新颖性审查 | deepseek |
| draft | 专利撰写 | gemini |
| review | 质量审核 | glm-5.2 |

---

## 目录结构

```
zhuanliproject/
├── config.json              # 模型+模式配置
├── work_content.md          # 你的工作内容（不入库）
├── work_content.example.md  # 工作内容模板
├── workflows/
│   ├── phase_full_auto.js   # 全自动/半自动 workflow
│   ├── phase1_direction_brainstorm.js
│   ├── phase2_tech_deepdive.js
│   └── phase3_patent_draft.js
├── outputs/                 # 运行时产出
├── patent_summaries/        # Phase 0: 专利摘要库
│   ├── *_summary.md
│   ├── patent_landscape.md
│   └── format_template.md
├── extracted_texts/         # Phase 0: 提取的专利文本
└── mine/                    # 已有专利原文（不入库）
```

---

## Phase 0: 离线准备

已有专利 → 提取文本 → 结构化摘要 → 格式模板 → 专利全景地图。

新增专利时：放入 `mine/` → 运行提取脚本 → 重新生成摘要。
