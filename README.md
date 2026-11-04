# 文明航程 Civilization Voyage

以船为载体，追寻文明历史痕迹、推演未来发展、诠释文化核心。

当前开发版围绕**技术与文明的关系**，包含农业、工业、信息、人工智能四个时代。每个时代有内海（中国）与外海（世界）两条路线，依年代经历两座历史岛屿、一次关键决定和终点回顾。岛内包含连渠、装仓、排字、铺线、控压、工班调度、电码、纠错、授权、对话、提子和复核12种操作，再由玩家决定怎样使用技术；补给可整修船体外观，人心可解锁船员行装。历史背景与创作分别标明，真实模型服务与高级 RAG 仍为可选后续能力。

## 启动基础版

```sh
chmod +x scripts/dev.sh
./scripts/dev.sh
```

浏览器打开 http://127.0.0.1:5173  
API 默认 http://127.0.0.1:8010（本机 8000 常被占用）。无密钥也可跑测试航程、交易和日志。

走一遍：选时代 → 确认这一程的问题 → 选内海或外海 → WASD 航行、靠近岛屿按 E → 读图文、进入小游戏 → 依次完成两岛与关键决定 → 按 F 靠港听回顾 → 记下自己的看法。刷新恢复航程，船坞与换装可在出航前或靠港后打开。

船型随时代变化，整修解锁舷板护条、成对航灯与船旗；船员行装随人心解锁。外观进度跨时代保留，重新开局会回到起点。

## 仓库结构

- `apps/web/` 前端与 3D
- `apps/api/` FastAPI + SQLite
- `packages/contracts/` OpenAPI 生成的类型
- `docs/design/` 视觉规范（墨海铜灯）
- `docs/architecture/` 接口与数据
- `content/scenes/` 机器可读场景（测试 + 候选）

## 共同维护的内容

- [产品框架](FRAMEWORK.md)
- [五人分工与写作方式](CONTRIBUTING.md)
- 文明场景：[A](scenes/A.md)、[B](scenes/B.md)、[C](scenes/C.md)
- [初始任务清单](project-plan.json)

## 四段航程

1. 文化驾驶舱：与不同船员对话，共同决定航程方向，对应 LLM。
2. 航线与资源：选择线路、预算与资源，对应 API。
3. 文明世界：与 Agents 探索文化碎片，重现文明国度，承载自由世界、3D 航海和经济模拟。
4. 航程反思：回顾来源、选择与成果，后续扩展 RAG。

## 开源与独立边界

本仓库使用 [MIT License](LICENSE)。第三方文化材料分别注明出处、授权和使用范围。

不包含任何私有项目代码、提交历史、密钥、用户数据或内部部署配置。未来若接入外部模型或 HMT 服务，只通过另行确认的公开接口与用户自行配置的凭据连接。当前不连接真实账户或扣费。没有模型配置时显示「尚未接入」，不假装回复。

## 历史故事与验证

航线和素材规则见 [历史岛屿设计](docs/design/HISTORY_ISLANDS.md)。八条路线的内容集中在 `apps/web/src/world/history.ts`；图片逐项来源与许可位于 `apps/web/public/history/ATTRIBUTION.json`，不随代码统一适用 MIT。

在仓库根目录运行 `node scripts/test-history.mjs` 检查年代链、图像、前后选择与升级；前端运行 `npm run build`。API 测试在 `apps/api` 下运行 `PYTHONPATH=. .venv/bin/python -m pytest -q`。

浏览器回归使用 `scripts/test-history-browser.mjs` 与 `apps/web/tests/history.html`。已安装 Playwright 及其 Chromium 后，在运行开发服务器的同时执行 `npm run test:history:browser`；可用 `VOYAGE_TEST_URL` 指定测试地址，`VOYAGE_BROWSER_EXECUTABLE` 指定浏览器。开发时如需同源 API 代理，启动前设置 `VITE_API_BASE=/api`，并可用 `VOYAGE_API_PROXY_TARGET` 指定后端地址（默认 8010）。

小游戏的音画反馈回归为 `node scripts/test-challenge-feedback-browser.mjs`，使用同样的浏览器与地址变量。检查真实音频波形、短点/长划的声音与亮灯时长、动画与声音的起点、静音及音量记忆、离场停声、锅炉/渠水动画和手机/减少动态模式。

船坞在首页可预览，启航后可随时按B打开并暂停航行；可看真实船体和船员近景，预览不扣资源。桌面安装更新工具为 `scripts/install-desktop-build.py`，只更新现有安装的构建包及候选场景，更新前备份原包与场景；可用 `--database` 指定原存档数据库做一致性快照。

船型、配乐与现场互动回归为 `node scripts/test-immersion-browser.mjs`：验证四段持续配乐的真实音频、16个船型阶段、24章现场，以及装仓、排字、铺线的拖拽与故事联动。

全部海上入口的回归脚本为 `scripts/test-story-entries-browser.mjs`：覆盖24个故事入口、8个港口总结、顺序锁定提示与重读。使用独立测试API（`VOYAGE_TEST_API`，默认8015）及 `VOYAGE_TEST_URL` 指定的前端，以免把测试航程混进实际存档。
