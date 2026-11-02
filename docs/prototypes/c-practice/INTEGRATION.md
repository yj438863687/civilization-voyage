# C 的集成边界与待联调契约

这是源码静态核对结果，不是跨模块联调通过声明。本轮只修改 C 原型，没有向真实航程写入记录或调用模型任务。

## 已核对快照

| 来源 | Commit | 位置 |
| --- | --- | --- |
| C 基线 | `379db54557489a02a38b60c0a56acfa99be5b15a` | 本目录 model.js、app.js、scenario.json |
| A | `59c463d87b249861018a2b9ec3f605fe5a37889b` | docs/prototypes/a-cockpit/question-card.example.json |
| B 相关文化设计说明 | `fe572d4c0713c2a04371906b790283a820c922ae` | docs/culture/APP_MAPPING.md；该文档明确不新增接口 |
| D 前端 | `c17f023151c40f0d726aa5691f00465572512196` | apps/web/src/App.tsx、api/client.ts、world/stances.ts、world/world.config.ts |
| 后端契约 | `0c44dabbab64c433430120d79d802414bd106c6f` | apps/api/voyage/models.py、main.py、packages/contracts/openapi.json |

可用 `git show <commit>:<path>` 复核，避免混入后续变动。五人主责来自根目录 CONTRIBUTING.md；本轮未修改该职责文档。

## 输入与输出的现实边界

C 只读取同目录 scenario.json 及同源本机存档，没有 A/B 文件导入、API 拉取或动态接入入口。恢复时要求问题、材料、观点、交接元数据及版本标识与当前情境相符，不能把 A 导出直接当 C 草稿，或只改 handoff.origin 假装接入。

C 输出 schemaVersion=1 的自有 JSON，包括材料、初始目标、最多两版方案、维护观察、唯一收束反思和未解决事项。它可供人工评审，尚不是后端 RecordCreate 请求体。

| 交接方向 | 当前依据 | 缺少的约定／功能 | 状态 |
| --- | --- | --- | --- |
| A → C | A 有 revised_question、已选 sources、personal_confirmation、group_status | A 示例 reunion_micro_exhibition 与 C 的 c_steam_port_pilot 题材不同；需共同场景、问题和材料映射，保留出处、support/limit 与确认范围 | 未联调 |
| B → C | 文化说明要求保留依据、解释、疑点、分歧及玩家决定 | 已核对分支中未提供可直接消费的 B 数据 schema；需 B/D 确认结构及确认主体 | 未联调 |
| C → D | D 已有靠港选位、代价承担者与 choice 落印 | 尚无 C 挂载入口和适配器；需 voyage、真实记录 ID 映射、结构化快照保存/读回、页面状态衔接 | 未联调 |
| C ↔ E | C 是剧情模拟资源；后端 usage.settlement=not_connected | 没有储备与真实 token/HMT 的换算契约；真实预算、用量和结算须独立实现与授权 | 未联调，无付费调用 |

个人确认不等于全组共识。C 的 origin=demo_preset、sourceModule=null、sourceRecordIds={}、groupStatus=pending 保持原样。

## 后端 records 的具体限制

POST /voyages/{vid}/records 输入是 RecordCreate，extra='forbid'，允许以下顶层字段：

| 字段 | 类型／范围 | C 侧约定缺口 |
| --- | --- | --- |
| kind | material / fragment / choice / artifact / log / reflection | 适配器按用途选择 |
| text | 非空字符串 | 可读文本可承接；结构化快照编码及读回协议未定 |
| classification | historical_claim / counterfactual / creative / test | 教学创作不能自动标史实 |
| sources | Source[] | Source 的 id/title/url/license 必需，verification 默认 unverified；课程链接和授权不能编造 |
| material_ids | 字符串数组 | 本地 K1/S1/S2/S3 须映射真实 material/fragment 记录 ID，不能混为 Source.id |
| version | 整数，至少 1 | 数字本身不能表达前版与结果版关联 |
| access | 仅 private | 沿用接口限制 |

整个 C 导出对象含 effects、planRecords、schemaVersion、previousPlanRecordId 等额外字段，不能直接提交。响应的 id/voyage_id 也不能用本地 UUID 代替。

当前 records POST 每次生成新 ID，没有 request_id 幂等字段。交易和模型任务的幂等机制不能套用在 records 上。“服务端已落库但响应丢失”后直接重试可能重复写；需 D/后端确认去重和查询机制，仅在收到响应后保存客户端映射不够。

C 的 scenarioVersion/rulesVersion 是字符串 1.0，Voyage.scene_version 是整数；两边 stage 枚举也不同。适配必须显式约定，不能隐式转换，或把 C 场景 ID 当成已注册正式场景。

## 联调验收待办

1. A/B/D 确认共同场景、输入样例、实际引用的材料与尚未解决的分歧；明确确认主体。
2. 适配层校验外部结构并统一转义动态文案。当前情境文案来自受版本控制的静态文件，这一信任条件不能直接迁移到 API 输入。
3. 真正持久化 C 方案、维护观察和反思，重开航程可按真实 ID 恢复；相同选项名不能代替关系 ID。
4. 中断 POST 响应后重试，证明不重复生成 choice/artifact/reflection；错误不能把待判断改为已确认。
5. D 界面实际展示 keep/revise/insufficient、原始理由与剩余代价；证据不足不能当作知识核验成功。
6. E 若接入真实调用，单独验证真实 usage 与剧情储备分账。本原型不发起任务或结算。

以上均未计入 C 独立测试 PASS。
