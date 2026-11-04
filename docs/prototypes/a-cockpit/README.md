# A 岗 · 文化驾驶舱离线原型

单文件 HTML 演示，对应四段航程里的「文化驾驶舱」（玄览玄通）。**不是** `apps/web` 正式界面；**不是**同学侧 3D 航程 Demo。

相关讨论：[Issue #5](https://github.com/yj438863687/civilization-voyage/issues/5)

## 怎么打开（本单主文件）

1. 用浏览器直接打开 **`cockpit-four-legs.html`**（`file://` 即可）。
2. 无需本地服务器、无后端、无登录。
3. 建议桌面宽度 ≥ 1024。

旧文件 `cockpit.html` 为 **deprecated 题材**（团圆微展 / v1.1-k3），机制可参考，讲解请用四航段新文件。

## 诚实说明（请先读）

| 项 | 现状 |
| --- | --- |
| 船员对话 | **预设台词 / 本地脚本**（大副/二副为示例占位），不是实时模型调用 |
| AI | **无 live AI**；不假装「已接入」 |
| 3D | **本页≠3D 航程 Demo**；无引擎/关卡 |
| 导出 | 问题卡 JSON，`schema_version` **1.0**，`scenario_id=four_legs_compass` |
| 材料出处 | 写在 HTML 材料卡与 `scenes/A.md`；**本目录不附 PDF** |
| 视觉 | 墨海铜灯（对照 `UI_ALIGN_墨海铜灯.md`）；无 CDN |

## 本目录文件

| 文件 | 说明 |
| --- | --- |
| `cockpit-four-legs.html` | **本单主文件**：四航段罗盘传代 |
| `cockpit.html` | deprecated：旧团圆微展题材 |
| `question-card.example.json` | 问题卡整合示例（four_legs_compass） |
| `script-outline.txt` | 使用说明与中英讲稿提纲 |
| `UI_ALIGN_墨海铜灯.md` | 视觉对齐说明 |
| `UI_CHANGES.md` | 历史 UI 改动记录 |

## 与正式前端的关系

- 不修改 `apps/web` / 同学游戏仓。
- 不引入 CDN 字体或外链脚本。
- 真正发群 / 挂 PR：体验 PASS + 用户批 + 调度信封。
