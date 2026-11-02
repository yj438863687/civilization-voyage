# UI 定向修改 · 文化驾驶舱（taste topic 33）

范围：单文件离线 HTML 原型视觉/触感润色。未换业务逻辑、材料数据、导出 schema，也未套用 Hallmark / 落地页 / B 端后台整套模板。

参考：`taste/ui/interaction-skill` 主题 33（主）+ 09/19/32 局部；`prompts.md`（减少次要标签噪音）。

## 诊断（基线 `驾驶舱_before.html`）

| # | 位置与状态 | 观察 | 对主任务影响 | 最小修改 | 复查 |
|---|---|---|---|---|---|
| 1 | 主面板 `.panel` | 阴影几乎不可见（`#14364105`），纸面层级弱 | 阅读区与背景糊在一起，步骤切换后焦点不稳 | 软纸阴影 + 略圆角 | 桌面截图 step1/2 |
| 2 | 侧栏 `.step` | 激活块可用，但未激活态扫描弱；触控高度偏紧 | 四步航程是核心导航 | sticky 导航 hover、圆角、min-height | 侧栏与窄屏 |
| 3 | 按钮阶梯 | primary/普通/subtle 区分弱 | 「下一步」与次要操作抢注意力 | primary 内高光+投影；subtle 透明底 | 各步 nextrow |
| 4 | `.material.selected` | 仅浅边框/浅绿底，选中难扫 | 材料选用是问题卡依据 | 内嵌 teal 左边线 + 柔和底与阴影 | step2 勾选 M1 |
| 5 | 焦点与动效 | 仅有 outline-offset；无 panel/toast 过渡；无 `prefers-reduced-motion` | 键盘用户与敏感动效用户体验差 | `:focus-visible` 环；panelIn/toast；减少动态回退 | 代码 + 截图 |
| 6 | lede/help/间距 | 说明层叠偏密，节奏松散 | 拖慢「先写理解」主路径 | 收紧 lede 下边距；help 略降对比 | step1 |
| 7 | 页头 | 纯色块扁平 | 品牌识别弱但不影响填表 | 微渐变 + 底边金线（保留 navy/gold） | header 截图 |
| 8 | 移动端步骤 | 四列字小、命中区偏小 | 触屏难点 | min-height≈52–56、按钮≥44 | 媒体查询代码（未真机） |

本次**未用**：粒子/电影卷轴/滚动劫持、紫色 AI 渐变、CDN 字体、虚构指标。

## 已实施（位置 → 改动）

1. **设计令牌**：`:root` 增加 `--shadow` / `--focus` / 间距与字号节奏；纸色微调，仍为 navy/paper/gold/teal。
2. **主面板**：纸面阴影与 `12px` 圆角；进入 `panelIn`（尊重 `prefers-reduced-motion`）。
3. **步骤导航**：激活态软阴影；hover；触控最小高度；圈号过渡。
4. **按钮阶梯**：primary 内嵌高光+teal 投影；subtle 弱化；`:active` 轻压；统一 `focus-visible`。
5. **材料选中**：`inset` teal 左边线 + `#f4faf7` 底 + 软阴影。
6. **Toast**：由 display 切换改为 opacity/visibility 过渡（JS API 不变）。
7. **页头**：微渐变 + 金线分隔；演示按钮半透明描边。
8. **无障碍**：`goStep` 滚动在 `prefers-reduced-motion: reduce` 时用 `auto`（唯一 JS 改动）。
9. **窄屏**：步骤与主按钮抬高触控目标；520px 下 crew 两列。

## 验证

- `k3-upgrade/out/_work/check.py`：全部通过（外链、node --check、id、材料 JSON、schema/确认/导出等）。
- 材料 `source-data` 与基线逐字一致；无 CDN/`@import`。
- Headless Chrome 1280×800：`shots/step1-1280x800.png`、`shots/step2-1280x800.png`。
- **未验证**：真机触控、屏幕阅读器完整朗读、打印 PDF 目视（打印 CSS 已保留）。

## 产物路径

- 工作稿：`/workspace/uploads/wenhua-a/taste-ui/文化航程_A_文化驾驶舱.html`
- 基线副本：`/workspace/uploads/wenhua-a/taste-ui/驾驶舱_before.html`
- 同步覆盖：`/workspace/uploads/wenhua-a/k3-upgrade/out/文化航程_A_文化驾驶舱.html`
- 本说明：`/workspace/uploads/wenhua-a/taste-ui/UI_CHANGES.md`
- 截图：`/workspace/uploads/wenhua-a/taste-ui/shots/`
