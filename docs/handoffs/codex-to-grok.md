# Codex → Grok 联调交接

实现范围：apps/api、packages/contracts、content/scenes 与架构文档。没有改 apps/web 或视觉规范。

## 启动（从仓库根目录）

```sh
python3 -m venv apps/api/.venv
apps/api/.venv/bin/pip install -r apps/api/requirements.txt
cd apps/api
# 不需要密钥即可跑航程、场景、交易、材料与反思；环境变量示例见 .env.example
.venv/bin/uvicorn voyage.main:app --host 127.0.0.1 --port 8000
```

首次启动自动创建 SQLite、初始化中性场景及 A/B/C 候选。数据库默认在当前目录，可通过 VOYAGE_DB 指定绝对路径。仅单 worker、本地单人模式。OpenAPI `/openapi.json`，交互文档 `/docs`。

```sh
# 从 apps/api 运行
.venv/bin/python -m pytest -q
.venv/bin/python export_openapi.py
cd ../../packages/contracts
npm ci --ignore-scripts
npm run generate
```

## 接口调用示例

```ts
import type { components } from '@civilization-voyage/contracts';
type Voyage = components['schemas']['Voyage'];
const base = 'http://127.0.0.1:8000';
const response = await fetch(`${base}/voyages`, {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({title: '我的测试航程'})
});
if (!response.ok) throw new Error(await response.text());
const voyage: Voyage = await response.json();
// voyage.id、balance=100、capacity=20、inventory={}；全为虚构测试资源。
```

GET `/voyages` 列表恢复航程，GET `/voyages/{id}` 读取。PUT 同路径保存 stage、question、shared_task、crew、route、world（完整输入见生成类型）。stage 为 cockpit/route/world/reflection。不要在前端改余额和容量。

GET `/scenes` 返回测试、候选及正式记录，按 id/version/status 区分。展示候选 label；不要把 pending 当作 confirmed。创建候选演示航程指定 scene_id=A、scene_version=1、scene_track=candidate。确认功能需要本地用户明确操作，POST `/scenes/A/1/confirm`，输入 reviewer、decision_note。

GET `/voyages/{id}/ports` 读取港口商品与报价。POST `/voyages/{id}/trades`：

```json
{"request_id":"由前端生成并持久化的唯一操作键","port_id":"test-port","good_id":"test-cargo","side":"buy","quantity":2}
```

返回 delta_balance=-10、delta_inventory=2、balance_after=90、inventory_after=2 及交易 ID。sell 同结构。GET trades 读取账本。重试使用原 request_id，输入变化生成新键。商品价格不由前端提交。

POST `/voyages/{id}/records` 保存 `kind`（material/fragment/choice/artifact/log/reflection）、text、classification（historical_claim/counterfactual/creative/test）、sources、material_ids、version、access=private。Source 包含 id/title/url/license/verification。GET records 回顾，史实材料或碎片不得省略来源。

GET `/models` 读取可用服务，无配置为空。crew.model_id 绑定返回的 id；每个船员可绑定不同服务。POST `/voyages/{id}/tasks` 输入 request_id、prompt、model_id，返回 queued 任务（201）。无模型配置返回 503，应显示“尚未接入”，不要展示假生成结果。

页面轮询 GET `/voyages/{id}/tasks/{taskId}` 和 `/events?after=最后seq`。seq 是数据库全局递增值，允许跳号。刷新先 GET tasks 找回任务，不能用新 request_id 重复模型调用。事件包括 queued、started（可观察输入）、succeeded（输出与用量）、failed（明确错误码）、cancel_requested。取消 POST `/cancel`，正在执行时不能承诺立即停止计费。最终产物同时保存到 records。

GET `/voyages/{id}/usage` 读取模型及用量。没有实际调用时为空数组；金额未知。GET `/health` 的 hmt=not_connected。真实费用与剧情资源分别显示，不把测试余额叫作 HMT。

错误：404 不存在，409 状态/交易/幂等冲突，422 输入不合法，503 未配置模型。FastAPI 错误响应 `detail` 为字符串或验证错误数组，前端应处理非 2xx。

## 验证与接手

已跑 API 测试及实际本地 HTTP 冒烟验证；模型成功/失败由 mock 验证，没有调用付费服务。前端尚未存在于本 worktree，未完成浏览器与 3D 世界整链验证。Grok 接手：按契约构建四段页面、断线恢复、交易变化与来源展示；随后双方共同做浏览器整链验证。Claude/组员接手候选审定、素材授权和视觉规范。

完整限制与数据/状态设计见 ../architecture/api.md。

本次实测：`pytest -q` 8 passed；本地 Uvicorn HTTP 冒烟通过 health、航程创建/恢复、重复交易幂等、OpenAPI 与空真实用量账本。未进行真实付费调用。
