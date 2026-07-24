# persona-chat Stage 2 机会简报

- **调研日期**：2026-07-22
- **焦点**：竞品线（酒馆前端 / 角色卡社区 / 通用 LLM 网页插件）+ 平台线（官方网页版变化 / Claude.ai DOM）+ 用户痛点线（逃离 c.ai/JanitorAI 的理由）
- **方法**：deep-research 5 角度并行 → 20 源 → 87 条声明 → 25 条对抗式核实（20 确认 / 5 证伪）
- **主要来源**：SillyTavern 1.14/1.15 release notes（[#4795](https://github.com/SillyTavern/SillyTavern/discussions/4795)、[#4926](https://github.com/SillyTavern/SillyTavern/discussions/4926)）、[Character Card V3 spec](https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md)、[RisuAI Regex Script](https://github.com/kwaroran/RisuAI/wiki/Regex-Script)、[RisuAI deepwiki](https://deepwiki.com/kwaroran/RisuAI)、[CWS 2026 政策](https://developer.chrome.com/blog/cws-policy-updates-2026)、[Claude 扩展 DOM 实践](https://dev.to/clawgenesis/i-built-a-chrome-extension-for-claude-in-45-minutes-heres-what-i-learned-53k7)、c.ai 出走报道（[TechCrunch](https://techcrunch.com/2025/10/29/character-ai-is-killing-the-chatbot-experience-for-minors/)、[TechRadar](https://www.techradar.com/computing/artificial-intelligence/why-your-favorite-fictional-ai-friends-are-vanishing-from-character-ai)）。

## 赛道快照

- **定位被验证**：persona-chat 的"零成本 × 官方免费网页版 × 浏览器插件"组合确实少有人正面占——RisuAI 要用户自带（多为付费）API key 且没有插件形态，MaxAI 是付费托管聚合器。夹缝是开着的。
- **酒馆生态还在活跃投入**：SillyTavern 1.14→1.15 连续加了「按对话覆盖 example/system prompt」「按对话上传背景」「CharX 资产导入增强」「Macros 2.0」——这些大多是**纯本地/可见注入**就能镜像的，正好落在我们的约束内。
- **出走潮真实但只有一部分能接**：c.ai 因未成年限制、下架 IP 角色（哈利波特/迪士尼 C&D）、审查收紧、模型质量下滑、**记忆丢失**而流失用户。可接的痛点：记忆、人设控制、可移植性；**不可接**：绕审查、IP 角色扮演（见下方"被否掉"）。
- **⚠️ 时间敏感硬约束**：CWS 2026 新政（**2026-08-01 起执行**）明确禁止"绕过 AI 服务安全护栏/使用限制"的扩展。任何"越狱 prompt 库 / NSFW 解锁预设 / 绕内容过滤"功能现在都是明确禁区。

## 打分口径

5 维各 0–5。**红线维度**（零成本 / 可见注入 / 过审）任一得 0 → 直接淘汰、不入选。非红线维度（用户价值·差异化 / 落地成本）低分只扣权重。下面 5 个方向都是**已通过红线过滤**的（把不可行变体剔除后的形态）。

---

## 5 个方向（按推荐度排序）

### 方向 1：Claude.ai adapter —— 第二平台接入 ⭐ 推荐先做
- **一句话**：给已定路线的下一站 Claude.ai 写一个 `PlatformAdapter`，把整套人设/世界书/背景能力搬到 Claude.ai 官方网页版，直接扩大可用平台 = 扩大 TAM。
- **调研依据**：Claude 网页版输入框是 `contenteditable` 的 ProseMirror `div`（不是 `textarea`），草稿要用 `el.innerText`/`textContent` 读、不能用 `.value`（[来源](https://dev.to/clawgenesis/i-built-a-chrome-extension-for-claude-in-45-minutes-heres-what-i-learned-53k7)，3-0 确认）。**注意**：该文里"`data-testid` 是稳定选择器"的说法被 0-3 证伪——不要依赖 data-testid，用 `div[contenteditable="true"].ProseMirror` 并**上真机 CDP 复核**。
- **评分**：零成本 5 · 可见注入 5 · 过审 5（新增 `claude.ai` host 权限，单一用途好论证）· 价值 5（reach 最大杠杆，且是既定 roadmap）· 落地 3 → **23/25**
- **落地草图**：新 `src/lib/adapters/claude.ts`（复用已存在的 `setContentEditableValue` 路径）→ 注册进 `adapters/index.ts` 的 REGISTRY → 新 content script match `claude.ai` → manifest 加 host 权限。人设/世界书/i18n 全部复用，几乎零改动。
- **风险 / 未知**：Claude.ai 的输入框/消息容器 selector 会漂移，**落地前必须用 browser-cdp 对真实登录会话勘察**（CDP 单次链式执行铁律，见 pc-test）。背景方案要重做一套 Claude.ai 的 design-token 覆盖（DeepSeek 那套 `--dsw-alias-*` 不通用）。

### 方向 2：零成本长会话记忆 —— 直击最大出走痛点 ⭐ 最高价值（需先 spike）
- **一句话**：把现有"记忆笔记"升级成长会话记忆——定期把对话要点压缩成摘要，通过 Enrich 写回输入框由用户按 Enter 注入，解决"聊几百条后 AI 忘了设定"这个 c.ai/JanitorAI 头号差评。
- **调研依据**：记忆丢失是 c.ai/JanitorAI 最响的痛点（"goldfish memory"，[storychat](https://blog.storychat.app/character-ai-model-quality-community-frustration-2026/)、[memorylake](https://www.memorylake.ai/en/blogs/janitor-ai-forgets-character-details)）。酒馆标准解法是 Memory/Summarization 扩展定期摘要再注入。**关键零成本红线**：RisuAI 的 HypaMemory（向量检索）+ SupaMemory（自动摘要）都要付费 embedding/summarizer LLM——**我们不能照抄**。合规变体只有两条：①人在环（用户/助手手动生成摘要后注入）②本地启发式/关键词检索。核心逻辑已在 `use-memory-note.ts` 有基础。
- **评分**：零成本 5（仅限人在环/本地启发式变体）· 可见注入 5（压缩摘要写回输入框，人类按 Enter——正是我们的机制）· 过审 5 · 价值 5（头号痛点）· 落地 2（"零成本还能召回够好"是**真实开放问题**）→ **22/25**
- **落地草图**：扩 `WorldInfoEntry`/记忆存储，加"会话要点"收集 + 一键生成/编辑摘要 UI + Enrich 时把摘要作为 `alwaysActive` 注入。
- **风险 / 未知**：⚠️ **先做 spike**——验证"不花钱（人在环 or 本地启发式，不调付费摘要模型）"能不能达到"明显缓解遗忘"的效果。达不到就降级成"更好用的手动记忆"。

### 方向 3：世界书 V3 装饰器升级 —— 深化核心机制
- **一句话**：把当前"纯关键词匹配"的世界书升级到 Character Card V3 装饰器模型：`@@depth`（注入到第 N 条近消息）、`@@position`（desc 前后/personality/scenario）、`@@role`、`constant:true`（常驻、绕关键词）、`use_regex:true`。
- **调研依据**：V3 spec 逐条记载这些装饰器（[SPEC_V3](https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md)，3-0），是 ST/RisuAI 都用的社区标准。纯本地注入逻辑，直接映射到 Enrich 写回。**这是本组兼容性最高的升级路径**，还能让导入的角色卡自带的 lorebook 更忠实生效。
- **评分**：零成本 5 · 可见注入 5 · 过审 5 · 价值 4（深化核心差异点，重度用户在意；提升卡片导入保真度）· 落地 3 → **22/25**
- **落地草图**：扩 `WorldInfoEntry`（加 position/depth/role/constant/regex 字段）→ 改 `world-info.ts` 匹配+排序逻辑 → options 世界书编辑器加对应控件 → `character-card-import.ts` 解析 V3 装饰器。
- **风险 / 未知**："简化版酒馆"定位下别把编辑器做得像酒馆那么密——需要在能力与简洁间取舍（可默认折叠高级项）。

### 方向 4：角色卡导出 + CharX/V3 资产管线 —— 可移植性与生态信任
- **一句话**：我们现在只**导入**卡片；补上**导出**（PersonaCard → V2/V3 PNG/JSON 回写），并增强 CharX 资产解析。让用户的人设可带走、可回馈社区。
- **调研依据**：ST 卡格式是事实互操作标准，三大前端都支持；ST 1.15 增强了 CharX 资产导入（[来源](https://github.com/SillyTavern/SillyTavern/discussions/4926)，3-0）。可移植性是用户看重酒馆工具的明确理由。V2 存 PNG `tEXt` 的 `chara` chunk，V3 用单独 `ccv3` chunk（[SPEC_V3](https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md)）。
- **评分**：零成本 5 · 可见注入 5（纯本地文件操作，根本不涉及注入）· 过审 4（用户主动本地导入 UGC 图片可能含 NSFW，但本地、用户自选、风险低于任何"打包/托管卡库"）· 价值 4（导出是我们目前缺的，增强留存与生态信誉）· 落地 3 → **21/25**
- **落地草图**：新 `character-card-export.ts`（PersonaCard→V2/V3 序列化 + PNG tEXt 写入，导入的逆过程）+ options 页导出按钮。可选：解析 V3 `assets`（emotion sprites）做展示型头像切换（**注意**：调研证伪了"表情立绘是头号沉浸功能"的说法 0-3，所以这块只做可选支撑，不当主打）。
- **风险 / 未知**：PNG tEXt chunk 写入（编码 base64→zTXt/tEXt）要实测；导入图片的 NSFW 风险靠"本地 only、不分发"兜底。

### 方向 5：对话级注入控制 —— 覆盖 + 反串扮 + 宏
- **一句话**：一组"精细控制 Enrich 到底注入什么"的小功能：①按对话覆盖人设/example/system 片段（不改全局人设）②反串扮守卫（一键注入"不要替 {{user}} 说话/行动"）③宏/变量模板（`{{user}}`/`{{char}}`/`{{random}}` 在 Enrich 时展开）。
- **调研依据**：ST 1.14 加了"按对话覆盖 example/system prompt"（[#4795](https://github.com/SillyTavern/SillyTavern/discussions/4795)，3-0）；"AI 替我的人设说话"是 c.ai 反复出现的具名痛点（3-0，有专门教程）；Macros 2.0 是 ST 1.15 头条的纯本地模板引擎。三者都是纯 prompt 注入/本地 UI。
- **评分**：零成本 5 · 可见注入 5 · 过审 5 · 价值 4（人设控制是可接的出走痛点；反串扮是极高性价比的小赢）· 落地 3（覆盖需要一个稳定的"会话 id"键——可从平台 URL 取；反串扮/宏很轻）→ **22/25**
- **落地草图**：反串扮 = 一个开关 + 一段固定注入语（最小）；宏 = Enrich 写回前做字符串展开；对话级覆盖 = 新 storage（按平台会话 id 键）。可拆成"先做反串扮+宏（快赢）→ 再做对话级覆盖"。
- **风险 / 未知**：我们不拥有对话，需确认平台会话 id 是否稳定可取（DeepSeek URL 里有 conversation id，Claude.ai 也有）。

---

## 推荐

- **先做方向 1（Claude.ai adapter）**：reach 最大杠杆、机制已验证（只是新写一个 adapter）、是既定 roadmap、风险主要是可用 CDP playbook 兜底的 DOM 勘察。用它给 Stage 2 起个稳的开局。
- **最高上限是方向 2（零成本记忆）**：直击头号出走痛点、最能形成差异化，但"不花钱还能召回够好"有真实不确定性——**若选它，先做一个 spike 验证可行性**再进全量 PRD。
- **纯增强首选方向 3（世界书 V3）**：完全兼容、深化核心、顺带提升卡片保真度，风险最低。
- **战略取舍**：方向 1 是"变宽"，方向 2/3 是"变深"。若担心"长会话遗忘会让新平台用户同样受挫"，可先深化（2/3）再扩平台（1）；若要尽快证明多平台论点、扩大用户面，则 1 先行。
- 方向 5 里的**反串扮守卫**是全场性价比最高的小赢，无论主线选哪个都建议顺手带上。

## 被否掉的方向（别再提，除非前提变了）
- **绕审查 / 越狱 prompt 库 / NSFW 解锁预设** —— CWS 2026 新政明确禁止绕过 AI 安全护栏，2026-08-01 起执行。直接出局。
- **IP / 版权角色（哈利波特、迪士尼等）内置或分发** —— c.ai 已因版权下架，法律雷区。内置库继续走"原创 + 引导 chub.ai"。
- **自动摘要 / 向量记忆（RisuAI HypaMemory/SupaMemory 那套）** —— 需付费 embedding/summarizer，违反零成本红线。记忆只能做人在环 / 本地启发式变体（见方向 2）。
- **托管/打包角色卡库** —— UGC 分发的审核/版权/NSFW 风险，沿用 stage-1"暂不建社区"决策。

## 开放问题（进 PRD 前需澄清/spike）
1. 零成本（人在环 / 本地启发式，不调付费摘要）能否让长会话召回"明显变好"？→ 方向 2 的 spike。
2. RisuAI "Modify Display" 式的 LLM 输出驱动 HTML 状态面板，算不算 CWS 禁止的"DOM 重写隐藏内容"？边界在哪？（若以后想做状态面板需先厘清）
3. Claude.ai 当前真实稳定的输入框/容器 selector（data-testid 已被证伪）→ 方向 1 落地前 CDP 勘察。
4. 各平台会话 id 是否稳定可取（方向 5 的对话级覆盖依赖它）。
