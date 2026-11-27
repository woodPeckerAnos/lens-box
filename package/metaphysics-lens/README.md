# @lsby/lens-box-metaphysics-lens

基于**大模型结构化提取与本地形而上学剖面诊断**的发言传统形而上学剖析透镜。

## 观察视角

不同于形式化断言结构的逻辑视角或剖析论证支持/攻击关系的论证视角，本透镜把一段发言当作**传统形而上学（亚里士多德—经院哲学传统）断言的载体**来观察，回答三个问题：

1. **发言明确触及了哪些形而上学论题？**（实体/偶性、本质/存在、四因、共相/殊相、潜能/现实、必然/偶然、时间/变化、同一性、一/多）
2. **每个论题下的断言在谈论哪些主体？**（范畴覆盖剖面 + 主体索引）
3. **同一主体上是否存在形而上学张力？**（同一主体同时被必然与偶然、潜能与现实等对峙范畴断言）

职责划分：**LLM 只负责识别发言中显式的形而上学断言并归类**；原文定位、结构校验、剖面统计、主体索引、张力诊断与快照恢复全部由本地确定性代码完成。

## 范畴体系

十九条形而上学范畴按八个论题域归组（`ontology.ts` 中的确定性本体定义）：

| 论题域     | 范畴                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| 实体论     | `substance` 实体 · `accident` 偶性                                                            |
| 本质与存在 | `essence` 本质 · `existence` 存在                                                             |
| 因果论     | `materialCause` 质料因 · `formalCause` 形式因 · `efficientCause` 动力因 · `finalCause` 目的因 |
| 共相问题   | `universal` 共相 · `particular` 殊相                                                          |
| 模态       | `potentiality` 潜能 · `actuality` 现实 · `necessity` 必然 · `contingency` 偶然                |
| 时间与变化 | `time` 时间 · `change` 变化                                                                   |
| 同一性     | `identity` 同一性                                                                             |
| 一与多     | `unity` 一 · `multiplicity` 多                                                                |

## 核心领域概念

- **`MetaphysicalClaim`**：一条被识别出的形而上学断言实体，内聚所属范畴、自然语言重述、**逐字原文依据**（`quote` + `[start, end)` 字符区间）与涉及主体列表，支持关键词匹配与快照导出。
- **`MetaphysicsDocument`**：一次剖析的完整结果，聚合原文、断言列表、来源标签、记录时间与提取来源（模型与提示词版本）；构造时重新校验每条原文依据与原文逐字一致、断言标识全局唯一，并提供：
  - `getCategoryCoverage()`：十九个范畴的完整覆盖剖面（含零计数范畴）；
  - `listSubjects()` / `getClaimsBySubject()`：主体索引（主体按表面形式精确匹配）；
  - `findMultiCategorySubjects()`：被两种及以上范畴断言涉及的“厚重”形而上学对象；
  - `findTensions()`：同一主体上的形而上学张力诊断（必然↔偶然、潜能↔现实、共相↔殊相、一↔多、变化↔同一性）。
- **`MetaphysicsLens`**：无状态对外入口，基于 `@lsby/ai-agent`（接收标准 OpenAI 兼容客户端与模型配置）发起结构化提取并返回 `MetaphysicsDocument`。
- **`buildMetaphysicsDocument`**：纯本地构建函数，将固定提取结果离线构建为 `MetaphysicsDocument`，供测试与自定义提取通道复用。
- **`ontology`**：范畴标签、论题域归组与张力对的确定性定义，全部以全量 `Record` 映射表达，新增范畴时类型系统强制补齐。

## 最小示例

```ts
import OpenAI from 'openai'
import { MetaphysicsLens } from '@lsby/lens-box-metaphysics-lens'

let 透镜 = new MetaphysicsLens({
  openaiClient: new OpenAI({ apiKey: 'ollama', baseURL: 'http://127.0.0.1:11434/v1' }),
  model: 'gpt-oss-20b',
  supportsFunctionCalling: true,
})

let 篇章 = await 透镜.analyze({ text: '……一段形而上学色彩的发言……' })

for (let 断言 of 篇章.getClaims()) {
  断言.getCategory() // 'essence' 等范畴
  断言.getContent() // 自然语言重述
  断言.getSubjects() // 涉及主体
  断言.getEvidence() // 逐字原文依据
}

篇章.getCategoryCoverage() // 范畴覆盖剖面
篇章.findMultiCategorySubjects() // 多范畴主体
篇章.findTensions() // 同一主体上的形而上学张力
```

完整可运行示例见 [demo/basic-demo.ts](demo/basic-demo.ts)。

## 错误语义与副作用

- `analyze()` 会通过网络调用 OpenAI 兼容模型，**可能产生模型费用**；构建、查询、诊断与快照恢复均为纯本地操作。
- 输入为空、模型无法给出有效结构化结果、提取结果引用重复临时标识或重复主体、原文摘录无法按出现序号定位、快照中的依据与原文不一致等场景均**立即抛错**（Fail-Fast），不做静默兜底；网络、限流与中断异常原样向上传播。
- 重复主体在结构化输出的 Schema 校验阶段（`superRefine`）即被拦截并反馈给模型重试修复，进入本地构建的数据必然通过校验。
- 重复调用 `analyze()` 会为相同文本生成新的篇章标识与记录时间；透镜不自动持久化任何结果。
- 快照携带 `snapshotVersion: 1` 与 `provenance`（模型名 + 提示词版本 `METAPHYSICS_PROMPT_VERSION`），便于审计与复现；恢复快照时重新校验全部不变量。

## 适用边界

- **擅长**：演讲、辩论、哲学讨论、书评影评等发言中形而上学立场的提取、论题覆盖剖析、跨发言的主体—范畴检索，以及作为上层解读（由 LLM 完成）的结构化输入。
- **不擅长（有意不做）**：本透镜**不做真伪评判、谬误裁决与立场评分**——张力诊断只描述发言中显式呈现的范畴对峙（同一主体同时被必然与偶然断言不等于发言者犯了逻辑错误），一切进一步解读交由上层调用方按需处理。
- **不擅长**：主体表面形式的同义归并（“张三”与“这个人”被视为不同主体，主体索引按表面形式精确匹配）；对不含形而上学断言的发言会返回空断言列表而非编造结构。
