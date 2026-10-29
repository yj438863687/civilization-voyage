# 后端契约与执行边界

唯一字段来源是 `apps/api/voyage/models.py` 与 FastAPI 路由。OpenAPI 从 `app.openapi()` 导出，TypeScript 用 openapi-typescript 生成，不手写第二套字段。生成文件一起提交。

## 运行与访问

首版仅本地单用户：所有数据归 `local` 所有，监听 `127.0.0.1`，同一台电脑上的使用者共享数据。没有登录、多人隔离或身份认证；不得绑定公网或放在共享反向代理后。CORS 只放行本地 Vite 的 5173 端口，CORS 不是身份认证。

多人部署是尚未实现的独立阶段：必须先加入经认证的用户、服务端 owner_id、所有航程及嵌套资源查询的所有权检查、管理员场景确认权限和秘密管理。不得将当前 local 标记当作多用户保护。

SQLite 启动自动建表、加载候选与中性 fixtures；数据库路径 `VOYAGE_DB`。仅启动一个 Uvicorn worker；任务 worker 是同进程独立协程，不依赖页面 HTTP 生命周期。不支持多个进程争抢任务或无停机发布。数据库文件由服务端管理并从 Git 排除。

## 四段数据流

1. Voyage 的 question/shared_task 与 crew 保存驾驶舱产物。Crew 身份、角色、确认状态与 model_id 分离，不强制固定厂商。
2. Route 保存步骤、选择依据、预算和币种。预算是用户规划，不是自动扣费上限；首版不提供收费估算引擎，费用高不意味着结论更正确。choice 记录保留不同选择。
3. world 保存场景位置；scene_id/version/track 定位候选、正式或测试场景。测试世界提供 test-port，test-cargo。ports 返回服务端报价与市场库存，交易写入库存、资源余额和交易影响。余额与容量不能通过 PUT 航程修改。世界坐标是首轮前端可保存状态，尚未实现导航物理和航程规则。
4. records 保存材料、碎片、选择、作品、日志及反思，保留文本、材料 ID、来源 URL、授权、版本与访问范围。史实材料/碎片必须带来源；`verified` 是人工声明而非系统证明。任务输出标记创作，不能自动变成历史事实。没有检索接口或高级 RAG 声明。

候选 A/B/C 为原创推荐概述，仅链接公开资料，未复制第三方正文和图像。均为“AI 推荐，待组员确认”。PUT candidates 仅写候选；confirm 需明确 reviewer 与 decision_note，生成独立、不可覆盖的 confirmed 版本及确认记录，候选仍保留。正式版本变更需新版本；确认是本地用户显式操作，不是模型自动判断。测试经济即使用于候选演示，也始终标记为 fictional_test_resource。

## 事务、事件与模型

交易用 BEGIN IMMEDIATE 将库存、资源余额、市场库存及记录一次提交。幂等键在航程内唯一；相同键相同输入返回原结果，不同输入 409。港口、商品、价格、容量、余额与库存由服务器检查。各航程测试市场独立。

任务 queued → running → succeeded/failed，queued 可直接 cancelled；running 取消仅持久化请求，等待上游返回后变 cancelled，仍记录已发生用量。取消不承诺供应商退款或停止计费。任务提交同样幂等；页面刷新先 GET tasks，再按事件 seq 增量读取，绝不通过重新提交新键“恢复”。记录 observable input/output 与状态，不请求隐藏思维链。

进程重启恢复 queued；running 因无法确认上游是否已消费，标记 failed/worker_interrupted，禁止自动重放。取消 Uvicorn 时尚在运行的任务在下次启动执行该规则。无任意整体生成截止时间；连接/写入/连接池限制 30 秒，上游读取不设置总期限。当前顺序 worker 会被长请求占用，这是本地首版限制。

支持显式配置的 OpenAI chat-completions 非流式协议。VOYAGE_MODEL_URL/NAME/KEY 配置单模型；多模型改用 VOYAGE_MODELS JSON 数组，每项 id/url/model/key_env，key_env 必须为 VOYAGE_SECRET_ 开头的大写环境变量名。例：`[{"id":"first-mate","url":"https://provider.example/v1/chat/completions","model":"chosen-model","key_env":"VOYAGE_SECRET_FIRST"}]`。仅读取这些显式环境变量，不查找本机文件。GET models 只返回配置 ID、模型名、能力和凭据来源。无配置返回空列表，提交任务 503，不调用付费服务。修改配置请重启服务。

失败事件不保存上游错误正文、请求头或异常 URL，避免供应商泄露凭据。模型输出和用户材料是本地私密数据；用户不应把秘密写进 prompt。上游内容仍是未验证数据。首版不安全保存凭据；仅使用服务端环境变量，不接受前端上传密钥。

usage 独立表记录任务、模型、耗时、供应商返回的真实用量；没有返回用量时为空对象，不推算金额。HMT settlement 始终 not_connected，不提供伪余额、扣款或成功回执。测试资源账本就是 trades，真实调用账本就是 usage；两者不互相改动。

## 验证与尚未完成

自动化覆盖保存恢复、来源/选择、交易原子性与并发幂等、余额/容量/市场库存/个人库存不足、候选确认、模型未接入、上游失败、任务事件增量、页面提交结束后的后台执行、进程中断和真实用量结构与测试经济隔离。上游测试为 HTTP mock，不是付费模型验证。

尚未完成：前端与 3D 整链验证、真实供应商调用、正式场景审定、多人认证、部署、多进程队列、实际价格/预算执行、真实 HMT、高级 RAG。不得以 API 测试通过声明完整产品完成。
