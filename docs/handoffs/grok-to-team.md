# Grok → 组员交接：前端与 3D

分支：`feat/voyage-web`  
工作树：`/Users/jacky/work/civilization-voyage-web`  
负责：`apps/web/`。视觉按 `docs/design/`（Claude）。接口按 Codex `feat/voyage-api`。

## 启动

```sh
./scripts/dev.sh
```

打开 http://127.0.0.1:5173 。API 默认 8010。船体默认 `hull_id: bao-chuan-01`，商店换船留到后续。

## 已实现

- 启航：新航程 / 继续航程，场景 A/B/C 标「AI 推荐，待组员确认」，测试海域标测试。
- 驾驶舱：问题与共同任务；无模型时「尚未接入」，不假装回复。
- 航线：简单 / 步骤较多；真实用量未知显示 —。
- 3D 海域：程序化船与港口体块，WASD + 触屏摇杆，边界，第三人称跟船（船头 −z）。
- 靠测试港、发现测试碎片、服务端交易（幂等键由前端生成）。
- 协作面板与航海日志；刷新后用 `cv.lastVoyageId` 恢复。
- 两本账分开；HMT 显示尚未接入。
- 减少动态开关。

## 未做

- 高保真船舱 glTF 与授权文物图。
- 与真实付费模型联调（需服务端环境变量）。
- 合并 Claude / Codex 分支后的整链浏览器验收，需三方同时在同一棵树上。
