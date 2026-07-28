# PRD：ChatGPT adapter（第三平台接入）

> 严格套用 `.claude/skills/pc-prd/references/prd-template.md`。Compatibility Checklist 已逐条填，红线项无留空。落地路径与 `docs/prd/claude-ai-adapter.md` 高度同构——ChatGPT 输入框同样是 ProseMirror contenteditable，机制已验证可直接复用。

## Compatibility Checklist（合格门槛——先填这个）

| # | 检查项 | 红线？ | 结论 | 说明 / 改造 |
|---|---|---|---|---|
| 1 | 是否需要付费 LLM / 后端服务 / 收费第三方 API？ | 🔴 | **否 = 通过** | 复用用户在 chatgpt.com 官方网页版的免费额度；adapter 只读草稿/写回输入框，零 LLM 成本。 |
| 2 | 是否需要劫持发送事件 / DOM 重写隐藏内容？ | 🔴 | **否 = 通过** | 沿用 "✨ Enrich" 机制：读草稿 → 匹配世界书 → 写回 contenteditable → **人类自己按 Enter**。 |
| 3 | 是否新增 Chrome 权限？ | 🔴 | **是，仅 host `https://chatgpt.com/*`（视 §7 决定是否一并加 `https://chat.openai.com/*`）；无新增 API 权限** | 见下方「权限过审论证」。不使用 `<all_urls>`；`permissions`（`storage`/`unlimitedStorage`/`tts`）保持不变。 |
| 4 | 是否引入插件自身的网络请求？ | 🔴 | **否 = 通过** | 仍是零自发网络请求。adapter 只操作页面 DOM + 本地 storage。 |
| 5 | 是否分发/托管用户生成内容（UGC）？ | 🔴 | **否 = 通过** | 沿用「暂不做社区」决策，无任何托管/打包/分发。 |
| 6 | 涉及新平台吗？是否要新增/改 `PlatformAdapter`？ | ⚪ | **是** | 本方向核心 = 新增 `chatgptAdapter`。Phase 0 CDP 勘察**已完成**（`docs/chatgpt-dom-notes.md`），selector 清单已产出，可直接动手，无需再勘察。 |
| 7 | 所有用户可见文案是否都走 i18n 字典（en+zh）？ | ⚪ | **是** | 需泛化 Claude.ai 落地时已泛化过的几条 key（当前应该已是平台中性措辞，核实即可，无需再改一遍）；若发现新的写死措辞需修。 |
| 8 | 样式是否遵守 `darkMode: "media"`（不用 `.dark` class）？ | ⚪ | **是** | 新 content script 同样在 shadow root 里，直接复用现有 `getStyle`/`style.css`。 |
| 9 | 新增/膨胀的 storage 字段是否会拖慢整体 JSON 序列化？ | ⚪ | **无新增字段** | 不动 storage 形状，沿用 Claude.ai 落地时确认的"全局共享 AppState"决策（见 §7 Q1，已有先例不重新问）。 |
| 10 | 是否改动已验证过的核心链路（注入/世界书匹配/背景）？ | ⚪ | **否，预期零改动** | Phase 0 勘察结论：ChatGPT 的输入框机制、主题判定、背景可见性都可**直接复用**现有 `dom-inject.ts`/`backgrounds.ts` 的既有分支，不需要像 Claude.ai 落地时那样新增"中和不透明容器"的 seam。仅新增 adapter/content-script 文件本身，核心链路（`world-info.ts`/`persona-message.ts`/`use-persona-enrich.ts`）零改动。 |

### 权限过审论证（Checklist #3 展开）

- **单一用途**：把已有的人设/世界书/背景/TTS/记忆能力扩展到第三个官方免费 LLM 网页版（chatgpt.com），与 DeepSeek/Claude.ai 上的功能完全一致，不引入新能力面。
- **最小化**：只申请 `https://chatgpt.com/*`（+ 视 §7 决定的 `https://chat.openai.com/*`），不使用 `<all_urls>`、不申请 `tabs`/`scripting`/`webRequest` 等广域权限。与现有两个 host 权限同构申请。
- **必要性**：content script 必须注入到 chatgpt.com 页面才能读草稿/写回输入框/贴背景，这是功能的物理前提。
- **落地后动作**：更新 `docs/chrome-web-store-listing.md` 权限说明与商店描述（多平台措辞需再加一个站点名）、`extension-review-report.md` 基线复扫。`PRIVACY.md` 无需改。

### 约束改造史

> **原始想法**：担心 ChatGPT 会跟 DeepSeek 一样，需要专门勘察一套"背景中和 design-token"的方案，或者担心 ChatGPT 有反自动化机制导致注入失败。
> **撞上约束前先做了 Phase 0 勘察**（`docs/chatgpt-dom-notes.md`），结果是**没撞上**：
> - 输入框机制、主题判定、背景可见性都跟 Claude.ai 高度一致甚至更干净（背景从输入框到 body 之间只有 composer 自己的圆角背景不透明，无需覆盖任何 design token）。
> - deep-research 阶段没查到 ChatGPT 有针对浏览器扩展的专门反制机制的证据，真机 DOM 操作全程也没触发任何验证码/异常拦截。
> **改造成**：本 PRD 不必像 Claude.ai PRD 那样预留"背景专属重做"的大块工作和开放问题——直接照抄 Claude.ai 的实现路径即可，把范围收紧成"新增 adapter + content script"，不牵动共享架构。**唯一需要真机验证、而非只信 computed style 的**，是背景视觉叠加效果（Phase 0 只量了 CSS 数值，没贴实际背景图看）和多行文本注入的排版行为——这两项放进验收标准（§6），不是阻塞 PRD 落地的红线。

---

# PRD：ChatGPT adapter

- **状态**：草稿
- **方向来源**：`docs/research/platform3-chatgpt-vs-grok.md`（确认第三平台做 ChatGPT，不改道 Grok）+ Phase 0 DOM 勘察 `docs/chatgpt-dom-notes.md`（已完成）
- **一句话**：给已定路线的第三站 **chatgpt.com** 写一个 `PlatformAdapter` + content script，把现有整套人设/世界书/背景/TTS/记忆能力零成本搬过去，进一步扩大可用平台覆盖面。

## 1. 背景与动机

- persona-chat 当前支持 DeepSeek + Claude.ai。调研确认 ChatGPT 网页版移动端日活约为 Grok 的 20 倍且差距仍在扩大，是当前最大的覆盖面杠杆（`docs/research/platform3-chatgpt-vs-grok.md`）。
- 架构上早已为多平台预留：`PlatformAdapter` 接口 + `REGISTRY`，Enrich/记忆流程全部通过 `getActiveAdapter()` 路由，与具体平台解耦——这是 Claude.ai 落地时验证过的模式，直接复用。
- Phase 0 DOM 勘察（`docs/chatgpt-dom-notes.md`）确认：输入框 `#prompt-textarea`（ProseMirror contenteditable，与 Claude.ai 同一套机制，`execCommand("insertText")` 已验证持久写入）；助手消息 `[data-message-author-role="assistant"]`（语义化 data 属性）；主题判定复用现成的 `body.colorScheme` 读法；背景可见性初判是三平台里最干净的一个。

## 2. 目标 / 非目标

### 目标（本期，可衡量）
1. 在 chatgpt.com 上，激活人设后能一键 Enrich（世界书匹配 + 氛围提醒写回 ProseMirror 输入框，人类按 Enter），效果与 DeepSeek/Claude.ai 一致。
2. 背景预设在 chatgpt.com 正确通铺、按平台主题（深/浅）自适应、不遮盖 ChatGPT 自身可读文字（真机截图验证，不只信 computed style）。
3. TTS「朗读最近一条回复」在 chatgpt.com 能定位到助手消息并朗读。
4. 记忆笔记（📌）在 chatgpt.com 能预填当前草稿并保存。
5. 新增权限仅 `https://chatgpt.com/*`（+ 视情况 `chat.openai.com`），过审复扫无新 CRITICAL/HIGH/MEDIUM；DeepSeek + Claude.ai 全链路真机验证无回归。

### 非目标（防蔓延）
- **不改 DeepSeek/Claude.ai 的功能逻辑**。Phase 0 结论是 ChatGPT 不需要新增"背景中和 seam"，`backgrounds.ts`/`dom-inject.ts` 预期零改动。
- **不做对话级/按平台差异化配置**：继续沿用 Claude.ai 落地时确定的"全局共享 AppState"决策，三平台共享同一份 activePersona/背景/tweaks（不重新问，见 §7）。
- **不做自动发送**（可见注入红线）。
- **不移植 hide-thinking page-tweak 到 ChatGPT**：MVP 沿用 Claude.ai 的处理方式，在 chatgpt.com 上隐藏该开关/Tweaks tab（ChatGPT 的"推理过程"展示 DOM 本轮未勘察，非本期范围）。
- 不做方向 2（记忆）/方向 4（卡片导出）/方向 5 剩余部分（对话级覆盖）——都是后续独立方向。
- 不改商店营销素材本身（截图/文案重拍是相邻的 publish 任务，本 PRD 只在 §5 列出需要联动更新的清单）。

## 3. 用户故事
- 作为一个已经在用 ChatGPT 免费网页版聊天的用户，我想在 chatgpt.com 上也用上我建好的人设和世界书，以便不必为了角色扮演切平台。
- 作为一个看重"人设可移植、不被单一平台绑定"的用户，我想同一套人设在三个官方免费站点都能用。
- 作为审核方，我想看到扩展只多申请一个明确 host、无新网络行为，以便快速确认它仍是最小权限、单一用途。

## 4. 功能需求

- **FR-1（新 adapter）**：新增 `src/lib/adapters/chatgpt.ts`，实现 `PlatformAdapter`（`id`/`findChatInput`/`readDraftText`/`injectText`）。
  - `findChatInput`：`INPUT_SELECTORS` 按"具体→通用"排：`"#prompt-textarea"` → `'div[contenteditable="true"][role="textbox"]'` → `'div[contenteditable="true"]'`；复用 `dom-inject.ts` 的 `isElementUsable`（可见性/尺寸过滤）。
  - `readDraftText`：走 contenteditable 分支，用 `el.innerText`（复用 `readDraftFrom`）。
  - `injectText`：走 contenteditable 分支，**直接复用 `dom-inject.ts` 现成的 `setContentEditableValue`**（全选 + `execCommand("insertText")` + dispatch `input` 事件），失败 → clipboard fallback；`el.focus()`；**不自动发送**。此函数**零改动**——Phase 0 已验证 ChatGPT 的 ProseMirror 用同一套机制即可写入且持久生效。
- **FR-2（注册）**：在 `src/lib/adapters/index.ts` 的 `REGISTRY` 增加 `"chatgpt.com": chatgptAdapter`（视 §7 决定是否一并映射 `"chat.openai.com"` 到同一实例）。`getActiveAdapter()` 逻辑不变。
- **FR-3（新 content script）**：新增 `src/contents/chatgpt.tsx`，镜像 `contents/claude.tsx`：
  - `config.matches`：`["https://chatgpt.com/*"]`（+ 视 §7 一并加 `"https://chat.openai.com/*"`）；`all_frames: false`。
  - `getShadowHostId` 用独立 id（如 `"persona-chat-root-chatgpt"`）。
  - 复用 `PlatformOverlay.tsx` 共享主体（deepseek.tsx/claude.tsx 已经把 content-script 主体抽成薄壳 + `assistantReplySelector` 参数，本次照抄）。
  - `ASSISTANT_REPLY_SELECTOR = '[data-message-author-role="assistant"]'`；保留 MutationObserver 实时跟踪回复在位（Phase 0 未确认消息列表是否虚拟化，按现有模式保守处理）。
- **FR-4（manifest host 权限）**：`package.json` 的 `manifest.host_permissions` 增加对应 host（§7 决定后落地）；`permissions` 不变。
- **FR-5（Enrich 全流程）**：世界书匹配去重、每 6 次 tap 一次氛围提醒、可见拼装、写回后人类按 Enter —— 全部复用 `usePersonaEnrich` + `world-info.ts`，零改动。
- **FR-6（人设激活消息）**：`buildPersonaMessage` 复用，零改动。
- **FR-7（背景）**：`applyBackground`/`detectTheme` 预期**直接复用现有分支，零改动**——Phase 0 确认 `getComputedStyle(document.body).colorScheme` 在 chatgpt.com 报 `"dark"`（与 DeepSeek/Claude 一致），且输入框到 body 之间只有 composer 自身背景不透明、无需中和额外容器。**验收阶段必须真机截图确认实际视觉叠加效果**（Phase 0 只验证了 computed style 数值，不代表视觉上一定干净——沿用"不能只信代码审查，核心链路必须真机验"的项目铁律）。
- **FR-8（page-tweaks 在 ChatGPT 的处理）**：MVP 与 Claude.ai 一致，`hideThinking` 开关/Tweaks 相关项在 chatgpt.com 上隐藏（按 active platform 判定），不误导用户。
- **FR-9（TTS）**：`speak` + TtsPreference 复用；content script 用 `[data-message-author-role="assistant"]` 取"最近一条回复"的 `textContent`。
- **FR-10（记忆笔记）**：MemoryNotePrompt 复用（已通过 `getActiveAdapter()?.readDraftText()` 取草稿，天然适配）。
- **FR-11（i18n 核实）**：Claude.ai 落地时已把"写死 DeepSeek"的几条 key 泛化成平台中性措辞（`enrich.failed`/`popup.activeOn`/`popup.hint`/`tweaks.blurb` 等）。本期核实这些措辞对 ChatGPT 场景仍然通用，若发现遗漏的平台专属写死文案再补。

## 5. 架构映射（给 pc-dev）

| 维度 | 决策 |
|---|---|
| 数据 / storage | **零新增字段、零形状改动**。沿用 Claude.ai 落地时的"全局共享 AppState"决策，三平台共享同一份配置。 |
| 平台 / adapter | **核心改动**：新增 `src/lib/adapters/chatgpt.ts`（`chatgptAdapter`），注册进 `adapters/index.ts` REGISTRY。**完全复用** `dom-inject.ts` 的 `setContentEditableValue`/clipboard fallback/`isElementUsable`——不新增、不修改这个共享文件。 |
| UI 落点 | 新增 content script `src/contents/chatgpt.tsx`（match `chatgpt.com`），复用 `PlatformOverlay.tsx` 共享主体（已在 Claude.ai 落地时抽出）。ModeKey/面板 tab 不变。 |
| 内置内容 | **不动 seed.ts**（人设与平台无关）。 |
| i18n | 不新增功能 key（核实既有泛化措辞仍适用，见 FR-11）。 |
| 复用 | 镜像 `contents/claude.tsx` 的 content-script 骨架（比照 deepseek.tsx 更早的镜像关系，claude.tsx 是更近的参照，两者结构应已趋同）；`world-info.ts`/`persona-message.ts`/`use-persona-enrich.ts`/`use-memory-note.ts`/`backgrounds.ts`/`tts.ts`/`storage-events.ts` 全部纯复用。 |

### 纯复用（零改动）vs 新增 —— 明确边界

**纯复用（不碰一行）**：
- `src/lib/adapters/dom-inject.ts`、`src/lib/use-persona-enrich.ts`、`src/lib/world-info.ts`、`src/lib/persona-message.ts`、`src/lib/tts.ts`、`src/lib/use-memory-note.ts`、`src/lib/storage-events.ts`、`src/lib/backgrounds.ts`、`src/storage.ts`、`src/seed.ts`、整个 i18n 系统、`src/components/PlatformOverlay.tsx`、`PersonaPanel`/`PersonaList`/`FloatingButton`/`MemoryNotePrompt`/`BackgroundPicker`。

**新增**：
- `src/lib/adapters/chatgpt.ts`（新文件，仅 selector 列表 + 复用共享注入原语）。
- `src/contents/chatgpt.tsx`（新文件，薄壳）。
- `adapters/index.ts` REGISTRY 增一行；`package.json` host_permissions 增一行（或两行，视 §7）。

本次**没有**"改动（最小、平台无关或平台条件化）"这一类——这正是 Phase 0 勘察省下的返工：Claude.ai 落地时需要新增"主题探测策略"和"背景中和 seam"，ChatGPT 不需要。

## 6. 验收标准（对应 pc-test 手段）

| # | 验收标准 | 验证方式 |
|---|---|---|
| 1 | `chatgptAdapter` 的 selector 排序/字符串拼装等纯逻辑正确 | A：esbuild 打包到 Node 跑（DOM 部分用最小 stub） |
| 2 | 世界书匹配/拼装（复用逻辑）在 ChatGPT 语境仍正确 | A：Node 断言（复用既有 world-info 测法，无需重跑） |
| 3 | storage 往返（无新字段） | B：options 页 eval，验共享 AppState 不回归 |
| 4 | **chatgpt.com 真机**：人设激活消息注入 ProseMirror、Enrich 写回、TTS 取回复、记忆笔记预填 | C：browser-cdp 真实登录会话（自动化扩展级 E2E，比照 `e2e-verify.sh` 现有两平台模式） |
| 5 | **背景真机视觉确认**：通铺、深浅主题自适应、不遮字——Phase 0 只验证了 computed style，本项必须贴真实截图看 | C：browser-cdp 截图，逐预设看对比度 |
| 6 | **多行文本注入排版**：确认换行行为（是否跟 Claude 一样把单 `\n` 变段落、换行翻倍），若是则记入 dom-notes 作为已知行为，非阻塞缺陷 | C：真机截图 + 读回内容比对 |
| 7 | **DeepSeek + Claude.ai 无回归**：两平台全链路仍正确 | C：browser-cdp 复跑两平台的 `e2e-verify.sh` |
| 8 | tsc / build 干净 | `npx tsc --noEmit` + `pnpm build` |
| 9 | 过审无新风险（仅多一个明确 host） | `Skill(extension-review)` + `Skill(extension-analyze)`，对照基线 |

> CDP 稳定性铁律：验收 4/5/6/7 的多步操作必须**同一次 shell 调用链式执行**、**每步先确认当前 tab URL**；卡死则降级到 A/B + 代码审查并诚实标注。

## 7. 风险 / 未决问题

### 已通过 Phase 0 解决的（不再是开放问题）
- Host、输入框 selector、助手消息 selector、主题判定、背景初判——均已在 `docs/chatgpt-dom-notes.md` 落地确认，不需要 pc-dev 阶段再勘察。

### 仍需验收阶段确认（非阻塞，但要做）
1. **背景视觉实际效果**：Phase 0 只量了 CSS computed style（"只有 composer 自己的背景不透明"），没有贴真实背景图看视觉叠加——需要在验收阶段（§6 #5）用真机截图确认，不能假设 computed style 干净就等于视觉效果好。
2. **多行注入排版**：本轮未测试，需在验收阶段确认（§6 #6），若和 Claude 一样"换行翻倍"，记为已知行为，不算缺陷。
3. **登出态 selector**：Phase 0 用的是已登录账号，未验证未登录/首次访客状态下输入框结构是否不同——若产品要支持未登录用户使用 ChatGPT 免费额度，需要补测；若产品假设用户已登录才有意义使用，此项可不阻塞。

### 需要人类拍板的开放问题
1. **`chat.openai.com` 是否一并支持**：只加 `chatgpt.com` 一个 host，还是历史域名 `chat.openai.com` 也一并覆盖（应对用户可能收藏的老链接）？影响 manifest host_permissions 数量和过审论证的"最小化"表述。
2. **上架范围与营销**：商店 `displayName`/`description` 需要再加一个平台名——是否本轮一并更新商店素材，还是单独 publish 任务（沿用 Claude.ai 落地时的处理方式）？

## 8. 验证结果（研发+测试后回填）

**验证日期**：2026-07-27。研发由子 agent 完成，本节验证由主 agent 独立核实（读 diff + 自跑 tsc/build + 真机复核，未直接采信子 agent 自述）。

**实现**：如 §5 计划，仅新增 `src/lib/adapters/chatgpt.ts`（22 行，selector 列表 + 复用 `dom-inject.ts` 三个共享函数）+ `src/contents/chatgpt.tsx`（27 行，镜像 `claude.tsx`）+ `adapters/index.ts` 加一行 REGISTRY + `package.json` 加一行 host_permissions。`git diff --stat` 确认：`dom-inject.ts`/`backgrounds.ts`/`PageTweaksPanel.tsx`/世界书/i18n 等"不能碰"的文件全部零改动。

| # | 验收标准 | 手段 | 结果 |
|---|---|---|---|
| 1 | selector 排序/字符串拼装逻辑正确 | 代码审查（复用 `dom-inject.ts` 已验证过的共享函数，无新逻辑） | ✅ |
| 2 | 世界书匹配/拼装在 ChatGPT 语境正确 | 真机：alwaysActive 世界书条目 Enrich 后正确前置注入（"📖 Lore check line"） | ✅ |
| 3 | storage 往返（无新字段） | 无新字段，全局 AppState 共享，未回归 | ✅ N/A |
| 4 | **chatgpt.com 真机**：人设激活消息注入、Enrich 写回、记忆笔记入口存在 | browser-cdp 真机（穿透 shadow root，按名称精确定位测试人设，非按位置索引——吸取了 macro/guard 那轮"按钮索引 0 选错人设"的教训） | ✅ **PASS**：`hasName`/`hasGreeting` 均真，发送按钮随文本出现并启用 |
| 5 | **背景真机视觉确认** | browser-cdp A/B 截图对比（A=显式清空背景的真实原生 ChatGPT，纯黑无纹理；B=应用 `bg_slate_focus` 预设）——两张截图差异清晰可见，预设的细线网格+石板蓝渐变正确显示，未被任何不透明容器遮挡 | ✅ **PASS**，印证 Phase 0 §5 的"三平台最干净"初判 |
| 6 | **多行文本注入排版** | 真机读回：源文本 3 行（`\n` 分隔）注入后变成多组空行分隔的段落（`newlineCount:14`）——与 Claude.ai 已知的"单 `\n` 变段落、换行翻倍"行为一致 | ✅ 确认为已知行为，非缺陷，记入 dom-notes |
| 7 | **DeepSeek + Claude.ai 无回归** | browser-cdp 复访两平台，确认 shadow host 正常注入 | ✅ PASS（REGISTRY/manifest 改动是纯增量，两平台自身 adapter/content-script 零改动） |
| 8 | tsc / build 干净 | 子 agent 报告 + 主 agent 独立重跑，均干净；`manifest.json` 核验 `host_permissions` 三项、`content_scripts` 三项、`permissions` 未变 | ✅ |
| 9 | 过审无新风险 | 仅新增一个明确 host（`https://chatgpt.com/*`），无新 API 权限/网络请求；`extension-review` 复扫为待办（非阻塞，权限面极小） | ⚪ 待办 |

**踩坑记录（本轮真机验证过程中）**：
- 面板打开后一度查不到人设列表（`liCount:0`），排查后发现是 `AppState.activeMode` 全局共享、面板默认停在了之前测试遗留的"定制"（tweaks）tab，而不是"角色"tab——不是 adapter 的 bug，是三平台共享全局配置这个既有架构决策（Claude.ai 落地时就定过）的自然结果。验证脚本需要先显式切到"角色" tab 再找人设列表。
- 背景验证第一轮"看起来没变化"是假警报：没有一个明确的"零 persona-chat 背景"基线截图可对比，无法判断截图里那层网格纹理到底是 ChatGPT 原生的还是我们预设自带的。补了一次显式 A（清空背景）/B（应用预设）对比后才看清真实差异。

**待补（非阻塞）**：`extension-review`/`analyze` 复扫（预期仍 PASS，权限面变化极小）；`docs/chrome-web-store-listing.md` 与商店 `description` 多平台措辞更新（§7 开放问题 2）。
