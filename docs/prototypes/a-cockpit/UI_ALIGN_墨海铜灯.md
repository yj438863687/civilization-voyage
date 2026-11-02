# UI 对齐 · 墨海铜灯（civilization-voyage）

对照仓库 `design/voyage-art-direction`（PR #1）：`ART_DIRECTION.md` / `DESIGN_SYSTEM.md` / `tokens.css` / `concepts/cockpit-preview.html`，以及 `feat/voyage-web` 的 `apps/web/src/styles`。

范围：单文件离线 A 文化驾驶舱原型的视觉层。**未改** IDs、localStorage key、schema 1.0、`source-data`、导出/草稿/确认/校验/打印/演示/重置逻辑。

## 令牌映射

| 产品语义 | 令牌 | 落在本页 |
| --- | --- | --- |
| 夜海 / 舱壁 | `--cv-ink-950…800`、`--cv-bg`、`--cv-surface-1` | 页底渐变、侧栏仪器轨、HUD 顶栏 |
| 纸（内容本身） | `--cv-surface-paper`、`--cv-text-on-paper` | 四步主面板、材料卡、问题卡预览 |
| 铜（可操作） | `--cv-brass-*`、次按钮铜边 | 步骤激活灯、顶栏金线、材料选中左边线、引用竖线 |
| 朱砂（用户落印） | `--cv-action-primary-*` | 各步唯一主 CTA（下一步 / 确认问题卡） |
| 场景 A 点缀 | `[data-scene=A]` 黄昏港湾色作页底径向光 | 暖灯椭圆 + 水线冷青，不做控件色 |
| 字体 | display 宋 / body 黑 / mono 刻度 | `Noto Serif CJK SC` / `Noto Sans CJK SC` 本地栈，无 CDN |
| 焦点 | `--cv-shadow-lamp`、`--cv-focus-ring` | 当前步骤 + 当前纸面板；`:focus-visible` 铜环 |
| 动效 | `--cv-dur-*` + `prefers-reduced-motion` | panel 淡入、toast；减少动态时压到近 0 |

## 去掉的「AI 味 / 单调」

| 去掉 | 换成 |
| --- | --- |
| 米色整页 + 白卡片 SaaS 壳 | 墨海舱底 + 纸面任务卡（内容上纸、控件在铜） |
| 等权灰步骤胶囊 | 侧栏竖轨 + 铜针序号；当前步单处灯影 |
| Teal 主色教育模板 | 朱砂主印 / 铜次操作（对齐 DESIGN_SYSTEM 按钮表） |
| 选中浅绿底「正确感」 | 铜左边线 + 灯影，不作对错色 |
| 紫/霓虹渐变、毛玻璃 | 禁止；HUD 用实色 scrim |
| 堆叠 secondary 标签噪音 | 保留必要印章式 `smalltag`；说明靠版面与字号对比 |
| 假纸纹噪点贴片 | 不用库存 grain；仅纸阴影 + 顶缘铜条 |

## 与正式驾驶舱的边界

本页仍是 **A 岗离线表单原型**（四步写问题卡），不是 3D 海图室。对齐的是材质语言与控件语义；对话席位 / 通讯台 / 两本账等完整舱布局见 `SCREEN_SPEC §2` 与 web 实现，后续若迁入 `apps/web` 再拆组件。

## 验证

- `k3-upgrade/out/_work/check.py`：全部通过（外链白名单、node --check、id、材料 JSON 字节一致、schema/确认/导出等）
- 无 CDN / `@import` / `<link>` / `<img>`
- 截图：`shots-mohai/step1-1280x800.png`、`step2-1280x800.png`

## 产物

- `taste-ui/文化航程_A_文化驾驶舱_墨海.html`（本版主文件）
- 同步：`k3-upgrade/out/文化航程_A_文化驾驶舱.html`、`taste-ui/文化航程_A_文化驾驶舱.html`
- 仓库：`docs/prototypes/a-cockpit/cockpit.html`（PR #6 跟进提交）
