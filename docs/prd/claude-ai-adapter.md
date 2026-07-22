# PRD：Claude.ai adapter（第二平台接入）

> 严格套用 `.claude/skills/pc-prd/references/prd-template.md`。Compatibility Checklist 已逐条填，红线项无留空。

## Compatibility Checklist（合格门槛——先填这个）

| # | 检查项 | 红线？ | 结论 | 说明 / 改造 |
|---|---|---|---|---|
| 1 | 是否需要付费 LLM / 后端服务 / 收费第三方 API？ | 🔴 | **否 = 通过** | 复用用户在 claude.ai 官方网页版的免费额度；本 adapter 只读草稿/写回输入框，零 LLM 成本。 |
| 2 | 是否需要劫持发送事件 / DOM 重写隐藏内容？ | 🔴 | **否 = 通过** | 沿用 "✨ Enrich" 机制：读草稿 → 匹配世界书 → 写回 contenteditable → **人类自己按 Enter**。背景/page-tweaks 是可见 CSS，不隐藏/不改写模型输出。 |
| 3 | 是否新增 Chrome 权限？ | 🔴 | **是，仅 host `https://claude.ai/*`；无新增 API 权限** | 见下方「权限过审论证」。不使用 `<all_urls>`；`permissions`（`storage`/`unlimitedStorage`/`tts`）保持不变。 |
| 4 | 是否引入插件自身的网络请求？ | 🔴 | **否 = 通过** | 仍是零自发网络请求。adapter 只操作页面 DOM + 本地 storage。 |
| 5 | 是否分发/托管用户生成内容（UGC）？ | 🔴 | **否 = 通过** | 沿用「暂不做社区」决策，无任何托管/打包/分发。 |
| 6 | 涉及新平台吗？是否要新增/改 `PlatformAdapter`？ | ⚪ | **是** | 本方向核心 = 新增 `claudeAdapter`。落地前必须先跑 **Phase 0：browser-cdp 对真实登录 claude.ai 勘察 DOM**（见 §7），产出 selector 清单后 adapter 才动手。 |
| 7 | 所有用户可见文案是否都走 i18n 字典（en+zh）？ | ⚪ | **是** | 新增/改动文案双语非机翻。需泛化几条硬编码 "DeepSeek/chat.deepseek.com" 的既有 key（见 §5）。 |
| 8 | 样式是否遵守 `darkMode: "media"`（不用 `.dark` class）？ | ⚪ | **是** | 新 content script 同样在 shadow root 里，直接复用现有 `getStyle`/`style.css`，无需改 `tailwind.config.js`。 |
| 9 | 新增/膨胀的 storage 字段是否会拖慢整体 JSON 序列化？ | ⚪ | **无新增字段** | 不动 storage 形状：`activePersonaId`/`activeBackgroundId`/`pageTweaks`/`tts` 都是既有全局 AppState 字段，跨平台共享。 |
| 10 | 是否改动已验证过的核心链路（注入/世界书匹配/背景）？ | ⚪ | **是（背景/主题探测引入平台无关的 seam）** | 世界书匹配/注入算法零改动；背景仅新增「按平台探测主题 + 中和聊天容器不透明底」的适配点，DeepSeek 行为必须保持逐字节不变，且**重跑 DeepSeek 真机验证**证明无回归（见 §6）。 |

### 权限过审论证（Checklist #3 展开）

- **单一用途**：把已有的人设/世界书/背景/TTS/记忆能力扩展到第二个官方免费 LLM 网页版（claude.ai），与 DeepSeek 上的功能完全一致，属于同一"给 AI 网页版加角色扮演层"用途，不引入新能力面。
- **最小化**：只申请 `https://claude.ai/*` 一个明确 host，**不使用** `<all_urls>`、不申请 `tabs`/`scripting`/`webRequest` 等广域权限。与现有 `https://chat.deepseek.com/*` 是同构申请。
- **必要性**：content script 必须注入到 claude.ai 页面才能读草稿/写回输入框/贴背景，这是功能的物理前提，无法用更窄的权限替代。
- **落地后动作**：更新 `docs/chrome-web-store-listing.md` 权限说明与商店描述（当前描述写死 "for chat.deepseek.com"）、`extension-review-report.md` 基线复扫（当前 0 CRITICAL/HIGH/MEDIUM，15 PASS，须保持）。`PRIVACY.md` 无需改（不新增数据收集）。

### 约束改造史

> **原始想法**：给 claude.ai 直接照搬 DeepSeek 那套（含 `--dsw-alias-*` 背景 design-token 覆盖、`data-testid` 选择器、`.ds-*` 稳定类）。
> **撞上约束**：
> - Claude.ai 输入框是 `contenteditable` 的 ProseMirror `div`，不是 `textarea` —— 不能用 `.value` 读/写，`.value` 路径整个失效。
> - "`data-testid` 是稳定选择器"的说法已被证伪 —— 依赖它会随发版漂移。
> - DeepSeek 的 `--dsw-alias-*` design-token 是 DeepSeek 专属，claude.ai 没有这套变量，背景遮盖的根因/解法都不通用。
> **改造成**：
> - adapter 走 contenteditable 分支（复用 deepseek.ts 里已存在的 `setContentEditableValue` + `execCommand("insertText")` + clipboard fallback），`readDraftText` 用 `innerText`/`textContent`。
> - selector 不碰 `data-testid`，首选 `div[contenteditable="true"].ProseMirror`，列表按"具体→通用"排，且**所有真实 selector 一律以 Phase 0 CDP 勘察为准**，不预设已知。
> - 背景在 claude.ai 单独勘察并重做：确认 `getComputedStyle(body).colorScheme` 是否可用作主题判定，确认是否需要一条 Claude 专属的「中和聊天容器不透明底」CSS 规则（用 `:has()`/变量覆盖，不追 hash 类名）。

---

# PRD：Claude.ai adapter

- **状态**：草稿
- **方向来源**：`docs/research/stage2-opportunities.md` 的方向 1（Claude.ai adapter，评分 23/25，推荐先做）
- **一句话**：给已定路线的下一站 **claude.ai** 写一个 `PlatformAdapter` + content script，把现有整套人设/世界书/背景/TTS/记忆能力零成本搬到第二个官方免费 LLM 网页版，扩大可用平台 = 扩大 TAM。

## 1. 背景与动机

- persona-chat 的定位是"零成本 × 官方免费网页版 × 浏览器插件"的简化版酒馆，当前只吃 chat.deepseek.com 一个平台。多平台是既定 roadmap，也是 reach 的最大杠杆。
- 架构上早已为此预留：`PlatformAdapter` 接口 + `REGISTRY`，且上层 Enrich/记忆流程全部通过 `getActiveAdapter()` 路由，与具体平台解耦（见 §5「纯复用」）。`adapters/index.ts` 注释里也写明"Claude.ai lands here in the next pass"。
- 调研结论（`stage2-opportunities.md` 方向 1，3-0/0-3 对抗式核实）：claude.ai 输入框是 `contenteditable` 的 ProseMirror `div`；`data-testid` 稳定性被证伪。二者都已在本 PRD 的实现约束里落地。

## 2. 目标 / 非目标

### 目标（本期，可衡量）
1. 在 claude.ai 上，激活人设后能一键 Enrich（世界书匹配 + 氛围提醒写回 ProseMirror 输入框，人类按 Enter），效果与 DeepSeek 一致。
2. 背景预设在 claude.ai 正确通铺、按平台主题（深/浅）自适应、不遮盖 Claude 自身可读文字。
3. TTS「朗读最近一条回复」在 claude.ai 能定位到助手消息并朗读。
4. 记忆笔记（📌）在 claude.ai 能预填当前草稿并保存。
5. 新增权限仅 `https://claude.ai/*`，过审复扫无新 CRITICAL/HIGH/MEDIUM；DeepSeek 全链路真机验证无回归。

### 非目标（防蔓延）
- **不改 DeepSeek 的功能逻辑**。仅当为多平台抽象出「平台无关的主题探测/容器中和 seam」时才动 `backgrounds.ts`，且保持 DeepSeek 行为不变（见 §5「重构注意」）。
- **不做对话级/按平台差异化配置**：activePersona/背景/tweaks 继续走全局 AppState，两平台共享同一份（见 §7 开放问题 1）。
- **不做自动发送**（可见注入红线）。
- **不移植 hide-thinking page-tweak 到 Claude**（除非 Phase 0 顺带确认了 Claude 扩展思考块 DOM 且产品要做，见 §7 开放问题 3）；MVP 下 Tweaks tab 在 claude.ai 的处理见 §4 FR-8。
- 不做会话记忆升级（方向 2）、世界书 V3（方向 3）、卡片导出（方向 4）、对话级注入（方向 5）——都是后续独立方向。
- 不改商店营销素材本身（截图/文案重拍是相邻的 publish 任务，本 PRD 只在 §5 列出需要联动更新的清单）。

## 3. 用户故事
- 作为一个已经在用 Claude 免费网页版聊天的用户，我想在 claude.ai 上也用上我在 DeepSeek 建好的人设和世界书，以便不必为了角色扮演切平台。
- 作为一个从 c.ai 出走、看重"人设控制 + 可移植"的用户，我想同一套人设在两个官方免费站点都能用，以便不被单一平台绑定。
- 作为审核方，我想看到扩展只多申请一个明确 host、无新网络行为，以便快速确认它仍是最小权限、单一用途。

## 4. 功能需求

- **FR-1（新 adapter）**：新增 `src/lib/adapters/claude.ts`，实现 `PlatformAdapter`（`id`/`findChatInput`/`readDraftText`/`injectText`）。
  - `findChatInput`：`INPUT_SELECTORS` 按"具体→通用"排，首选 `div[contenteditable="true"].ProseMirror`，兜底 `div[contenteditable="true"][role="textbox"]` → `div[contenteditable="true"]`；**禁止依赖 `data-testid`**；复用 deepseek.ts 的 `isElementUsable`（可见性/尺寸过滤）。
  - `readDraftText`：走 contenteditable 分支，用 `el.innerText`（回退 `textContent`），**不用 `.value`**。
  - `injectText`：走 contenteditable 分支，复用 `setContentEditableValue`（全选 + `execCommand("insertText")`，回退 `textContent`，dispatch 冒泡 `input` 事件让 ProseMirror/React 同步），失败 → clipboard fallback；注入后 `el.focus()`；**不自动发送**。
- **FR-2（注册）**：在 `src/lib/adapters/index.ts` 的 `REGISTRY` 增加 `"claude.ai": claudeAdapter`（若 Phase 0 确认还需 `www.claude.ai` 等，则一并加同一 adapter）。`getActiveAdapter()` 逻辑不变。
- **FR-3（新 content script）**：新增 `src/contents/claude.tsx`，镜像 `contents/deepseek.tsx`：
  - `config.matches: ["https://claude.ai/*"]`（与 Phase 0 确认的 host 一致）；`all_frames: false`。
  - `getShadowHostId` 用独立 id（如 `"persona-chat-root-claude"`）；`getStyle` 复用 `data-text:~/style.css`。
  - 复用 `applyBackground` / `applyPageTweaks` / storage-change 订阅 / Enrich pill / TTS pill / MemoryNotePrompt / PersonaPanel 的整套挂载结构。
  - `ASSISTANT_REPLY_SELECTOR` 换成 Claude 专属选择器（Phase 0 产出）；沿用 MutationObserver 实时跟踪回复在位（若 Phase 0 确认 Claude 消息列表非虚拟化，可简化，但保留 observer 更稳）。
- **FR-4（manifest host 权限）**：`package.json` 的 `manifest.host_permissions` 增加 `"https://claude.ai/*"`；`permissions` 不变。
- **FR-5（Enrich 全流程）**：在 claude.ai 上，Enrich pill 出现条件、世界书匹配去重、每 6 次 tap 一次氛围提醒、可见拼装（📖/🎭 + 用户原文）、写回后人类按 Enter —— 全部复用 `usePersonaEnrich` + `world-info.ts`，零改动。
- **FR-6（人设激活消息）**：`buildPersonaMessage`（含 scenario/exampleDialogue/greeting、按 locale 选语言）复用，零改动。
- **FR-7（背景，Claude 专属重做）**：
  - 背景 apply 机制（`applyBackground` 在 `html, body` 设 `background-image !important`）复用。
  - **主题判定**：确认 `getComputedStyle(document.body).colorScheme` 在 claude.ai 是否报 dark/light；若不可用，`detectTheme()` 需要 Claude 专属信号（Phase 0 确认，如 html 上的 `class`/`data-theme`/`data-mode`）。
  - **遮盖中和**：若 Phase 0 发现 Claude 聊天容器有不透明底把 html/body 背景盖住，需新增一条 Claude 专属 CSS（用 `:has()` 或 CSS 变量覆盖，**不追 hash 类名**）把相关容器背景中和为透明——这是 DeepSeek `--dsw-alias-*` 覆盖的 Claude 版对应物，需单独勘察重做。
- **FR-8（page-tweaks 在 Claude 的处理）**：`hideThinking` 依赖 DeepSeek 专属 `.ds-think-content`，在 claude.ai 无效。MVP：Tweaks tab 在 claude.ai 上**隐藏该开关或整个 tab**（按 active platform 判定），文案不误导用户"作用于当前页面"。（是否为 Claude 扩展思考块补一条规则见 §7 开放问题 3。）
- **FR-9（TTS）**：`speak` + TtsPreference 复用；只需 content script 用 Claude 专属助手消息选择器取"最近一条回复"的 `textContent`。
- **FR-10（记忆笔记）**：MemoryNotePrompt 复用（已通过 `getActiveAdapter()?.readDraftText()` 取草稿，天然适配）。
- **FR-11（i18n 泛化）**：泛化/平台化几条写死 DeepSeek 的可见文案（`enrich.failed`、`popup.activeOn`、`popup.hint`、`tweaks.blurb`、`tweaks.hideThinkingDesc`），en+zh 双语非机翻，避免在 claude.ai 上显示"刷新 DeepSeek / Active on chat.deepseek.com"（见 §5）。
- **FR-12（popup 状态）**：popup 的"active on / hint"文案泛化为不写死单一站点（如"打开支持的站点—Persona 按钮会出现在右下角"），或列出两个支持站点。

## 5. 架构映射（给 pc-dev）

| 维度 | 决策 |
|---|---|
| 数据 / storage | **零新增字段、零形状改动**。activePersona/背景/tweaks/tts 全走既有全局 AppState，两平台共享。不需要新 id 工厂。 |
| 平台 / adapter | **核心改动**：新增 `src/lib/adapters/claude.ts`（`claudeAdapter`），注册进 `adapters/index.ts` REGISTRY 的 `"claude.ai"`。复用 deepseek.ts 的 `setContentEditableValue`/clipboard fallback/`isElementUsable`/"具体→通用" selector 排法。 |
| UI 落点 | 新增 content script `src/contents/claude.tsx`（match `claude.ai`），复用全部现有组件（FloatingButton/PersonaPanel/Enrich pill/TTS pill/MemoryNotePrompt）。ModeKey/面板 tab 不变（Tweaks tab 在 Claude 按 FR-8 处理）。 |
| 内置内容 | **不动 seed.ts**（人设与平台无关）。 |
| i18n | 不新增功能 key；**泛化**既有 5 条写死 DeepSeek 的 key（FR-11）+ popup 2 条（FR-12），en+zh 双语。若引入"平台名"插值，新增一个中性说法而非机翻。 |
| 复用 | 镜像 `contents/deepseek.tsx` 的 content-script 骨架；镜像 `deepseek.ts` 的 contenteditable 注入路径；复用 `world-info.ts`/`persona-message.ts`/`use-persona-enrich.ts`/`use-memory-note.ts`/`backgrounds.ts` 的 preset 与 apply 机制/`tts.ts`/`storage-events.ts`。 |

### 纯复用（零改动）vs 新增/改动 —— 明确边界

**纯复用（不碰一行）**：
- `src/lib/use-persona-enrich.ts` —— 已通过 `getActiveAdapter()`（默认 `window.location.hostname`）路由，平台无关。
- `src/lib/world-info.ts`（`matchWorldInfo`/`composeEnrichedMessage`）、`src/lib/persona-message.ts`（`buildPersonaMessage`）—— 纯逻辑，无 DOM。
- `src/lib/tts.ts`、`src/lib/use-memory-note.ts`、`src/lib/storage-events.ts`、`src/lib/image-resize.ts`、`src/lib/character-card-import.ts`、`src/storage.ts`、`src/seed.ts`、整个 i18n 系统（除被泛化的几条 key）。
- 组件：`PersonaPanel`、`PersonaList`、`FloatingButton`、`MemoryNotePrompt`、`BackgroundPicker`（均在 shadow root，平台无关）。
- 背景 **preset 系统**：`BACKGROUND_PRESETS`、`getSwatchCss`、`compositedImage`、`readingBand`、`render` 的 html/body 写法——纯 CSS 生成，复用。

**新增**：
- `src/lib/adapters/claude.ts`（新文件）。
- `src/contents/claude.tsx`（新文件）。
- `adapters/index.ts` REGISTRY 增一行；`package.json` host_permissions 增一行。

**改动（最小、平台无关或平台条件化）**：
- `src/lib/backgrounds.ts` 的 `detectTheme()`：可能需从"硬编码读 body.colorScheme"改为"平台可注入的主题探测策略"（若 Claude 不报 colorScheme）。**DeepSeek 行为保持逐字节等价**。
- 背景「中和不透明容器」：新增一条 Claude 专属 CSS 规则的挂载点（可放 `backgrounds.ts` 或新 `src/lib/page-surface.ts`），DeepSeek 不受影响。
- `page-tweaks` 在 Claude 的 tab 可见性（FR-8）。
- 被泛化的 i18n 文案（FR-11/12）。
- 需联动更新的过审/营销文件：`docs/chrome-web-store-listing.md`、`extension-review-report.md` 基线、商店 `description`（写死 chat.deepseek.com 处）。

### 重构注意（单一职责下允许的抽象）
把 `detectTheme` 与「聊天容器不透明底中和」做成**平台可注入的策略**，而不是在 `backgrounds.ts` 里堆 `if (host === ...)`。目标是让 DeepSeek 走原有默认分支、行为不变，Claude 提供自己的探测/中和实现。这是为多平台抽象的 adapter 无关代码，符合硬约束④"平台差异靠 adapter 隔离"，不属于"顺手改 DeepSeek 逻辑"。

## 6. 验收标准（对应 pc-test 手段）

| # | 验收标准 | 验证方式 |
|---|---|---|
| 1 | `claudeAdapter.readDraftText`/`injectText` 的字符串拼装、selector 排序等纯逻辑正确 | A：esbuild 打包到 Node 跑（对 DOM 部分用最小 stub） |
| 2 | 世界书匹配去重 + 氛围提醒 + 拼装（复用逻辑）在 Claude 语境仍正确 | A：Node 断言（复用既有 world-info 测法） |
| 3 | storage CRUD/激活人设往返正确（无新字段，验共享 AppState 不回归） | B：options 页 `chrome.storage` eval |
| 4 | **claude.ai 真机**：人设激活消息注入 ProseMirror、Enrich 写回、TTS 取回复、背景通铺+主题自适应+不遮字、记忆笔记预填 | C：browser-cdp 真实登录会话截图（逐项、背景逐预设截图看对比度） |
| 5 | **DeepSeek 无回归**：注入/世界书/背景/主题/tweaks 全链路仍正确 | C：browser-cdp DeepSeek 真机复跑（因动了 backgrounds seam，硬约束 Checklist #10） |
| 6 | tsc / build 干净 | `npx tsc --noEmit` + `pnpm build` |
| 7 | 过审无新风险（仅多一个明确 host、无新网络/API 权限） | `Skill(extension-review)` + `Skill(extension-analyze)`，对照 `extension-review-report.md` 基线 |

> CDP 稳定性铁律：Phase 0 与验收 4/5 的多步操作必须**同一次 shell 调用链式执行**、**每步先确认当前 tab URL**；卡死则降级到 A/B + 代码审查并诚实标注（见 `verification-playbook.md`）。

## 7. 风险 / 未决问题

### Phase 0（前置门）：CDP DOM 勘察 —— adapter 动手前必须完成

用 `browser-cdp` 连**真实登录**的 claude.ai，单次 shell 链式执行（先确认 tab URL），产出一份 selector/事实清单，确认以下 DOM 事实后才写代码：

1. **Host**：实际 hostname 是 `claude.ai` 单一，还是也需 `www.claude.ai`？（决定 REGISTRY key + manifest match + content-script match）
2. **输入框**：确认 `div[contenteditable="true"].ProseMirror` 是否命中；给出最稳的"具体→通用" selector 清单（不含 data-testid）。**实测**：`execCommand("insertText")` 能否真正填入 ProseMirror（不会被拆成异常段落）、`input` 事件后 Claude 的发送按钮是否变为可用（React/ProseMirror 状态同步）、`innerText` 读草稿是否准确。
3. **助手消息容器**：Claude 版的 `.ds-assistant-message-main-content` 对应选择器（供 TTS 取最近回复 + Enrich pill 判断有无回复）；确认消息列表是否虚拟化（决定是否必须 MutationObserver）。
4. **发送区布局**：右下角 FloatingButton/pill 的 `fixed` 定位是否与 Claude 自己的输入区/按钮碰撞；给出安全偏移。
5. **主题判定**：`getComputedStyle(document.body).colorScheme` 在 claude.ai 是否报 "dark"/"light"？若否，稳定的主题信号是什么（html 的 class / `data-theme` / `data-mode` 属性）？
6. **背景可见性**：在 `html, body` 设 `background-image` 是否能透出到 Claude 聊天区背后？若被不透明容器盖住，定位**需中和背景的具体容器**及其 CSS 变量/`:has()` 命中方式（Claude 版 `--dsw-alias-bg-layer-1` 对应物），确认能不追 hash 类名地覆盖。
7. **（可选）扩展思考块 DOM**：若产品要移植 hide-thinking，勘察 Claude 扩展思考块的稳定选择器；否则 MVP 按 FR-8 隐藏开关。
8. **（记录备用）会话 URL 形态**：为后续方向 5 留档，本方向不阻塞。

> 结论落盘：建议新增 `docs/claude-dom-notes.md`（对标 `docs/deepseek-dom-notes.md`），把上述真实 selector/事实写清，adapter 与 content script 以此为唯一依据。

### 其他风险
- **ProseMirror 注入不确定性**：`execCommand("insertText")` 在 ProseMirror 上偶有规范化/拆段行为；靠 clipboard fallback 兜底不崩，但需真机确认主路径可用（验收 4）。
- **selector 漂移**：Claude 前端发版会改 DOM；沿用"加 selector 不改算法"策略，长期靠 `docs/claude-dom-notes.md` 维护。
- **背景遮盖**：若 Claude 容器不透明且难以干净中和（不追 hash 类名的前提下），MVP 可能需降级（Claude 先只上人设+世界书+TTS，背景后补）——见开放问题 2。

### 需要人类拍板的开放问题
1. **共享 vs 按平台配置**：activePersona/背景/tweaks 现为全局单例，Claude 会自动沿用 DeepSeek 当前选择。是否接受"两平台共享一份配置"（MVP 推荐，零 storage 改动），还是要按平台各存一份（需新 storage 键 + 会话/平台维度）？
2. **背景降级策略**：若 Phase 0 发现 Claude 聊天面不透明且无法在不追 hash 类名下干净透出背景，是否接受 Claude MVP **不带背景**（保留人设/世界书/TTS/记忆），背景留下一轮？
3. **page-tweaks（hide-thinking）**：Claude 上是移植一条扩展思考块规则，还是 MVP 直接隐藏该开关/Tweaks tab？
4. **上架范围与营销**：确认只上 `claude.ai`（非 `www.` / 其它子域）；商店 `displayName`/`description`（现写 "for chat.deepseek.com"）需改为多平台措辞——是否本轮一并更新商店素材，还是单独 publish 任务？

## 8. 验证结果（研发+测试后回填）
（pc-test 完成后写这里，或单独 `docs/prd/claude-ai-adapter-verification.md`）
