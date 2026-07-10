# 专利撰写 Workflow 系统

## 概述

基于已有专利分析和当前工作内容，全自动/半自动地完成新专利的：**方向构思 → 技术深挖 → 初稿撰写 → 迭代打磨**。

---

## 使用方法

### 1. 准备已有专利

把你的专利 .docx/.doc 文件放入 `mine/` 目录。**首次运行时 workflow 会自动提取文本并生成摘要库**，无需手动操作。

```
mine/                        ← 放入已有专利文件
  ├── 专利1.docx
  ├── 专利2.docx
  └── ...

↓ 首次运行自动生成 ↓

patent_summaries/            ← 自动生成
  ├── *_summary.md           ← 每份专利的结构化摘要
  ├── patent_landscape.md    ← 专利全景地图
  └── format_template.md     ← 撰写格式模板
```

> 后续 `mine/` 新增专利文件时，删除 `patent_summaries/` 目录后重跑即可重新生成。

### 2. 准备配置

```bash
cp config.example.json config.json
# 编辑 config.json: 切换模型、设定方向(hint)、选择模式(auto/interactive)
```

```json
{
  "mode": "auto",
  "direction_hint": "游戏AI多模态推理",
  // 或 "直播内容理解"、"LoRA微调" 等，留空 "" 不限定
  "models": { ... }
}
```

> `direction_hint` 注入到所有 Agent prompt 中，确保全流程围绕该方向。

### 3. 准备工作内容（可选）

```bash
cp work_content.example.md work_content.md
# 填入你的近期工作/绩效，不填则纯基于已有专利空白构思方向
```

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

### 5. 产出

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

### 6. 迭代打磨

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
├── patent_summaries/        # 专利摘要库
│   ├── *_summary.md
│   ├── patent_landscape.md
│   └── format_template.md
├── extracted_texts/         # 提取的专利文本
└── mine/                    # 已有专利原文（不入库）
```

---

## 附录：手动分步运行

如果不想用全自动/半自动 workflow，也可以逐步手动执行。

### Phase 0：提取专利摘要库

```bash
# 1. 提取文本
python3 -c "
import docx, os
mine='mine'; out='extracted_texts'; os.makedirs(out,exist_ok=True)
for f in os.listdir(mine):
    if f.endswith(('.docx','.doc')):
        doc=docx.Document(os.path.join(mine,f))
        text='\n'.join(p.text for p in doc.paragraphs if p.text.strip())
        open(os.path.join(out,f.rsplit('.',1)[0]+'.txt'),'w').write(text)
"
```

然后与 Claude 对话：*"读取 extracted_texts/ 下的专利文本，生成结构化摘要、格式模板、专利全景地图"*

### Phase 1：专利方向构思

```js
Workflow({scriptPath: "workflows/phase1_direction_brainstorm.js"})
```

产出 `outputs/phase1_candidate_directions.md`，你审核选定方向后创建 `outputs/phase1_selected_direction.md`。

### Phase 2：技术方案深挖

```js
Workflow({scriptPath: "workflows/phase2_tech_deepdive.js"})
```

产出技术方案 + 新颖性论证，审核通过后进入下一步。

### Phase 3：专利初稿撰写

```js
Workflow({scriptPath: "workflows/phase3_patent_draft.js"})
```

产出完整交底书 + 质量审核报告。

### Phase 4：迭代打磨

直接与 Claude 对话修改初稿，无需 workflow 脚本。