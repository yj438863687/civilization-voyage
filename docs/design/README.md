# 设计规范入口

审美方向：**墨海铜灯**（夜间海图室）。通用驾驶舱不随场景变，文明只通过场景皮肤变量进入画面。

| 文件 | 内容 |
| --- | --- |
| [ART_DIRECTION.md](ART_DIRECTION.md) | 审美方向、理由、材质光照、空间层次、通用与场景分离、各页落实 |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | 颜色、字体、间距、尺寸、材质、组件、七种状态 |
| [SCREEN_SPEC.md](SCREEN_SPEC.md) | 七个页面 + 通讯台抽屉，桌面与窄屏，状态总表 |
| [MOTION.md](MOTION.md) | 必要反馈 / 镜头 / 装饰三类动效，减少动态，性能 |
| [SCENE_CANDIDATES.md](SCENE_CANDIDATES.md) | 场景 A/B/C 的视觉与文化候选（AI 推荐，待组员确认）及出处、待核实问题 |
| [tokens.css](tokens.css) | 唯一设计变量源，前端可直接引用 |
| [concepts/](concepts/) | 概念设计预览，非最终界面 |

交给前端的约束与素材清单见 [claude-to-grok.md](../handoffs/claude-to-grok.md)。

## 使用

```bash
# 在 docs/design/ 下预览概念页（也可直接用浏览器打开）
python3 -m http.server 8080
# 前端接入：复制 tokens.css 到应用样式目录，或 import 本文件
```

约定：变量只加不减式扩展时遵循现有命名；新增场景皮肤只允许覆盖 `--cv-scene-*`。
