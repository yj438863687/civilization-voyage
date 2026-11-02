# A 岗 · 文化驾驶舱离线原型

单文件 HTML 演示，对应四段航程里的「文化驾驶舱」（玄览玄通）。**不是** `apps/web` 正式界面；先放在 `docs/prototypes/`，等设计令牌统一后再迁。

相关讨论：[Issue #5](https://github.com/yj438863687/civilization-voyage/issues/5) · 场景草稿 PR [#4](https://github.com/yj438863687/civilization-voyage/pull/4)

## 怎么打开

1. 克隆本仓库后，用浏览器直接打开本目录下的 `cockpit.html`（`file://` 即可）。
2. 无需本地服务器、无后端、无登录。
3. 建议桌面宽度 ≥ 1024；窄屏可用，触控目标已抬高。

## 诚实说明（请先读）

| 项 | 现状 |
| --- | --- |
| 船员对话 | **预设台词 / 本地脚本**，不是实时模型调用 |
| AI | **无 live AI**；不假装「已接入」 |
| 导出 | 问题卡 JSON，`schema_version` **1.0** |
| 材料出处 | 写在 HTML 材料卡与 `scenes/A.md`（见 PR #4）；**本目录不附 PDF** |
| 视觉 | HarbourMind / 纸面原型（navy–paper–gold–teal）；对齐 PR #1「墨海铜灯」tokens 为后续跟进 |

## 本目录文件

| 文件 | 说明 |
| --- | --- |
| `cockpit.html` | 离线驾驶舱（页面内标题仍为「文化航程 · A 文化驾驶舱」） |
| `question-card.example.json` | 问题卡整合示例（schema 1.0） |
| `script-outline.txt` | 使用说明与中英讲稿提纲 |
| `UI_CHANGES.md` | 按 [taste](https://github.com/kuaizengji/taste) 交互 Skill 主题 33 的定向改动记录（可选阅读） |

未入库：提案 PDF、发群 ZIP（体积大；材料出处与讲稿已用上面小文件覆盖）。

## 与正式前端的关系

- 不修改 `apps/web`。
- 不引入 CDN 字体或外链脚本。
- 视觉与 PR #1 `docs/design/tokens.css` 对齐留作 follow-up（见 Issue #5）。
