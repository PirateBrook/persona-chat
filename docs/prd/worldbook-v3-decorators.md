# PRD：世界书 V3 装饰器升级（Worldbook V3 Decorators）

## Compatibility Checklist（合格门槛——先填这个）

> 任何一条红线项答"是/过不了"，就必须把功能改造到能过为止，并在下方"约束改造史"里记录。

| # | 检查项 | 红线？ | 结论 | 说明 / 改造 |
|---|---|---|---|---|
| 1 | 是否需要付费 LLM / 后端服务 / 收费第三方 API？ | 🔴 | **否 = 通过** | 纯本地字符串处理：装饰器解析、匹配、排序、拼装，全部在 content script / options 页内跑，零 LLM 调用。 |
| 2 | 是否需要劫持发送事件 / DOM 重写隐藏内容？ | 🔴 | **否 = 通过（经改造）** | 仍是 Enrich 按钮式（读草稿→写回输入框→人类按 Enter）。关键改造见下方"约束改造史"：`@@depth` **不**做"插入历史第 N 条消息"（那需要劫持/重放请求），改成"单条可见消息内的相对排序"；`@@role` **不**做真实 system/assistant turn（我们只有一个 user 输入框），改成可见的框注标签；`use_regex` **只**用于关键词匹配，**严禁**用于改写模型输出 / 重写显示内容（RisuAI 的 Regex Script / Modify Display 那类会直接撞红线 #2，明确列入非目标）。 |
| 3 | 是否新增 Chrome 权限？ | 🔴 | **无新增 = 通过** | 权限保持 `storage` / `unlimitedStorage` / `tts` / host=`chat.deepseek.com`。本方向不碰 manifest。 |
| 4 | 是否引入插件自身的网络请求？ | 🔴 | **否 = 通过** | 无任何 fetch/XHR。装饰器解析与匹配都是本地纯函数。 |
| 5 | 是否分发/托管用户生成内容（UGC）？ | 🔴 | **否 = 通过** | 世界书数据仍随人设内联存本地；角色卡导入仍是用户主动选文件、只落本地，不分发不托管。 |
| 6 | 涉及新平台吗？是否要新增/改 `PlatformAdapter`？ | ⚪ | 否 | 注入仍走现有 `adapter.injectText()`。不动 adapter 层（Claude.ai 是方向 1）。 |
| 7 | 所有用户可见文案是否都走 i18n 字典（en+zh）？ | ⚪ | 是 | 新增编辑器控件与注入框注标签的文案全部进 `en.ts`/`zh.ts`，key 一致；zh 为人工中文非机翻。不动 `seed.ts`。 |
| 8 | 样式是否遵守 `darkMode: "media"`（不用 `.dark` class）？ | ⚪ | 是 | 新控件只加在 options 页（普通页面），沿用页面既有 `dark:` 变体（media 模式下随系统主题）；不涉及 content script shadow root。 |
| 9 | 新增/膨胀的 storage 字段是否会拖慢整体 JSON 序列化？ | ⚪ | 否 | 新增字段都是小标量（position 短字符串 / depth number / role 短字符串 / bool / order number），每条 lore 增量约几十字节。导入时装饰器行会从 `content` **剥离**并转成结构化字段，content 不增反可能减小。 |
| 10 | 是否改动已验证过的核心链路（注入/世界书匹配/背景）？ | ⚪ | **是——必须重验** | 同时改 `matchWorldInfo` + `composeEnrichedMessage` + `buildPersonaMessage`（世界书匹配 + 两处注入拼装都是已验证核心链路）。验收必须重跑 Node 打包纯函数测试 **和** browser-cdp 真机截图，不能只信代码审查。 |

**约束改造史**（本 PRD 最有价值的部分——同时喂给 memory）：

> **原始想法**：照抄 SillyTavern / Character Card V3 的装饰器语义——`@@depth N` 把 lore 注入到"倒数第 N 条历史消息"处、`@@role system|assistant|user` 让 lore 以对应角色的独立 turn 进入 prompt、`use_regex` 既做关键词匹配也能像 RisuAI Regex Script 那样对模型输出做 find/replace 甚至驱动 HTML 状态面板。
>
> **撞上约束 #2（不劫持发送 / 不 DOM 重写隐藏内容）**：ST 的这些语义全部建立在"前端自己组装整份 prompt（system + N 条带 role 的消息，按 depth 插 lore），再整体发 API"的前提上。persona-chat 没有 prompt 组装权——我们只能往**唯一的输入框**写**一条可见消息**，由人类按 Enter。要真的"插入倒数第 N 条历史"就得劫持/重放请求；要真的产生 system/assistant turn 就得改写会话；要用 regex 改写模型输出就得重写页面 DOM。三者都直接违反红线 #2（也正对应调研开放问题 #2 关于"输出驱动 HTML 面板算不算 DOM 重写"的担忧）。
>
> **改造成**：把 V3 装饰器**重新解释为"我们真正拥有的两个注入锚点"上的本地、可见语义**——
> 1. **两个注入锚点**：(A) 一次性的**激活消息**（`buildPersonaMessage`，含人设/场景/示例）；(B) 每次 tap 的 **Enrich 消息**（`composeEnrichedMessage`，在草稿上方前置 lore）。
> 2. `@@position`（before_desc/after_desc/personality/scenario）指向"角色定义"，而角色定义只在激活消息里出现 → 把**常驻（constant）且带 description 类 position** 的条目折叠进激活消息对应槽位。这是**忠实**映射。
> 3. `constant:true` → 复用现有 `alwaysActive`（导入早已把 `constant` 映射到它）。带 description-position 的常驻条目走激活折叠；无 position 的常驻条目维持现状（每次 Enrich 都注入，如"记忆笔记"）。
> 4. `@@depth N` → **不**插历史，改为**单条 Enrich 消息内部的相对排序**（depth 大 = 离用户真实草稿越远、排越上；depth 0/缺省 = 紧贴草稿）。近似但诚实。
> 5. `@@role` → **不**造 role turn，改为该 lore 块**可见的框注标签**（system→系统旁注框、assistant→标注为角色既定事实、user→普通用户上下文）。真正的多 role turn 语义列为非目标。
> 6. `use_regex:true` → **仅**把关键词当正则匹配草稿（编译失败回退字面量），**绝不**触碰模型输出 / 显示层。
>
> 结果：既能让导入的 V3 角色卡自带 lorebook 更忠实生效，又完全落在"零成本 + 可见注入 + 可过审"的红线内。

---

# PRD：世界书 V3 装饰器升级

- **状态**：草稿
- **方向来源**：`docs/research/stage2-opportunities.md` 的方向 3（世界书 V3 装饰器升级，评分 22/25，纯增强首选、风险最低）
- **一句话**：给深度角色扮演用户和导入社区角色卡的用户，把"纯关键词世界书"升级到 Character Card V3 装饰器模型（`@@position`/`@@depth`/`@@role`/`constant`/`use_regex`），在不违反可见注入红线的前提下让 lore 更可控、让导入卡片更忠实。

## 1. 背景与动机

当前世界书（`world-info.ts`）是"扁平的、不分大小写的子串匹配"：命中任一关键词就把整条 lore 前置到草稿上方。它工作但很粗：

- 无法表达"这条常驻背景应该和人设一起在**开场**就生效"（现在要么关键词碰运气，要么标 `alwaysActive` 但每次 tap 都重复注入）。
- 无法表达"多条命中 lore 谁先谁后、谁更靠近我的问题"。
- 导入的 V3 角色卡里，`character_book` 条目常带 `@@depth`/`@@position`/`@@role`/`use_regex`/`constant` 等装饰器与字段——我们现在**全部丢弃**（`character-card-import.ts` 只取 `keys`/`content`/`enabled`/`constant`），导致作者精心设计的 lorebook 在我们这里退化成一堆无差别关键词条目，保真度低。

调研（`stage2-opportunities.md` 方向 3）确认这些装饰器是 V3 spec 逐条记载、ST/RisuAI 都在用的社区标准，且是本组**兼容性最高、风险最低**的纯本地注入升级。深度用户在意 lore 控制力；提升卡片导入保真度也直接增强"可移植性/生态信任"（与出走潮可接痛点一致）。

## 2. 目标 / 非目标

### 目标（本期 MVP，可衡量）
1. `WorldInfoEntry` 扩展出 V3 装饰器字段（position/depth/role/useRegex/order），且**全部可选**——缺省时行为与今日完全一致（向后兼容）。
2. **常驻 + description-position 条目在激活时折叠进人设消息对应槽位**，普通命中 lore 仍在 Enrich 时按 depth 排序前置。
3. **导入 V3 角色卡时解析 `@@` 装饰器行与 `use_regex`/`insertion_order`/`position`/`constant` 字段**，映射到新字段，装饰器行从 content 剥离。
4. `use_regex:true` 的条目按正则匹配草稿（编译失败安全回退字面量）。
5. options 世界书编辑器新增装饰器控件，**默认折叠在"高级"里**，保持"简化版酒馆"观感——普通用户看到的仍是"关键词 + 内容"两栏。
6. 全部新文案走 i18n（en+zh），不新增权限、不新增网络请求、不改 manifest。

### 非目标（明确不做——防范围蔓延；部分留下一轮或永久排除）
- **`@@role` 的真实 turn 语义**（造独立 system/assistant 消息）——单输入框做不到，MVP 只做可见框注标签。
- **`@@depth` 的字面语义**（插入历史第 N 条消息）——需劫持/重放请求，撞红线 #2，永久排除；MVP 只做"单条消息内相对排序"。
- **其它 V3 装饰器**：`@@scan_depth`、`@@activate_only_after/@@activate_only_every`、`@@keep/dont_activate_after_match`、`@@exclude_keys`/`secondary_keys`/`selective`、`probability`、递归激活（recursion）、`@@is_greeting`、`@@ignore_on_max_context`。留待后续按需增量。
- **对模型输出 / 显示层做 regex find-replace 或驱动 HTML 状态面板**（RisuAI Regex Script / Modify Display）——撞红线 #2，永久排除（对应调研开放问题 #2）。
- **角色卡导出**（把装饰器写回 V2/V3 PNG/JSON）——那是方向 4 的范围，本期不做（但本期字段设计要为将来导出预留结构化数据）。
- **`case_sensitive` 字段**——现有匹配一律不分大小写，保持；不引入大小写开关。
- 若临近发布需要压缩范围，**`use_regex` 是第一个可砍项**（降级为"仅字面量匹配"），其余目标保留。

## 3. 用户故事
- 作为**导入社区 V3 角色卡的用户**，我想让卡片自带 lorebook 里 `@@position before_desc`、`constant:true`、`use_regex:true` 等设置照原意生效，以便角色表现更接近作者设计、而不是退化成一堆关键词。
- 作为**深度角色扮演用户**，我想把一条世界观背景标成"常驻 + 放在人设描述前"，以便它在我激活人设的开场消息里就稳定出现，而不用靠关键词碰运气、也不用每次 Enrich 都重复刷屏。
- 作为**普通轻度用户**，我想继续只填"关键词 + 内容"两栏，以便编辑器不会突然变成密密麻麻的酒馆面板——高级选项对我默认隐藏。
- 作为**同时命中多条 lore 的用户**，我想让更"贴近我这句话"的 lore 排在离草稿更近的位置、背景性 lore 排在更上面，以便注入的顺序更符合阅读与语义直觉。

## 4. 功能需求
逐条编号，尽量原子、可独立验收。

1. **数据模型**：`WorldInfoEntry` 新增可选字段 `position?`、`depth?`、`role?`、`useRegex?`、`order?`；`alwaysActive` 继续作为 V3 `constant` 的等价物（不新增独立 `constant` 字段）。缺省时序列化结果与今日等价（旧数据零迁移）。
2. **正则匹配**：`useRegex:true` 时，每个 key 作为正则（`i` 标志）对**原始大小写草稿**测试；编译抛错则回退为字面量子串匹配。`useRegex` 缺省/false 时行为不变。
3. **激活折叠**：`buildPersonaMessage` 在拼装激活消息时，把该人设中 **`alwaysActive` 且 `position ∈ {before_desc, after_desc, personality, scenario}`** 的条目折叠进对应槽位（before_desc=人设描述前、after_desc/personality=人设描述后、scenario=场景块内/后）。这些条目**不**再在 Enrich 时重复注入。
4. **Enrich 排序**：`composeEnrichedMessage` 接收的命中条目（排除已在激活折叠的那批），按 `depth` 降序（大在上、离草稿远）、同 depth 按 `order` 升序（insertion_order 语义），再依次前置到草稿上方。
5. **Role 框注标签**：注入 lore 块时按 `role` 选择可见前缀/框注（system=系统旁注、assistant=角色既定事实、user/缺省=沿用现有 `📖` 前缀），标签文案走 i18n。纯可见、不产生真实 role turn。
6. **导入解析**：`character-card-import.ts` 的 `mapWorldInfo` 解析每个 `character_book` 条目：
   - 从 `content` 顶部提取 `@@`/`@@@` 装饰器行（`@@depth N`、`@@role system|user|assistant`、`@@position before_desc|after_desc|personality|scenario|at_depth`），解析后从 content 剥离；无法识别的装饰器忽略。
   - 读结构化字段：`constant`→`alwaysActive`（保持）、`use_regex`→`useRegex`、`insertion_order`→`order`、`position`（V2 数值 0=before_char→`before_desc`、1=after_char→`after_desc`；V3 字符串直接采用）。
   - 全部为 best-effort，任一字段缺失/类型不符则留空，不使导入失败。
7. **编辑器控件**：options 世界书每行新增一个默认**折叠**的"高级"区（`<details>`/disclosure），内含：`constant` 开关、`position` 下拉、`depth` 数字、`role` 下拉、`use_regex` 开关。折叠状态下这行仍只显示今日的"关键词 + 内容"。`source:"memory"` 行保持记忆徽标，不展开高级区（它们由记忆流程自动产生）。
8. **保存往返**：`save()` 把高级字段随 `WorldInfoEntry` 一并 upsert；重新打开编辑器能读回。缺省字段不写入（保持存储精简）。
9. **i18n**：新增编辑器与框注标签的 en+zh key（见架构映射），无硬编码字符串。

## 5. 架构映射（给 pc-dev）

| 维度 | 决策 |
|---|---|
| 数据 / storage | 扩展 `src/types.ts` 的 `WorldInfoEntry`：新增可选 `position?: WorldInfoPosition`、`depth?: number`、`role?: WorldInfoRole`、`useRegex?: boolean`、`order?: number`；新增导出类型 `WorldInfoPosition = "before_desc" \| "after_desc" \| "personality" \| "scenario" \| "at_depth"` 与 `WorldInfoRole = "system" \| "user" \| "assistant"`。**复用** `alwaysActive` 作为 `constant`（不加新字段）。不动 `AppState`/`DEFAULT_APP_STATE`，不新增 storage key，不新增 id 工厂（沿用 `makeWorldInfoId()`）。CRUD 完全复用现有 `getPersonaMap/upsertPersona`（世界书内联在 `PersonaCard.worldInfo`）。 |
| 平台 / adapter | 不动。注入仍走 `getActiveAdapter().injectText()`，host 仍 `chat.deepseek.com`。 |
| UI 落点 | `src/options.tsx` 世界书编辑器每行加"高级"折叠区（默认收起）。content script 面板不动（仍是消费面，Enrich 输出自动带上新排序/标签）。 |
| 内置内容 | **不动 `seed.ts`**（无需给内置人设加装饰器；100 个 seed 维持简单）。 |
| i18n | 新增 en+zh key（示例，最终以实现为准）：`worldbook.advanced`、`worldbook.constant`/`worldbook.constantHint`、`worldbook.position`、`worldbook.position.before_desc`/`after_desc`/`personality`/`scenario`/`at_depth`、`worldbook.depth`/`worldbook.depthHint`、`worldbook.role`、`worldbook.role.system`/`user`/`assistant`/`default`、`worldbook.regex`/`worldbook.regexHint`、以及注入框注标签 `worldbook.label.system`/`worldbook.label.assistant`（user/缺省沿用现有 `📖`，不新增）。 |
| 复用 | 匹配/拼装扩展沿用 `world-info.ts` 现有两函数的结构；正则匹配抽一个 `keyMatches(key, draft, useRegex)` 小函数；激活折叠在 `persona-message.ts` 内直接读 `persona.worldInfo`（无需改 `buildPersonaMessage` 签名）；导入解析在 `character-card-import.ts` 的 `mapWorldInfo` 内新增 `parseDecorators(content)` 纯函数。编辑器控件复用现有 `FormField`/`INPUT_CLS_SMALL` 与 `dark:` 样式约定。 |

### 关键改动点（认模式不认行号）
- **`src/types.ts`**：扩 `WorldInfoEntry` + 两个新联合类型，字段写清注释（说明"这些是 V3 装饰器的本地重解释，非 ST 原义"）。
- **`src/lib/world-info.ts`**：
  - `matchWorldInfo`：把 haystack 逻辑改成同时持有原始草稿与小写版；命中判断改走 `keyMatches`（支持 `useRegex`，失败回退字面量）；`alwaysActive` 分支保持。
  - 新增 `splitActivationLore(entries)` / 或在 `composeEnrichedMessage` 前过滤掉"已激活折叠"的条目，避免重复注入。
  - `composeEnrichedMessage`：命中块按 `depth` 降序 + `order` 升序排序后前置；每块前缀按 `role` 选标签。
- **`src/lib/persona-message.ts`**：`buildPersonaMessage` 读 `persona.worldInfo`，把 `alwaysActive && position∈description槽` 的条目插入对应槽位（before_desc 在 personaPrompt 前、after_desc/personality 在其后、scenario 在场景块内/后）。
- **`src/lib/character-card-import.ts`**：`RawCharacterBookEntry` 加 `use_regex`/`insertion_order`/`position`/`extensions`；`mapWorldInfo` 调 `parseDecorators` 剥离 `@@` 行并回填字段。
- **`src/options.tsx`**：每行 `<details>` 高级区 + 5 个控件 + 保存逻辑把新字段并入 `finalWorldInfo`。注意：现有 `importFromFile()`（persona-chat JSON 备份导入）目前只搬 `keys/content/enabled`，需一并透传新字段以免备份往返丢信息。

## 6. 验收标准（对应 pc-test 手段）

| # | 验收标准 | 验证方式 |
|---|---|---|
| 1 | `parseDecorators` 能从 content 顶部正确提取 `@@depth`/`@@role`/`@@position` 并剥离；未知装饰器忽略、非法值留空 | esbuild 打包纯函数到 Node 跑（多组 fixture） |
| 2 | `matchWorldInfo`：`useRegex:true` 走正则、非法正则回退字面量、`alwaysActive` 分支不变；`useRegex` 缺省行为与旧版逐字一致（回归） | Node 打包纯函数 |
| 3 | `composeEnrichedMessage` 按 depth 降序 + order 升序排块，role 标签正确，且排除了激活折叠条目 | Node 打包纯函数 |
| 4 | `buildPersonaMessage` 把 constant+before_desc/after_desc/personality/scenario 条目折叠进正确槽位；无此类条目时输出与旧版逐字一致（回归） | Node 打包纯函数 |
| 5 | 带全套新字段的 `PersonaCard` 经 `upsertPersona`→`getPersona` 往返无损；缺省字段不落盘 | options 页 `chrome.storage` eval |
| 6 | 真机：激活带 before_desc 常驻 lore 的人设→激活消息里可见该 lore 在人设描述前；输入含关键词草稿→Enrich→草稿上方出现按 depth 排序、带 role 标签的可见 lore 块，按 Enter 正常发送渲染 | browser-cdp 真机截图（DeepSeek 登录态） |
| 7 | 真机：导入一张带 `@@`装饰器/`use_regex`/`constant` 的 V3 角色卡→编辑器高级区回显对应字段、content 已剥离装饰器行 | browser-cdp 真机截图 |
| 8 | `npx tsc --noEmit` 与 `pnpm build` 干净 | 构建 |
| 9 | 无新增权限/网络/UGC 分发风险 | extension-review 扫描 |

## 7. 风险 / 未决问题
- **`@@depth` / `@@role` 保真度是"近似"而非等义**：我们把 depth 降为"单消息内排序"、role 降为"可见标签"。风险：熟悉 ST 的用户可能期待原义。缓解：编辑器 hint 文案讲清"这是本地可见近似"；且这两项本就默认折叠。
- **常驻 lore 折叠进激活消息的体积**：一张导入卡若有大量 `constant` 条目，全塞进一次性激活消息可能过长/费 token。未决：是否对折叠进激活消息的条目数/总长度设上限或降级提示。
- **正则安全**：用户/卡片可能写出灾难性回溯的正则。缓解：`try/catch` 编译 + 回退字面量；可选加长度/超时保护（评估是否值得）。是否需要 `case_sensitive` 一并处理——当前决定不做。
- **备份往返**：`options.tsx` 的 JSON 备份导入若不透传新字段，会在"导出→导入"后丢装饰器。需在实现时补上（已列入改动点）。
- **依赖的外部规范**：`@@` 装饰器行的确切语法（`@@` vs `@@@` fallback、大小写、参数格式）以 V3 SPEC 为准，解析器需对真实野卡做 fixture 回归——建议实现阶段先收集 2-3 张真实 chub.ai V3 卡做样本。

## 8. 验证结果（研发+测试后回填）

**状态**：已实现，`tsc --noEmit` 干净、`pnpm build` 干净（2.1s）。

| 手段 | 覆盖 | 结果 |
|---|---|---|
| A · Node 打包纯函数 | matchWorldInfo（关键词/正则/正则失败回退/alwaysActive/alreadyTriggered/激活折叠排除）、composeEnrichedMessage（depth 降序+order 升序、role 标签 en/zh、drift、空输入回归）、buildPersonaMessage（默认结构回归 + before/after/scenario 折叠槽位）、import（`@@depth/@@position/@@role` 解析+剥离、数值 position 0→before_desc / 4→at_depth、use_regex/insertion_order/constant 映射、无装饰器 content 不动） | ✅ 35/35 逻辑通过（探针里 1 条 zh 断言漏写空格属测试误报，代码 en/zh 走同一路径） |
| B · options 页 storage 往返 | 新字段 upsert→get 无损、缺省字段不落盘 | ⏳ 待真机（需 CDP / 扩展页上下文） |
| C · 真机截图（DeepSeek 登录态） | 激活折叠可见、Enrich 排序/role 标签、导入 V3 卡后编辑器高级区回显 | ⏳ 待真机（需用户登录会话 + CDP） |
| — · 过审 | 无新增权限/网络/UGC | ✅ 本方向未碰 manifest / 无网络（沿用基线） |

**回归安全性**：无新字段的旧数据在 matchWorldInfo / buildPersonaMessage 下输出与旧版逐字一致（Node 断言 baseline 已验），`isActivationFolded` 对现存 alwaysActive 记忆条目（无 position）返回 false，故记忆笔记行为不变。
