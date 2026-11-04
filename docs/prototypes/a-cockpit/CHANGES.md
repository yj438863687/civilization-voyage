# CHANGES — CV-20261104-01（题材替换）

日期：2026-11-04 HKT  
相对基线：`v1.1-k3/` 旧「团圆微展」题材 + `docs/prototypes/a-cockpit/cockpit.html`（墨海铜灯机制）

## 置顶：题材替换

| 旧 | 新 |
| --- | --- |
| 团圆微展 / `reunion_micro_exhibition` | 四航段文明航程·罗盘传代 / `four_legs_compass` |
| 材料：苏轼词 / 博饼 / 大坑舞火龙 | 材料：OpenStax 新石器概述 / RMG 风帆→蒸汽 / ISOC 互联网简史 / OECD AI 原则 |
| 主问题围绕校园微展参与 | 主问题：什么算「造出下一段能力」；依据哪张罗盘；未知交给下一岗 |
| localStorage `harbourmind-a-cockpit-v1` | `harbourmind-a-cockpit-four-legs-v1`（避免草稿串味） |

**旧 `cockpit.html`（团圆题材）保留，标为 deprecated 题材**；本单主文件为 `cockpit-four-legs.html`。旧 ZIP `v1.1-k3/文化航程_A_发群交付包_k3.zip` 不删，但不再作为本场景讲解主包。

## 机制保留（相对 v1.1-k3 / 墨海铜灯 cockpit）

- 四步流：初始理解 → 材料卡 → 修订判断 → 导出问题卡
- schema_version **1.0**；导出 / 草稿 / 确认 / 校验 / 打印
- 墨海铜灯视觉令牌；无 CDN、无外链 script、无 @import 远程字体
- `group_status` 恒 `pending`；船员 `origin=preset_script`

## 本单新增 / 改动

1. 场景 MD：立意锚、四航段、罗盘四态与传代句、船员占位、共同任务、携带字段
2. 材料卡 4 条（均含 support/limit；公开可复核 URL）
3. HTML：侧栏罗盘四态可见；贴签文案改为事实依据/我的解释/尚不能断；罗盘形态选择；shared_mission；诚实披露「预设台词/非实时模型」「本页≠3D Demo」
4. 问题卡示例与 HTML 导出字段对齐
5. 讲稿、发群包清单、SELFTEST

## 明确未做

3D/引擎/关卡、真 API、密钥、B/C/E 全文、合入 main、对外发群。
