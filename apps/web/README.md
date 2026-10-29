# 文明航程 Web

前端与 3D 海域。视觉规范来自 `docs/design/`（墨海铜灯），接口来自 Codex 的 FastAPI。

## 启动

另开终端先启动后端（仓库根或 API worktree）：

```sh
cd apps/api
.venv/bin/uvicorn voyage.main:app --host 127.0.0.1 --port 8010
```

（本机 8000 常被其他服务占用，默认改走 8010。空闲时也可用 8000，并设 `VITE_API_BASE`。）

前端：

```sh
cd apps/web
npm install
npx vite --host 127.0.0.1 --port 5173
```

浏览器打开 http://127.0.0.1:5173 。接口默认 `http://127.0.0.1:8010`，可用 `VITE_API_BASE` 覆盖。

## 本轮能走通的链

1. 启航：新航程 / 继续航程（刷新后读 localStorage 中的航程 id）。
2. 驾驶舱：形成文化问题；无模型时显示「尚未接入」，不假装回复。
3. 航线：两条探索方式，真实用量未知时显示 —。
4. 3D 航行：WASD / 摇杆，第三人称跟船，海域边界。
5. 靠测试港、发现测试碎片、用服务端交易（前端不自作主张扣款）。
6. 航海日志与再次进入驾驶舱。

场景 A/B/C 只作为「AI 推荐，待组员确认」入口。测试海域带测试印章与斜纹。
