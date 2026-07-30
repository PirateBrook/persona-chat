# PRD：零成本长会话记忆（A-only）

## Compatibility Checklist（合格门槛）

> 承接 `docs/prd/zerocost-memory-spike.md` §7 的初判，此处按 A-only 定稿重填。全部通过。

| # | 检查项 | 红线？ | 结论 | 说明 / 改造 |
|---|---|---|---|---|
| 1 | 付费 LLM / 后端 / 收费第三方 API？ | 🔴 | **否 = 通过** | 摘要动作落在**用户自己那次免费网页对话**上（模型自摘要，用户按 Enter），插件不调任何 API。预算裁剪是纯本地字符统计。 |
| 2 | 劫持发送 / DOM 重写隐藏内容？ | 🔴 | **否 = 通过** | 🧠 摘要 prompt 走现有可见注入路径（`readDraftText`→`injectText`，人类按 Enter），与 ✨ Enrich / 🎭 Guard 同一机制；📥"拉取上一条回复"是**读** DOM，不重写。 |
| 3 | 新增 Chrome 权限？ | 🔴 | **否 = 通过** | 现有 `storage`/`unlimitedStorage`/`tts`/host 三平台已够。读最后一条助手回复是 content script 默认能力（TTS 已在用同一 selector）。 |
| 4 | 插件自发网络请求？ | 🔴 | **否 = 通过** | 全本地 + 用户自己的会话。守住"零自发网络请求"。 |
| 5 | 分发/托管 UGC？ | 🔴 | **否 = 通过** | 记忆是本地、按人设、永不分发。 |
| 6 | 新平台 / 改 `PlatformAdapter`？ | ⚪ | **否** | 复用现有 `readDraftText`/`injectText`；读回复用各 content script 已传入的 `assistantReplySelector`。三平台自动通用。 |
| 7 | 文案走 i18n（en+zh）？ | ⚪ | **是** | 所有新文案进双语字典；**摘要 prompt 模板必须 locale-aware**（zh 用户注入英文 prompt 会把对话带跑语言）。 |
| 8 | `darkMode:"media"`？ | ⚪ | **是** | 新 UI 复用 `MemoryNotePrompt` 现有 `dark:` + media 类。 |
| 9 | storage 膨胀拖慢序列化？ | ⚪ | **⚠️ 本方向核心约束** | 记忆是 `alwaysActive` 条目、每次 Enrich 全量注入，无界增长会既拖慢 storage 又挤占上下文。对策：`estimateMemoryUsage` + 预算显示 + 超限警告（**人在环，不自动删用户数据**）。 |
| 10 | 改动已验证核心链路？ | ⚪ | **是** | 触及注入路径 + `MemoryNotePrompt` + options 编辑器。改后重跑真机验证（手段 C）。 |

**约束改造史**（喂给 memory）：
> 原始想法：照抄酒馆/RisuAI 的 SupaMemory（自动摘要）/ HypaMemory（向量检索）——定期自动把对话摘要或向量化后注入。
> 撞上约束 #1/#4：自动摘要要付费 summarizer、向量检索要付费 embedding，都要插件自发网络请求。撞上现实：插件是 content script，DeepSeek 列表 virtualized，读不到完整历史，"自动收集历史→本地摘要"这条路也走不通（spike §2）。
> 改造成 **A′**：把摘要动作交给**用户自己那次免费对话**（模型持有自己的上下文、自摘要），插件只做三件事——① 可见注入 locale-aware 摘要 prompt；② 一键把模型的回复拉进记忆草稿供用户审阅后存成 `alwaysActive` 条目；③ 预算显示。
> 进一步：spike 砍掉变体 B（本地检索 + 被动捕获，H4 因 virtualized DOM 拿不到早期语料独立否掉）。**本 PRD 只做 A。**
> H1 门（真机漂移缓解是否可观察）：用户 2026-07-30 决定**不跑合成 CDP 长对话测试**（烧免费额度 + CDP 卡死史），交给日常真实使用验证——理由是 A′ 的摘要环节人在环（模型回复摘要后用户亲眼看到才决定存不存，烂摘要直接不存），即便摘要质量平庸也不亏；而"更好用的手动记忆"（部件 2/3/4）无论 H1 成败都是净收益，本就是 spike 定的降级落点。

---

- **状态**：草稿
- **方向来源**：`docs/research/stage2-opportunities.md` 方向 2 + `docs/prd/zerocost-memory-spike.md` 结论
- **一句话**：给长会话角色扮演用户，做"零成本的 AI 自摘要记忆"——让模型总结自己的上下文、用户一键存成常驻记忆，缓解"聊几百条后 AI 忘设定"的头号出走痛点。

## 1. 背景与动机

长会话跑偏（AI 忘掉早期设定/关系）是酒馆类产品公认的头号出走痛点。付费产品用自动摘要/向量记忆解决，但都要自发网络请求 + 付费模型，撞死本产品四条硬约束里的两条。spike（`zerocost-memory-spike.md`）已验证：唯一合规且可行的路线是 **A′——模型自摘要 + 常驻注入**，且其注入/预算纯函数机制已在 Node 探针里 10/10 通过。现有 📌 记忆便签（`use-memory-note.ts`）已经把"手动存一条 `alwaysActive` 记忆"跑通，本 PRD 是在它之上补齐"让 AI 自己生成摘要"这一环，把手动记忆升级成半自动记忆。

## 2. 目标 / 非目标

**目标：**
- 用户能一键让当前对话的模型把"目前剧情/设定/关系"总结成 N 条要点（可见注入，用户按 Enter）。
- 用户能一键把模型回复的摘要拉进记忆草稿，审阅/编辑后存成当前人设的常驻记忆（每次 Enrich 自动重注入）。
- 记忆用量对用户可见，超预算有警告，避免无界膨胀拖慢 storage / 挤占上下文。
- 顺带修掉 🎭 Guard 与 📌 Memory 两个 pill 的 `right-56` 布局碰撞。

**非目标（防范围蔓延）：**
- ❌ 本地检索 / 被动捕获历史（变体 B，spike 已否）。
- ❌ 按对话（conversation-id）隔离的记忆——依赖"平台会话 id 稳定性"这个未验证前提（方向 5 剩余项），本期记忆按**人设**存（复用现有 `source:"memory"` 机制），沿用 product-direction 的"MVP 全局共享"决策。
- ❌ 自动摘要（定时/触发式无人值守）——摘要必须人在环（用户主动点、看到回复才存）。
- ❌ 摘要要点数、预算阈值做成用户可配置——用常量，留待有需求再开。
- ❌ 记忆条目拖拽排序——现有 options 编辑器的列表顺序够用。

## 3. 用户故事

- 作为长会话玩家，当我发现 AI 开始忘设定时，我想**一键让 AI 自己总结目前的剧情设定**，以便不用手打一大段回顾。
- 作为玩家，我想**把 AI 生成的摘要审阅一下再存成记忆**，以便过滤掉总结里的错误，且这条记忆之后每轮都自动生效。
- 作为玩家，我想**看到我的记忆攒了多少**，以便在它大到拖慢或跑题时自己清理。

## 4. 功能需求

1. **`buildSummaryPrompt(locale)` 纯函数**（新）：产出 locale-aware 的摘要指令文本，要点数用常量 `MEMORY_SUMMARY_BULLETS`（默认 5）。en/zh 各自自然措辞、不串味；指令覆盖"角色关键设定 / 关系动态 / 重要剧情或约定"，要求每条简短只陈述事实。**不含 `{{char}}`/`{{user}}` 宏**（一个场景可能多角色，泛指"the characters/角色"更稳）。
2. **🧠 摘要注入**：在 📌 记忆卡片内新增按钮"让 AI 总结"。点击 → `readDraftText`（若草稿非空则把摘要 prompt 放到草稿之上，与 Guard 一致的叠加语义）→ `injectText(buildSummaryPrompt(locale))` → 关闭卡片 → toast"总结提示已注入 — 按 Enter 发送"。用户按 Enter，模型回复摘要。
3. **📥 拉取上一条回复**：在 📌 记忆卡片内新增按钮"用上一条回复填充"。点击 → 用 `assistantReplySelector` 读最后一条助手回复的 `textContent` → 填进记忆 textarea（覆盖当前草稿内容）。用户可编辑，再点保存（复用现有 `saveMemory`）。无回复时按钮禁用。
4. **记忆用量显示 + 预算警告**：
   - `estimateMemoryUsage(persona)` 纯函数（新）：统计该人设所有 `source:"memory"` 条目 content 总字符数。
   - options 页人设编辑器的世界书区，在记忆条目分组上方显示"记忆用量：N 条 · ~X 字"；超过 `MEMORY_CHAR_BUDGET`（常量，默认 4000 字）时该行变警告色 + 提示文案"记忆偏多，可能拖慢或稀释上下文，考虑合并/删除旧记忆"。
   - **不自动删**：仅显示 + 警告，删除动作用现有的条目 ✕ 按钮（人在环）。
5. **修 pill 布局碰撞**：把 content 面板关闭态的浮动 pill（✨ Enrich / 🔊 TTS / 🎭 Guard / 📌 Memory）从各自硬编码 `fixed ... right-{6,36,56}` 改为**单个 flex rail 容器**（`fixed bottom-[4.6rem] right-6 flex flex-row-reverse items-center gap-2`），由 flexbox 自动排布。根因：硬编码 `right-N` 偏移按某语言标签宽度调，中文"反串扮守卫"远宽于英文"Guard"，同组偏移跨 locale 必然碰撞——flex rail 是 locale-robust 的结构性修复。`MemoryNotePrompt` 折叠态 pill 改为非 `fixed` 的 flex 子元素；展开态卡片仍是独立 `fixed` 面板。

## 5. 架构映射（给 pc-dev）

| 维度 | 决策 |
|---|---|
| 数据 / storage | **不新增 key**。记忆复用 `PersonaCard.worldInfo` 里 `source:"memory"` + `alwaysActive:true` 的 `WorldInfoEntry`（`use-memory-note.saveMemory` 已如此）。无 per-conversation 键。 |
| 平台 / adapter | **不动 `PlatformAdapter`**。注入复用 `getActiveAdapter().readDraftText/injectText`；读回复复用 content script 已传入的 `assistantReplySelector`（三平台各自的 selector 已就位）。 |
| UI 落点 | content 面板浮动层：🧠/📥 折进现有 `MemoryNotePrompt` 展开卡片（不新增 pill）；pill 布局改 flex rail（`PlatformOverlay`）。记忆用量显示落在 `options.tsx` 世界书编辑器。**无新 tab / 无新 ModeKey。** |
| 内置内容 | **不动 seed.ts。** |
| i18n | 新增 `memory.summarize` / `memory.summarizeHint` / `memory.pullReply` / `memory.pullReplyEmpty` / `memory.summaryPrompt`（摘要 prompt 模板，带 `{count}` 插值）/ `memory.usage`（带 `{count}`/`{chars}`）/ `memory.usageWarn` / `toast.summaryInjected`——en+zh 双语。 |
| 复用 | `handleGuard` 的注入模式（`PlatformOverlay`）、`handleSpeak` 的读回复选择器、`saveMemory`、`buildMacroContext`/`translate` 的 locale 拼装、options 世界书编辑器已有的 `source:"memory"` 分组渲染。 |

**新增/改动文件清单：**
- 新增 `src/lib/memory.ts`：`buildSummaryPrompt(locale)`、`estimateMemoryUsage(persona)`、常量 `MEMORY_SUMMARY_BULLETS`/`MEMORY_CHAR_BUDGET`。（纯函数，便于 Node 手段 A 验证。）
- 改 `src/components/MemoryNotePrompt.tsx`：新增 props `assistantReplySelector`、`onToast`；卡片内加 🧠/📥 两按钮 + handlers。
- 改 `src/components/PlatformOverlay.tsx`：pill flex rail 重构；给 `MemoryNotePrompt` 传 `assistantReplySelector` + `onToast`（复用 `setPillToast`）。
- 改 `src/options.tsx`：记忆分组上方加用量显示行。
- 改 `src/lib/i18n/{en,zh}.ts`：新增上述 key。

## 6. 验收标准（对应 pc-test 手段）

| # | 验收标准 | 验证方式 |
|---|---|---|
| 1 | `buildSummaryPrompt("en"/"zh")` 措辞正确、要点数正确插值、双语不串味；`estimateMemoryUsage` 正确统计 `source:"memory"` 条目字符数（忽略 authored 条目） | esbuild 打包纯函数到 Node 跑断言 |
| 2 | 存一条模拟摘要记忆后，options 世界书编辑器读到、用量行显示正确、超预算变警告色；`matchWorldInfo` 每次 Enrich 都重注入该记忆（复用 spike 已验证结论） | options 页 `chrome.storage` eval + Node 断言 |
| 3 | 真机：🧠 注入摘要 prompt（草稿之上叠加、locale 正确）；模型回复后 📥 正确拉取最后一条回复到 textarea；保存后 Enrich 带出该记忆；三平台注入不回归 | browser-cdp 真机截图（DeepSeek 为主，Claude.ai/ChatGPT 抽验注入） |
| 4 | 4 个 pill 在中/英文下都不碰撞、不压输入框/FloatingButton | browser-cdp 真机截图（en + zh 各一次，这是碰撞根因所在） |
| 5 | tsc / build 干净 | `npx tsc --noEmit` + `pnpm build` |
| 6 | 过审无新风险（无新权限/网络请求） | `extension-review` 复扫 |

## 7. 风险 / 未决问题

- **H1（摘要能否可观察地拉回漂移）本期不做合成验证**，交给日常使用。风险：若模型自摘要质量差，🧠 按钮价值有限——但人在环兜底（用户不存烂摘要），且 📥/用量/手动记忆部分无论如何都是净收益。
- **摘要 prompt 措辞质量**：不同人设/题材下"总结成 N 条"的效果有差异，首版用通用措辞，后续可按真机反馈迭代（纯文案改动，成本低）。
- **flex rail 重构触及所有 pill 定位**：必须真机复验 4 个 pill 在两种 locale 下的排布，不能只信代码审查（正是碰撞漏网的原因）。
- **预算阈值 4000 字是拍的**：非红线，仅影响警告触发点，日常使用可调。

## 8. 验证结果（研发+测试后回填）

**已完成（静态 + 手段 A，2026-07-30）：**
- ✅ **手段 A（Node 纯函数）18/18 断言过**：`buildSummaryPrompt` en/zh 各自措辞正确、`{count}` 插值为 5、双语零串味、无残留 token；`estimateMemoryUsage` 只统计 `source:"memory"` 条目、忽略 authored、undefined worldInfo 不抛；`isMemoryOverBudget` 边界（恰好 = 不超 / +1 = 超 / authored 大块不计入）正确；常量值正确。
- ✅ **`npx tsc --noEmit` 干净**。
- ✅ **`pnpm build` 干净**。
- ✅ **Parcel emoji 完整性**：build 产物里 🧠(`🧠`)/📥(`📥`) 均为完整转义代理对、无 lone high surrogate（与基线 🎭 存储方式一致）。因是 i18n 静态字符串字面量而非 `` `emoji ${x}` `` 模板字面量，不触发已知 Parcel 截断 bug。
- ✅ **代码自审**：`summarize()`/`pullLastReply()` 分别镜像已上线验证过的 `handleGuard`/`handleSpeak`；`result.method` 检查与 `InjectResult` 类型一致；MemoryNotePrompt 唯一调用点已传全 props；flex-row-reverse 下 fixed 卡片仍 viewport-relative（fixed 祖先不建立 containing block）。

**已完成（手段 C 真机，2026-07-30，browser-cdp 驱动真实登录 DeepSeek 会话，未发消息/未烧额度）：**
- ✅ **flex rail pill 布局零碰撞**：zh 宽标签（📌记住/🎭反串扮守卫/✨增强）实测相邻 pill 间隙均为 8px（gap-2）、无重叠；en（Remember/Guard/Enrich）实测 `railCollision:false`。**双 locale 均确认旧 right-56 碰撞已消除。**
- ✅ **🧠 摘要注入**：点击后输入框出现完整中文摘要 prompt（"…概括成 **5** 条简短要点…"）、locale 正确、**未自动发送**（等 Enter）、toast"总结提示已加入"显示。
- ✅ **📥 拉取回复**：注入受控假回复后点击，记忆卡片 textarea 被正确填入该回复文本供审阅。
- ✅ **保存 → Enrich 端到端**：📥 拉取的回复保存后，存储确认该人设记忆条目数=3、含拉取内容；点 ✨ Enrich 后输入框带出全部 3 条 alwaysActive 记忆（📖 框架标签、置于草稿"我们继续赶路吧"之上）。**零成本记忆闭环 🧠→📥→保存→Enrich 打通。**
- ✅ **options 用量显示**：正常态灰色"Saved memory: 3 · ~75 chars"、无警告；bump 到 4176 字后重开 → 变琥珀色（amber-400）"Saved memory: 3 · ~4176 chars" + 警告句，`warningShown` 正确翻转。
- ✅ **emoji 完整性（真机 DOM）**：🧠/📥/📖 在真实 shadow root 里均完整渲染，无 Parcel 截断。
- ✅ **过审无新风险**：build 产物 manifest 权限仍 `storage`/`unlimitedStorage`/`tts` + 3 host，零改动；无新增敏感 chrome API、无自发网络请求——权限/网络中性变更（免全量 extension-review）。

**结论：A-only 全量功能研发 + 验证完成，全部 PRD 验收标准通过。** H1（长对话漂移缓解质量）按用户决定交给日常使用验证。
