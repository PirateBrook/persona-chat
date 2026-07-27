# Compatibility Checklist（合格门槛——先填这个）

| # | 检查项 | 红线？ | 结论 | 说明 / 改造 |
|---|---|---|---|---|
| 1 | 是否需要付费 LLM / 后端服务 / 收费第三方 API？ | 🔴 | **否 = 通过** | 纯字符串替换 + 一次注入动作，零调用任何模型/服务 |
| 2 | 是否需要劫持发送事件 / DOM 重写隐藏内容？ | 🔴 | **否 = 通过** | 反串扮守卫复用现有 Enrich 机制（读草稿→写回输入框→人类按 Enter）；宏展开只发生在我们自己拼装的可见文本里，不碰发送事件、不隐藏任何 DOM |
| 3 | 是否新增 Chrome 权限？ | 🔴 | **否 = 通过** | 零新增权限。现有 `storage`/`unlimitedStorage`/`tts` + host 权限已够 |
| 4 | 是否引入插件自身的网络请求？ | 🔴 | **否 = 通过** | 全本地字符串处理 |
| 5 | 是否分发/托管用户生成内容（UGC）？ | 🔴 | **否 = 通过** | 宏展开只处理用户自己已导入的卡片文本，不涉及分发 |
| 6 | 涉及新平台吗？是否要新增/改 `PlatformAdapter`？ | ⚪ | **否，接口不变** | 反串扮守卫复用现有 `adapter.readDraftText()`/`adapter.injectText()`，宏展开是纯字符串层，与平台无关——DeepSeek + Claude.ai 自动同时生效，不改一行 adapter 代码 |
| 7 | 所有用户可见文案是否都走 i18n 字典（en+zh）？ | ⚪ | 是 | 新增 key 见下方架构映射，人工撰写非机翻 |
| 8 | 样式是否遵守 `darkMode: "media"`（不用 `.dark` class）？ | ⚪ | 是 | 新按钮/输入框复用 shadow root 内现有 `dark:` + media 写法（参照 `FloatingButton.tsx`/`PageTweaksPanel.tsx`） |
| 9 | 新增/膨胀的 storage 字段是否会拖慢整体 JSON 序列化？ | ⚪ | **否，影响可忽略** | 仅 `AppState` 新增一个可选短字符串字段 `userName`，无大字段 |
| 10 | 是否改动已验证过的核心链路（注入/世界书匹配/背景）？ | ⚪ | **是，触及** | 宏展开插入 `buildPersonaMessage`（激活消息）和 `composeEnrichedMessage`（Enrich 世界书/漂移提醒）两条已验证链路的拼装步骤；反串扮守卫新增一条与 Enrich 平行的注入动作。**改了必须在 DeepSeek + Claude.ai 上重跑 browser-cdp 真机验证**，不能只信代码审查 |

**约束改造史**：
> 原始想法（来自调研方向 5）：反串扮守卫 + 宏/变量模板 + 按对话覆盖人设/example/system 片段，三件套一起做。
> 撞上"别把多个功能塞进一个 PRD"的踩坑教训 + 按对话覆盖依赖一个**未验证的前提**：当前代码库里没有任何地方读取 `location.pathname`/会话 id（grep 全库为零命中），它是否稳定可取完全没验过；且要落地就得新增"按会话 id 键"的 storage 形态，架构分量明显重于另外两个纯函数级改动。
> 改造成：**本 PRD 只做反串扮守卫 + 宏展开**（两个都是零 storage 新增/一个轻量字段、零 adapter 改动的"快赢"）；**按对话覆盖单独留到下一轮**，先排一次轻量 CDP 勘察验证 DeepSeek/Claude.ai 会话 id 稳定性，验证过了再单独立项写 PRD。

---

# PRD：宏展开 + 反串扮守卫（对话级注入控制 · 第一批）

- **状态**：草稿
- **方向来源**：`docs/research/stage2-opportunities.md` 方向 5（评分 22/25，"全场性价比最高的小赢"）
- **一句话**：给角色扮演用户提供两个轻量注入控制——① 一键注入"不要替我说话/行动"的反串扮提醒；② 让人设文本里的 `{{char}}`/`{{user}}`/`{{random:...}}` 宏在注入时正确展开，而不是原样显示给用户看。

## 1. 背景与动机

- **反串扮**是调研中反复出现的具名出走痛点（c.ai 用户抱怨"AI 替我的人设说话"，有专门教程绕过），且是纯 prompt 层面能解决的问题——一句清晰的提醒语放进注入文本即可，不需要任何新机制。
- **宏展开不只是"锦上添花"，是在修一个已经存在的可见 bug**：SillyTavern/chub.ai 格式的角色卡（`character_book` lorebook、`description`、`first_mes` 等字段）几乎普遍使用 `{{char}}`/`{{user}}` 占位符——这是 ST 卡片格式的行业惯例。当前 `character-card-import.ts` 把这些字段原样存进 `PersonaCard`，`buildPersonaMessage`/`composeEnrichedMessage` 也原样拼进注入消息——**任何用户导入一张标准 ST/chub.ai 卡，只要卡片作者用了这个惯例写法，注入到聊天框里的文本就会出现字面的 `{{char}}`/`{{user}}` 字符串**，这是当下就存在、只是还没人抱怨过的可见质量问题。做宏展开等于同时交付"新功能"和"修复一个已导入卡片的潜在缺陷"。
- 两者都是纯字符串处理，零 storage 新架构、零 adapter 改动，风险极低，适合作为 Stage 2 这轮的快赢开局。

## 2. 目标 / 非目标

**目标**：
- 人设文本（`personaPrompt`/`scenario`/`exampleDialogue`/`greeting`/世界书 `content`/`driftReminder`）里的 `{{char}}`、`{{user}}`、`{{random:a,b,c}}` 在注入到聊天框前被正确展开。
- 用户可以一键在草稿上方注入一条"不要替我说话/行动"的反串扮提醒，注入后仍由用户自己按 Enter 发送。
- `{{user}}` 的展开值可选，全局设置一次，不设置时有合理的双语兜底，不需要任何配置就能正确工作。

**非目标（本期不做，留到下一轮）**：
- **按对话覆盖人设/example/system 片段**（方向 5 的第三个子功能）——依赖"平台会话 id 是否稳定可取"这一未验证前提，且需要新的按会话 id 键的 storage 形态，分量明显重于本期两项。留待下一轮先做轻量 CDP 勘察。
- 反串扮提醒文案的用户自定义——本期是固定的双语模板（含宏），不进人设编辑器；若评审后用户明确要自定义再加。
- `{{roll:1d6}}`/`{{time}}`/`{{date}}` 等其他 SillyTavern 宏——本期只做已验证有真实价值的三个（char/user/random）。
- 反串扮守卫的"每次 Enrich 自动带上"模式——本期是用户主动点击的一次性动作（"一键注入"），不做成常驻/周期性注入（那是 `driftReminder` 已有的模式，两者语义不同，不合并）。

## 3. 用户故事

- 作为一个导入了 SillyTavern/chub.ai 角色卡的用户，我希望卡片里的 `{{char}}`/`{{user}}` 占位符能自动变成真实的角色名和我的称呼，而不是原样显示一堆花括号。
- 作为一个正在角色扮演、发现 AI 开始替我说话/替我做动作的用户，我想一键在输入框里加一句提醒，而不用每次手打这段话。
- 作为一个希望被称呼为特定名字（而非泛用的"User"）的用户，我想在设置里填一次我的名字，之后所有人设的 `{{user}}` 都用这个名字。

## 4. 功能需求

1. 新增纯函数 `expandMacros(text: string, ctx: { charName: string; userName: string }): string`（新文件 `src/lib/macros.ts`）：
   - `{{char}}` → `ctx.charName`
   - `{{user}}` → `ctx.userName`
   - `{{random:opt1,opt2,opt3}}` → 从逗号分隔的选项里随机挑一个（每项 trim）；只有一项或选项为空时退化为原样返回该项内容
   - 任何未识别的 `{{xxx}}` token 原样保留，不报错、不吞内容（导入卡片里可能存在我们不支持的宏，必须优雅忽略）
   - **正则必须是线性时间**（用 `[^}]*` 这类字符集量词，禁止嵌套量词），不能重蹈本项目此前 `@@use_regex` 因 ReDoS 被砍掉的覆辙——本函数处理的是用户导入的 UGC 文本，必须假设内容可能是刻意或无意构造的病态输入。
2. `buildPersonaMessage`（`persona-message.ts`）在拼入 `personaPrompt`/`scenario`/`exampleDialogue`/`greeting`/折叠的常驻世界书文本前，各自过一遍 `expandMacros`。
3. `composeEnrichedMessage`（`world-info.ts`）在拼入匹配到的世界书条目 `content` 和 `driftReminder` 前，各自过一遍 `expandMacros`。
4. `AppState` 新增可选字段 `userName?: string`；`options.tsx` 语言选择器旁新增一个文本输入（全局设置，非人设级别）。留空时，宏展开使用 locale-aware 兜底值（en: "User" / zh: "用户"）——不需要任何配置即可正确工作。
5. 新增"🎭 反串扮守卫"按钮（`PlatformOverlay.tsx`，与现有"✨ 增强"pill 同一排）：点击时读当前草稿 → 用 `expandMacros` 展开固定的双语提醒模板 → 以提醒文本 + 空行 + 原草稿的形式写回输入框（复用 `adapter.injectText`）→ 用户仍需自己按 Enter。仅在存在 `activePersona` 时可用（同 Enrich pill 的既有可见性约束），不要求 `canEnrich`（不依赖世界书/漂移提醒是否配置）。
6. 反串扮守卫是**一次性动作**，不落库、不加 `PersonaCard` 字段、不与 Enrich 的世界书匹配/漂移提醒计数器交织——每次点击都是独立的注入，互不影响触发状态。

## 5. 架构映射（给 pc-dev）

| 维度 | 决策 |
|---|---|
| 数据 / storage | `AppState` 新增可选字段 `userName?: string`，走现有 `setAppState` patch 机制，无新 storage key。不新增 `PersonaCard`/`WorldInfoEntry` 字段。 |
| 平台 / adapter | 不改 `PlatformAdapter` 接口、不改任何 adapter 文件。反串扮守卫复用 `getActiveAdapter()` 已有的 `readDraftText`/`injectText`；宏展开是纯字符串函数，平台无关。 |
| UI 落点 | ① 反串扮守卫按钮：`PlatformOverlay.tsx`，与"✨ 增强"pill 同排新增一个按钮，`!!activePersona && !open` 时可见。② `userName` 设置：`options.tsx` 顶部全局设置区（语言选择器旁），一个文本输入 + label。不新增 `ModeKey` tab。 |
| 内置内容 | 不动 `seed.ts`（已确认 100+ 个内置人设文案里没有 `{{char}}`/`{{user}}` 字面 token，宏展开对它们是纯 no-op，不影响现有内置人设的呈现）。 |
| i18n | 新增 key（en/zh 各一份，人工撰写）：`guard.button`（按钮文案）、`guard.reminder`（反串扮提醒模板，正文含 `{{char}}`/`{{user}}` token）、`macro.user.default`（`{{user}}` 兜底值 "User"/"用户"）、`options.userName`（设置项 label）、`options.userNamePlaceholder`（输入框 placeholder）。 |
| 复用 | 镜像 `driftReminder` 在 `composeEnrichedMessage` 里"🎭 前缀 + 参与排序"的既有模式（但反串扮守卫走独立的一次性注入路径，不进 `matchWorldInfo`/`composeEnrichedMessage` 的匹配循环）；镜像 `AppState.language` 的读写模式新增 `userName` 的 get/set；`expandMacros` 内部用 `translate(locale, key)` 做 locale-aware 兜底，参照 `persona-message.ts` 现有的 `t(...)` 用法。 |

## 6. 验收标准（对应 pc-test 手段）

| # | 验收标准 | 验证方式 |
|---|---|---|
| 1 | `expandMacros` 对 `{{char}}`/`{{user}}`/`{{random:a,b,c}}`、未识别 token、空输入、连续多个宏、`{{random:only-one}}` 退化的展开行为均正确 | esbuild 打包到 Node 跑断言 |
| 2 | `expandMacros` 面对刻意构造的重复 `{{`/嵌套花括号等病态输入不发生 ReDoS（跑一个较长 pathological 输入，计时验证是毫秒级线性，不是指数级卡死） | esbuild 打包到 Node 跑计时断言 |
| 3 | `buildPersonaMessage`/`composeEnrichedMessage` 的输出里，含 token 的文本被正确替换，不含 token 的原文本（含全部内置人设文案）不受任何影响 | esbuild 打包到 Node 跑断言 |
| 4 | `AppState.userName` 读写往返正确；未设置时全局兜底值按 locale 生效（en/zh 各测一次） | options 页 `chrome.storage` eval |
| 5 | 真机：导入一张带 `{{char}}`/`{{user}}` token 的 SillyTavern 测试卡，激活人设，确认激活消息与 Enrich 消息里 token 已展开为真实人设名/User（或自定义 `userName`） | browser-cdp 真机截图，DeepSeek + Claude.ai 各一次 |
| 6 | 真机：点击"反串扮守卫"按钮，草稿被正确改写为提醒文案 + 原草稿，未自动发送，用户可自行编辑后按 Enter | browser-cdp 真机截图 |
| 7 | `tsc`/`pnpm build` 干净 | `pnpm build` |
| 8 | 过审无新风险（零新增权限，零新增网络请求） | `extension-review` 复扫 |

## 7. 风险 / 未决问题

- **内置 seed 文案兼容性**：已 grep 确认 `seed.ts` 中零处使用 `{{char}}`/`{{user}}` 字面 token，宏展开对现有 101 个内置人设是 no-op，风险低，但 dev 阶段仍建议抽查几个跑一遍确认。
- **反串扮固定提醒文案的适用性**：默认模板假设人设是"第一人称对话角色"，可能不完全适合旁白/非对话类人设（如"你是一本会说话的书"这类）。评审时需确认默认文案措辞是否要更中性，或者是否需要允许后续隐藏该按钮（本期不做，先看实际反馈）。
- **`{{user}}` 兜底值选择**：选"User"/"用户"（名词，作主语语法一致，如 "User is a knight..."）而非"you"/"你"（代词，在非对话上下文里主谓一致会别扭，如 "You is a knight" 明显不通）。评审时确认这个取舍，若希望更自然可再讨论是否需要区分"提醒句"（宜用第二人称"you"）和"叙事句"（宜用专名）两种展开值——本期先用同一个值，观察真实使用场景再决定要不要拆。
- **改动触及已验证核心链路**（`buildPersonaMessage`/`composeEnrichedMessage`）：必须在 DeepSeek 和 Claude.ai 两个平台都重跑 browser-cdp 真机验证，不能只靠 Node 断言 + 代码审查就判定通过。

## 8. 验证结果（研发+测试后回填）

**验证日期**：2026-07-27

| # | 验收标准 | 手段 | 结果 |
|---|---|---|---|
| 1 | `expandMacros` 展开行为正确（含边界情况） | A（Node 断言） | ✅ `{{char}}`/`{{user}}`/`{{random:...}}`/未识别 token/单选项退化，10/10 断言通过 |
| 2 | `expandMacros` 不发生 ReDoS | A（Node 计时） | ✅ 40000 字符病态输入 1ms 线性完成 |
| 3 | 宏展开输出正确、不含 token 的原文本不受影响 | A（Node 断言） | ✅ 另确认 `$&`/`$$` 等 `String.replace` 特殊模式字符在人设名/用户名中不破坏替换（function replacer） |
| 4 | `AppState.userName` 存储读写往返正确 | B（options 页 `chrome.storage` eval） | ✅ `userNameRoundTrip`/`activePersonaIdRoundTrip`/`personaStored` 全部为真 |
| 5 | 真机：导入含 `{{char}}`/`{{user}}` token 的人设，激活消息/Enrich 消息里 token 正确展开 | C（browser-cdp 真机，穿透 shadow root 驱动真实扩展） | ✅ DeepSeek + Claude.ai 各一次：`hasLiteralTokens:false`、`hasCharName:true`、`hasUserName:true`、`hasRandomPick:true` |
| 6 | 真机：反串扮守卫按钮正确改写草稿、未自动发送 | C（browser-cdp 真机） | ✅ DeepSeek + Claude.ai 各一次：守卫文案正确前置于已有草稿之上，草稿在两平台均未被自动发送 |
| 7 | `tsc`/`pnpm build` 干净 | 直接跑命令 | ✅ |
| 8 | 过审无新风险 | 检查 manifest | ✅ `permissions`/`host_permissions` 与改动前完全一致（零新增），未触发需要 `extension-review` 复扫的条件（新权限/网络/manifest 改动均为否） |

**⚠️ 真机验证中发现并修复的 bug（超出本 PRD 原定范围，但由本 PRD 的真机测试发现）**：

生产 build（Plasmo/Parcel）在编译"裸 emoji 字符紧跟模板字面量 `${...}` 插值"这种写法时，会把该 emoji 截断成只剩高位代理项（lone high surrogate），丢失低位代理项——例如源码 `` `🎭 ${x}` `` 编译后变成字符串常量 `"\ud83c "`（缺少 `\udfad`），运行时注入进聊天框会是一个格式错误、不完整的 UTF-16 字符。逐字节核对 `build/chrome-mv3-prod/*.js` 确认：
- 本 PRD 新增的反串扮守卫按钮（`PlatformOverlay.tsx` 的 `handleGuard`，2 处）——**新引入的实例**
- **Stage 2 已上线的既有代码**也受影响，且从未被发现：`world-info.ts` 的 `driftReminder` 前缀（composeEnrichedMessage）、`PersonaList.tsx` 的"📌 已固定"/"🕒 最近使用"分组标题——这两处在本 PRD 之前就存在，说明这个 build 工具 bug 在 Stage 2 的真机验证里被漏掉了（可能是因为肉眼看一个残缺的代理项字符不明显，或者当时的验证没有细到逐字符检查）。

**根因**：确认是模板字面量语法本身触发的编译问题（`` `<emoji> ${...}` `` 这个具体形状），不是任何一处业务逻辑的错误——source 文件里的 emoji 字符本身是干净的（逐字节核对过），Node 环境下用真实的 `buildMacroContext`/`expandMacros`/`translate` 纯函数组装出的字符串也是完全正确的合法代理对；只有经过 Plasmo 生产 build 之后的产物才会出现这个截断。

**修复**：把这 4 处从模板字面量改成普通字符串拼接（`"🎭 " + x` 而非 `` `🎭 ${x}` ``），重新 build 后逐字节核对 `build/chrome-mv3-prod/deepseek.*.js`，确认 4 处全部输出完整、合法的代理对（如 `"🎭 "+o`），修复后重新跑真机验证全部通过（见上表 #5/#6 的 `startsWithGuardEmojiCodePoint:true`/`startsWithBookEmojiCodePoint:true`）。

**给 pc-dev/未来迭代的教训**：往 Enrich/守卫这类要注入到聊天框的可见文本里加 emoji 前缀时，**不要**用 `` `<emoji> ${expr}` `` 这个模板字面量形状，改用 `"<emoji> " + expr` 拼接；真机验证 UI 文案时，除了肉眼看截图，对含 emoji 的注入文本建议加一次 `codePointAt(0)` 级别的断言（本次就是靠这个断言、而非肉眼看渲染，才抓到的）。
