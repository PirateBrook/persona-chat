# Spike 计划：零成本长会话记忆（Stage 2 方向 2）

- **状态**：spike 草案（**不是 PRD**——本方向卡在一个可行性门上，spike 通过后才写全量 PRD）
- **方向来源**：`docs/research/stage2-opportunities.md` 方向 2 + 开放问题第 1 条
- **一句话**：在**完全不花钱**（不调任何付费摘要 / embedding 模型）前提下，验证能否让长会话召回"明显变好"到足以缓解"聊几百条后 AI 忘设定"的头号出走痛点；达不到就诚实降级成"更好用的手动记忆"。
- **现状基础**：`src/lib/use-memory-note.ts` + `src/components/MemoryNotePrompt.tsx`——用户手动 📌 一条笔记，存成 `alwaysActive: true` 的 `WorldInfoEntry`，靠 `world-info.ts` 的 `matchWorldInfo` 的 alwaysActive 分支每次 Enrich 无条件重注入。这个 spike 是在它之上升级。

---

## 0. 术语先钉死：两条合规变体

RisuAI 的 HypaMemory（向量检索）+ SupaMemory（自动摘要）都需要付费 embedding / summarizer LLM，**违反零成本红线，不照抄**。只剩两条：

- **变体 A（人在环 · human-in-loop）**：用户 / 助手手动生成或确认摘要，插件负责收集要点、提供一键编辑、并在 Enrich 时把摘要作为 `alwaysActive` 常驻注入。
  - **关键子形态 A′（本 spike 的主力假设）**：用**用户自己那次免费 DeepSeek 对话**去总结它自己的上下文——注入一句"把目前的剧情/设定/人物关系压成 N 条要点"，用户按 Enter，模型回一段摘要，插件提供"把这条回复存成记忆"一键按钮。**摘要成本落在用户的免费额度上，不是我们调 API**——这恰好绕开了"我们读不到完整历史"（见 §2），因为**模型自己就持有它的上下文**，哪怕我们读不到 DOM。
- **变体 B（本地启发式 / 关键词检索）**：不调任何模型，用纯本地算法（关键词 / TF-IDF / 规则）从捕获到的历史片段里检索与当前草稿相关的内容，Enrich 时注入。

**两条都不调付费模型**（Compatibility Checklist §7 逐条论证）。红线边界：一旦我们自己去调任何摘要 / embedding API（哪怕"免费额度"），或打包一个会联网的本地 embedding 模型，就立刻触红线——见 §7。

---

## 1. 要验证的假设（明确、可证伪）

| # | 假设 | 归属 | 证伪条件（一句话） |
|---|---|---|---|
| H1 | **仅靠"模型自摘要 + 常驻注入"（A′），能让 200+ 条对话后角色设定/剧情不明显跑偏**——即注入一条滚动摘要后，模型能把已遗忘的设定/关系拉回。 | A′ | 真机长对话里，注入摘要**前后**回复对"关键设定"的遵守没有可观察差异，或摘要本身丢失了关键设定。 |
| H2 | **常驻摘要不会因为无限增长而自己撑爆上下文**——在合理的滚动/预算策略下，记忆 blob 能长期稳定在一个 token 预算内，且不明显拖慢 storage 序列化。 | A′ | 多轮摘要后记忆 blob 无界增长，或 blob 大到每次 Enrich 注入把当前有效上下文挤没、或存储读写肉眼变慢。 |
| H3 | **纯本地关键词/TF-IDF 检索，能在真实 RP 叙事文本上以可用精度召回"当初确立某设定的那条历史消息"**。 | B | 在人工标注的 RP transcript 上，top-k 检索命中"确立消息"的 precision/recall 低到"注入的多是噪声"（判据见 §4）。 |
| H4 | **我们能从 DeepSeek 页面被动捕获到一个"够用"的历史语料**去喂 B 的检索。 | B（也影响"自动收集摘要"的野心） | §2 的真机探针显示我们只能拿到极薄的尾部、且无法可靠回填，语料不足以检索。 |

> H1/H2 决定 A 是否值得做全量；H3/H4 决定 B 是否值得做（或直接砍掉）。**H1 是本 spike 的头号问题。**

---

## 2. 我们到底能拿到多少上下文（正面回答，这决定 A/B 可行性）

persona-chat **不拥有对话**——它是注入到 `chat.deepseek.com` 的 content script（`src/contents/deepseek.tsx`），没有任何对话 API 可调（调了就触红线 §7-#4）。能读到的只有 DOM，而 DOM 有硬限制（依据 `docs/deepseek-dom-notes.md` 实测）：

1. **消息列表是 virtualized（`ds-virtual-list`）**：任一时刻只有 `.ds-virtual-list-visible-items` 下的**可见行**在 DOM 里，滚走的行被 unmount。`document.querySelectorAll('.ds-assistant-message-main-content')` **不会**返回整段对话——现有代码（`deepseek.tsx` 的 `MutationObserver` + TTS 的"读最后一条回复"）已经建立在这个事实上。
2. **助手回复有稳定 hook**：`.ds-assistant-message-main-content`（`ds-*` 设计系统类，跨部署稳定）。**用户消息没有**——只有哈希类，只能靠结构规则（"不含 `.ds-markdown` 后代的那个 visible-items 子行"）近似，脆弱。
3. **可以随时间累积，但不能回溯**：`MutationObserver` 能在消息**流式挂载**时把文本捕获进我们自己的 store，所以能**边聊边攒**一份增长中的 transcript。但——
   - 装插件**之前**、或本次页面加载**之前**的消息，除非用户**手动向上滚动**触发挂载，否则拿不到。
   - 打开一个已有长对话时，DeepSeek 只渲染**尾部**最近几条，越早的越要滚动才挂载。所以"新载入一个长对话"我们**起步只有尾巴**。
   - 程序化自动滚动去回填 = 又卡又 janky，且靠近"操纵页面"的观感，不做。

**诚实结论**：
- 我们能拿到的是**"从插件在场那一刻起、going-forward 的对话"**（外加用户碰巧滚到的旧消息），**不是完整历史**。
- 这个事实**直接判了两件事**：
  - ❌ **"自动收集完整历史→本地摘要"这条朴素路线不可行**（拿不到完整历史，且本地摘要还得调模型 = 触红线）。
  - ⚠️ **变体 B 的语料先天偏薄**（H4 存疑）：会话早期没什么可检索，等攒够了、遗忘问题往往已发生。
  - ✅ **变体 A′ 恰好绕开这个限制**：它不要求**我们**读历史，而是让**已经持有上下文的模型**去摘要。我们只需要读**最后一条助手回复**（`.ds-assistant-message-main-content`，已在 TTS 路径 `handleSpeak` 里读过），把它一键存成记忆。这就是 A′ 是主力假设的根本原因。
- **附带限制（要在 H1 里诚实说明）**：模型的上下文窗口也有限——"总结目前为止"只能覆盖**还在模型窗口里**的内容。所以 A′ 必须是**周期性 / 滚动**摘要（窗口溢出前就摘一次），一次性"结尾才摘"会漏掉早期。

---

## 3. 实验设计（用 `pc-test` 的三条手段）

> 手段回顾：A=esbuild 打包纯函数到 Node 跑；B=options 页 `chrome.storage` eval 验存储往返；C=browser-cdp 真机截图。CDP 铁律：多步在**同一次** shell 调用里链式跑，卡死就降级。

### 实验 0（前置，最先做）：上下文可拿量真机探针 — 手段 C
回答 §2 里的数字，是 H4 的直接证据、也是 B 的门。**同一次 CDP 链式调用**里：
1. 确认当前 tab URL 落在 `chat.deepseek.com` 的某个已有长对话；
2. eval：`document.querySelectorAll('.ds-assistant-message-main-content').length`（静止时可见助手条数）；再数 `.ds-virtual-list-visible-items` 子行总数；
3. eval 脚本模拟向上滚动（`scrollTop = 0` 分几步）并在每步后重数，观察 `MutationObserver` 视角下能累积多少条；
4. eval 读 `location.pathname` / `location.href`，确认 DeepSeek 会话 id 是否稳定可作为"按对话键"（研究开放问题 #4）；
5. 截图存 scratchpad。
- **卡死降级**：CDP 反复卡死 → 退到"代码审查 + `deepseek-dom-notes.md` 既有实测结论"，诚实标注为降级验证。

### 实验 A（主力）：模型自摘要 + 常驻注入 能否缓解漂移 — 手段 C 为主 + 手段 A 打底

**手段 A（Node，先跑、可自动、秒级）验纯函数**：
- 新建 `scratchpad/probe-memory.ts`，import 真实纯函数，喂样例断言打印：
  1. **摘要 prompt 拼装**（新函数，locale-aware，镜像 `buildPersonaMessage`）：给定 locale + 目标要点数，产出正确的双语指令文本（en/zh 不串味）。
  2. **记忆注入 & 去重**：把"存下来的摘要"作为 `alwaysActive` entry 喂 `matchWorldInfo`，断言它每次都触发（alwaysActive 分支）、且不因 `alreadyTriggered` 被吞；`composeEnrichedMessage` 输出可读、带 📖 分隔、摘要在草稿之上。
  3. **预算数学（H2）**：写一个"记忆 blob 字符数 → 估算 token"的简单估算 + 滚动裁剪函数，断言多轮摘要后 blob 稳定在预算内（如 ≤ ~800 tokens）。

**手段 C（真机，回答 H1）**：`browser-cdp` 连真实登录会话，**同一次链式调用**里：
1. 选一个内置人设，激活，注入人设（复用现有 Enrich/adapter 路径）；
2. 手动/脚本喂一段**刻意制造漂移**的长对话（几十~上百轮，或直接打开一个已长到开始跑偏的旧对话）；
3. 注入"总结目前剧情/设定/人物关系为 N 条要点"的摘要 prompt，按 Enter，等模型回复；
4. eval 读最后一条助手回复（`.ds-assistant-message-main-content`），存成 `alwaysActive` 记忆 entry（复用 `useMemoryNote.saveMemory` 逻辑）；
5. 继续对话，在**注入摘要记忆前 vs 后**各问一个"考设定"的问题（如"我的角色的核心动机是什么？我们上次约定了什么？"），**截图对比**模型是否把已漂移的设定拉回；
6. 反复几轮，观察记忆 blob 增长与 H2。
- **判读是定性的**（对齐 pc-test 对背景"是否显眼"的定性判读传统）：看截图里"设定遵守"有没有可观察改善。

### 实验 B（次要、可先跑离线 fail-fast）：本地检索质量 — 手段 A 为主

**这是 B 最便宜的证伪点，完全离线、可重复、不需要 CDP / 真机 / 登录态**：
1. 准备一段**真实风格的 RP transcript 语料**（人工写或从一次真跑里导出，~150–300 条短消息），人工标注若干"设定确立消息"（如"角色 X 是盲人""禁忌是不能提到火"）以及对应的"后续应触发查询草稿"。
2. `scratchpad/probe-retrieval.ts`：实现候选检索器（先 TF-IDF，再退化到纯关键词 / 规则做对照），import 后喂语料 + 查询，打印 **top-k 命中标注消息的 precision/recall/MRR**。
3. 若 TF-IDF 明显不行，试极简增强（同义词表、角色名加权、否定词规则），记录能否越过 §4 的判据线。
- **不需要手段 C**：B 的死因大概率是"RP 叙事 prose 上词面重合噪声太大"，这在 Node 里就能看清；只有 B 的离线数字过线、且实验 0 证明语料够，才值得进一步搭捕获。

### 实验（存储往返，若要验捕获/记忆 CRUD）— 手段 B
若实验 A/B 需要把捕获 transcript 或记忆 entry 落盘验证：在 `chrome-extension://<id>/options.html` 上下文 eval 写一条模拟记忆 entry / 一段模拟 transcript 进 `personas`（记忆挂在 persona 的 `worldInfo`）或新 storage key，验下游 options 编辑器列表 / Enrich 读到。**别测 content script 里的 `chrome.storage`**（受限易 stale）。

---

## 4. 成功 / 失败判据 + 决策门

### 变体 A（主力）
| 判据 | 通过（→ 值得写全量 PRD） | 失败（→ 降级） |
|---|---|---|
| H1 漂移缓解 | 真机截图能**可观察地**看到：注入滚动摘要后，模型对已漂移设定/关系的遵守明显回正（多轮复现，非偶然） | 注入前后无可观察差异，或摘要本身漏掉关键设定 |
| H2 预算 | 滚动/裁剪策略下记忆 blob 长期稳定 ≤ 预算（如 ~800 tokens），storage 读写无肉眼变慢 | blob 无界增长 / 把有效上下文挤没 / 序列化肉眼变慢 |
| UX 成本 | "触发摘要→确认→存"这套循环用户愿意周期性做（≤2 次点击 + 1 次发送） | 循环太重、太频繁，用户不会用 |

### 变体 B
| 判据 | 通过 | 失败 |
|---|---|---|
| H3 检索质量 | 离线标注集上 top-3 召回"确立消息" **recall ≥ ~0.6 且 precision 不至于让注入多是噪声**（具体阈值在实验里定，先要"明显优于随机/纯最近 k 条"） | 检索多为噪声、不优于"直接注入最近 k 条"这种平凡基线 |
| H4 语料 | 实验 0 证明能被动攒到够检索的语料 | 只能拿到极薄尾部、无法回填 |

### 决策门（总）
- **A 过 & B 过** → 写全量 PRD：A 为主线（模型自摘要记忆），B 作为可选补充（本地检索旧消息）。
- **A 过 & B 不过** → 写全量 PRD，**只做 A**，明确砍掉本地检索与被动捕获（省掉最重、最脆的部分）。**这是当前最可能的结果（见返回给你的倾向判断）。**
- **A 不过** → **不承诺自动记忆**，降级成"**更好用的手动记忆**"：多条记忆管理、一键编辑/排序/启停、预算显示、更顺手的 📌 采集——即把现有 `use-memory-note` 打磨好，而不是画一个做不到的自动记忆饼。
- **全不过** → 本方向退回 backlog，Stage 2 优先做方向 1（Claude.ai adapter）/方向 3（世界书 V3）这类确定性高的。

---

## 5. 最小验证要搭什么（尽量小，只为验证，不是产品）

**只搭"验证脚手架"，不进产品代码库主干**（除非确要真机跑，见下）：

1. **`scratchpad/probe-memory.ts`**（实验 A 的手段 A）：import `matchWorldInfo` / `composeEnrichedMessage`（现成）+ 两个**新写的候选纯函数**——`buildSummaryPrompt(locale, bulletCount)`（镜像 `buildPersonaMessage` 的 locale-aware 拼装）、`clampMemoryBudget(entries, budget)`（滚动裁剪）。断言打印。
2. **`scratchpad/probe-retrieval.ts`**（实验 B 的手段 A）：候选 TF-IDF/关键词检索器 + 标注语料 + precision/recall 打印。**纯离线，最便宜的 fail-fast。**
3. **真机最小改动（仅实验 0 + A 的手段 C 需要）**：现有 `deepseek.tsx` 已能读最后一条助手回复（TTS）、已有 📌 记忆按钮。真机跑摘要循环时，可**手工在 CDP eval 里**串起"读最后回复→存 alwaysActive entry"，**先不必改产品代码**——用现有 `saveMemory` 的逻辑等价物在 eval 里跑通即可验 H1。只有 spike 通过、进全量 PRD 才动 `src/`。
4. **标注语料**（实验 B）：`scratchpad/rp-transcript.json` + 标注，手写或从一次真跑导出。

> 不搭：被动捕获 pipeline、新 storage key、options 记忆管理 UI、conversation-id 键——这些是**全量**的东西，spike 阶段只用 eval / Node 验证其前提假设。

---

## 6. 若 spike 通过：全量功能草图（简要，指向 `pc-prd/references/prd-template.md` 的结构）

> 只在决策门判"值得做全量"后展开成正式 PRD。下面是骨架，对齐 prd-template 的"架构映射"表。

- **功能需求（草）**：①"🧠 更新记忆"按钮——注入 locale-aware 摘要 prompt（用户按 Enter，可见注入）②模型回复后弹"存为记忆"——读 `.ds-assistant-message-main-content` 最后一条 → 存 `alwaysActive` entry ③记忆管理面板（options 或 panel tab）——列表/编辑/排序/启停/**预算显示** ④滚动预算裁剪——超预算时提示用户合并/淘汰旧摘要（人在环，不自动丢）。（B 若过：⑤被动捕获 + 本地检索作为可选增强。）
- **架构映射（草）**：
  | 维度 | 决策 |
  |---|---|
  | 数据 / storage | 复用 `PersonaCard.worldInfo` 的 `alwaysActive`+`source:"memory"`（已存在）；若做多条记忆管理，考虑给 memory entry 加可选 `order` / `pinnedAt`。**警惕大字段序列化成本**（见 §7-#9），记忆 blob 要有预算上限。若做"按对话"而非"按人设"记忆，则需新 storage（按会话 id 键）——依赖实验 0 的会话 id 稳定性结论。 |
  | 平台 / adapter | DeepSeek only；读回复的 selector 是 DeepSeek 专属，Claude.ai 版记忆要各自的回复 selector（未来）。`PlatformAdapter` 可能要加一个 `readLastAssistantReply()`。 |
  | UI 落点 | content 面板新按钮/pill（📌 旁边）+ options 或 panel 的记忆管理 tab（复用 `ModeKey` 或世界书编辑器分组，`source:"memory"` 已用于分组渲染）。 |
  | 内置内容 | 不动 seed（或加一条"记忆用法"引导，双语）。 |
  | i18n | 新增 `memory.summarize` / `memory.saveReply` / `memory.budget` 等 key，**双语**；摘要 prompt 模板 locale-aware（禁硬编码英文）。 |
  | 复用 | 镜像 `use-memory-note.saveMemory`、`buildPersonaMessage` 的 locale 拼装、`matchWorldInfo` 的 alwaysActive 分支、TTS 的"读最后回复"选择器、storage map-CRUD 镜像。 |
- **验收标准**：纯函数（摘要拼装/预算裁剪/检索）→ 手段 A；记忆 CRUD 往返 → 手段 B；真机摘要循环+注入+漂移回正 → 手段 C；tsc/build 干净；过审复扫无新风险。

---

## 7. Compatibility Checklist 初判（先填红线）

> A、B 两变体的初判。**任何一旦引入"我们自己调摘要/embedding 模型"就触红线**——本表末尾标出边界。

| # | 检查项 | 红线？ | 初判结论 | 说明 |
|---|---|---|---|---|
| 1 | 需要付费 LLM / 后端 / 收费第三方 API？ | 🔴 | **否 = 通过（A/B 皆是）** | A′ 的摘要落在**用户自己的免费 DeepSeek 额度**上（等同用户发任何一条消息），**不是我们调 API**；B 是纯本地算法（TF-IDF/关键词），无模型。**边界见表末。** |
| 2 | 劫持发送 / DOM 重写隐藏内容？ | 🔴 | **否 = 通过** | 摘要 prompt 走现有可见 Enrich 路径（用户按 Enter）；"读最后一条回复存记忆"是**读**不是重写，无隐藏 DOM。 |
| 3 | 新增 Chrome 权限？ | 🔴 | **否 = 通过** | 现有 `storage`/`unlimitedStorage`/`tts`/host=`chat.deepseek.com` 已够。读 DOM 是 content script 默认能力；不需要 `scripting`/`tabs`。 |
| 4 | 引入插件自身的网络请求？ | 🔴 | **否 = 通过** | 全本地 + 用户自己的 DeepSeek 会话。**边界见表末。** |
| 5 | 分发/托管 UGC？ | 🔴 | **否 = 通过** | 记忆是本地、按用户、永不分发。 |
| 6 | 新平台 / 改 `PlatformAdapter`？ | ⚪ | spike 只 DeepSeek | 未来 adapter 可能加 `readLastAssistantReply()`；Claude.ai 需各自回复 selector。 |
| 7 | 文案走 i18n（en+zh）？ | ⚪ | 是 | 所有新文案进双语字典；**摘要 prompt 模板必须 locale-aware**（镜像 `buildPersonaMessage`），否则 zh 用户 DeepSeek 会被英文 prompt 带跑语言。 |
| 8 | 遵守 `darkMode:"media"`？ | ⚪ | 是 | 新 UI 在 shadow root，用 `dark:` + media（现有 `MemoryNotePrompt` 已如此）。 |
| 9 | 新增/膨胀 storage 拖慢 JSON 序列化？ | ⚪ | **⚠️ 本方向的真实约束** | 常驻记忆 blob + （B 的）捕获 transcript 正是 `image-resize.ts` 注释警告的"大字符串拖慢整体读写"。必须：记忆 blob 设 token/字符预算 + 滚动裁剪；捕获（若做）设条数上限/滚动窗口。H2 就是在验这条。 |
| 10 | 改动已验证核心链路（注入/世界书匹配/背景）？ | ⚪ | **是** | 触及 Enrich / `matchWorldInfo` / 注入路径，并新增 DOM 读取。改了必须重跑真机验证（手段 C），不能只信代码审查。 |

**🚧 触红线的边界（务必标出）**：以下任何一个都会把 #1/#4 从"通过"翻成"触红线"，是本方向绝对不能越的线——
- 我们自己去调**任何**摘要 / 概括 / embedding API（包括标榜"免费额度"的第三方，包括 DeepSeek 官方 API key）——**只有"让用户在自己的网页对话里让模型自摘要"才合规**，因为那用的是用户的额度、经用户可见发送。
- 打包一个会**联网**的本地 embedding / 模型去做检索或摘要（触 #4）。纯离线的 TF-IDF/关键词（无权重下载、无网络）不触线。
- 把捕获的 transcript 或记忆**上传/同步到任何服务器**（触 #4/#5）。

**约束改造史**（喂给 memory）：
> 原始想法：照抄酒馆/RisuAI——定期把对话自动摘要（SupaMemory）或向量检索（HypaMemory）后再注入。
> 撞上约束 #1/#4：自动摘要要付费 summarizer、向量检索要付费 embedding，都要我们自发网络请求 → 触零成本红线 + 零自发网络请求红线。
> 撞上现实约束（§2）：就算想本地摘要，我们是 content script、对话 virtualized、读不到完整历史，"自动收集历史"这条朴素路线也走不通。
> 改造成：**A′——把摘要动作交给用户自己那次免费 DeepSeek 对话（模型自持上下文、自摘要），插件只做"注入摘要 prompt（可见）+ 一键把回复存成 alwaysActive 记忆 + 预算管理"**；本地检索（B）降为"纯离线关键词/TF-IDF、无网络、可选补充"，且要先过离线质量门。

---

## 附：本 spike 的结论（2026-07-22 跑完回填）

**已跑**：离线 Node 探针（实验 B 检索 + 实验 A 的手段A：摘要 prompt locale / 预算裁剪 / 注入机制）。**未跑**：实验 0 的新 CDP 探针（直接引用 `deepseek-dom-notes.md` 既有实测）、实验 A 的手段C（H1 真机漂移验证——需往用户账号发消息，未擅自做）。

- **实验 0（上下文可拿量）**：引用 `deepseek-dom-notes.md` 实测——列表 virtualized、只拿尾部、用户消息无稳定类、无法可靠回填。结论：只能拿到"插件在场后 going-forward"的薄语料。
- **实验 A（H2 + 机制）✅ 扎实通过**：`clampMemoryBudget` 滚动裁剪让记忆 blob 稳定 ≤ 预算（800 char 样例）、保留最新丢最旧；`buildSummaryPrompt` 双语不串味、bullet 数正确插值；把摘要存成 `alwaysActive` 记忆后 `matchWorldInfo` 每次都重注入（不被 `alreadyTriggered` 吞）、`composeEnrichedMessage` 正确置于草稿之上。10/10 断言过。**注入+预算机制就绪，复用已验证代码。**
- **实验 A（H1 漂移缓解）⏳ 未测**：这是头号问题，需真机长对话（往用户账号发消息让模型自摘要再观察设定是否回正）。本轮未做（不擅自动用户额度/账号）。**是唯一真正的决策门。**
- **实验 B（H3/H4）❌ 判负**：
  - H3：离线探针标称 recall@3=0.83（语义 0.67），但**这是 12 条玩具语料的灌水**——top-3 覆盖 25% 语料、语义命中含噪声巧合。计划要求 150-300 条真实语料，放大后语义鸿沟查询 recall 会崩。**不算真通过。**
  - H4：**独立死因**——virtualized DOM 只给尾部、无法回填，早期设定（正是会被遗忘的）根本没进可检索语料。**无论 H3 如何，B 都该砍。**

- **决策门落点 → "A-only 全量 PRD，但门控在 H1 真机验证之前"**：砍掉变体 B（本地检索 + 被动捕获——最重最脆的部分，H4 独立否掉）。变体 A′ 的注入/预算机制已就绪，但**在做一次 H1 真机长对话验证（确认模型自摘要+常驻注入能可观察地把漂移拉回）之前，不写全量 PRD**。H1 过 → 写 A-only 全量 PRD；H1 不过 → 降级成"更好用的手动记忆"（打磨现有 `use-memory-note`：多条管理/编辑/排序/启停/预算显示）。

**给人类的下一步**：H1 需要一次真机长对话验证。两条路：①你自己在一个已跑长/开始跑偏的 DeepSeek 或 Claude 对话里，手动发"把目前剧情/设定压成 5 条要点"、把回复记下来、之后再问考设定的问题看是否回正；或②授权我用 CDP 在你账号上跑一次有限的验证（会发几条消息、耗一点你的免费额度）。在 H1 出结果前，方向2 停在这个门上（本就是 roadmap 最后一项）。
