# ChatGPT DOM 勘察笔记（第三平台 adapter 的唯一依据）

对标 `docs/claude-dom-notes.md` / `docs/deepseek-dom-notes.md`。第三平台选型已确认做 ChatGPT（见 `docs/research/platform3-chatgpt-vs-grok.md`）。这是落地 adapter 前的 Phase-0 前置门——所有真实 selector 一律以本文件为准，不预设已知。

> 状态：**已勘察完成**（2026-07-27，browser-cdp 真机验证，真实登录会话，`chatgpt.com`，build `prod-80cb044a31a0add85884a14dd27ea6c5038e76c3`）。

---

## 1. Host（决定 REGISTRY key + manifest/content-script match）
- 实际访问到的 hostname：**`chatgpt.com`**（未观察到重定向到 `chat.openai.com`，但历史上两个域名都存在过，落地时 manifest/content-script 的 `matches` 建议两个都覆盖：`https://chatgpt.com/*` + `https://chat.openai.com/*`，避免老书签/老链接进来的用户匹配不到）。
- URL 形态：新对话 `https://chatgpt.com/`；历史对话 `https://chatgpt.com/c/<uuid>`。
- → REGISTRY key `"chatgpt.com"`（`chat.openai.com` 若要一并支持可映射到同一个 adapter 实例）。

## 2. 输入框（ProseMirror contenteditable）✅
- 最稳 selector：`#prompt-textarea`（`div[contenteditable="true"]`，`className="ProseMirror"`，`role="textbox"`）。往上第二层父节点带 `wcDTda_prosemirror-parent` 这类 hash 前缀 class，**不要用**（跟 DeepSeek 的哈希类名一样，版本一变就失效）；`#prompt-textarea` 这个 id 本身看起来是稳定的语义 id，不是 hash。
- 同级还有一个 `<textarea class="wcDTda_fallbackTextarea">`——推测是无障碍/低版本兜底渲染路径，不是我们要用的主输入，selector 列表里可以作为"具体→通用"的末位兜底，但不优先。
- `execCommand("insertText")`：**可用且落地持久**——真机实测：select-all + `execCommand("insertText", false, text)` + `dispatchEvent(new Event("input", {bubbles:true}))`，写入后立即读回 `innerText` 正确，**等待 500ms 后再读依然正确**（未被 ProseMirror 下一次渲染吃掉）。跟 Claude.ai 的 Tiptap/ProseMirror 是同一套机制，**直接复用 `dom-inject.ts` 现成的 `setContentEditableValue`，不用改一行**。
- 清空同样用 select-all + `execCommand("delete")`，验证过能正确清空（回到近似空的 `\n`，跟 ProseMirror 空段落的常见表现一致）。
- 发送按钮：`button[data-testid="send-button"]`（`aria-label` 中文环境下是"发送提示"），**只有输入框有文本时才出现/启用**——真机验证：空输入框查不到该按钮，写入文字后立刻能查到且 `disabled:false`。这个可以作为"是否已识别到我们写入的文本"的一个附加信号（非必需，`readDraftText` 走 `innerText` 已经够用）。
- → 直接复用 `deepseek.ts`/`claude.ts` 已有的 `setContentEditableValue`（selectAll + execCommand insertText + input 事件，失败 clipboard fallback）；`readDraftText` 用 `el.innerText`。

## 3. 助手消息容器 ✅
- **`ASSISTANT_REPLY_SELECTOR` = `[data-message-author-role="assistant"]`**（语义化 data 属性，不是 hash 类名，稳定性预期优于 DeepSeek/Claude 的 class 方案）。
- 同一属性也标记用户消息：`[data-message-author-role="user"]`。
- 每条消息带 `data-message-id`（uuid），可用于去重/追踪，本轮不需要。
- 真机在一个已有 4 轮对话（2 用户+2 助手）的历史会话里验证：`document.querySelectorAll('[data-message-author-role]')` 精确返回 4 条，顺序 user→assistant→user→assistant，跟对话顺序一致。
- 虚拟化未定论（本次验证的历史对话不长，全部在 DOM 里）；**保留 MutationObserver**（照搬 deepseek.tsx/claude.tsx 现成模式）最稳，不假设一次性查询就能拿到全部。

## 4. 主题判定 ✅
- `getComputedStyle(document.body).colorScheme` 报 `"dark"`（跟 DeepSeek/Claude 完全一样的读法，**无需 ChatGPT 专属主题逻辑**）。
- 双重确认：`document.documentElement.className` 本身就带 `"dark"` class；`matchMedia("(prefers-color-scheme: dark)")` 与之一致。
- → `detectTheme()` 直接复用现有"读 body.colorScheme"主路径即可。

## 5. 背景可见性（初判：应该是三平台里最干净的一个）✅
- 从输入框（`#prompt-textarea`）逐层往上量到 `<body>`/`<html>`，中间**只有一层不透明**：composer 自己的圆角输入框背景（`bg-(--composer-surface-primary)`，`rgb(33,33,33)`），这是输入框自身的视觉容器，不是覆盖整个页面的滚动容器。
- 除此之外，从 composer 外层一路到 `<main>`、`<div id="thread">`、`side-pane-shell` 等所有中间层，`background-color` 全部是 `rgba(0,0,0,0)`（完全透明）——**只有 `<body>`（`rgb(0,0,0)`）和 `<html>`（同色）是不透明的**。
- → 现有 `applyBackground`（在 `html, body` 设 `background-image !important`）**预期能直接透出，不需要额外中和任何 design-token/中间容器**——这一点比 DeepSeek（需要覆盖 `--dsw-alias-bg-layer-1`）更干净，跟 Claude.ai 的情况（"唯一不透明层 = body"）几乎一致。**仍需真机截图复核**（本次只量了 computed style，没贴视觉背景图验证实际叠加效果）。

## 6. 会话 URL 形态（为方向5"按对话覆盖"留档）
- `https://chatgpt.com/c/<uuid>`，含稳定会话 id，形态跟 Claude.ai 的 `/chat/<uuid>` 一致——方向5 若要做按会话覆盖，ChatGPT 这边也有稳定 id 可用。

## 7. 未勘察 / 遗留问题
- **登出态/首次访客的输入框 selector** 本次未验证（用的是已登录真实账号）——ChatGPT 允许未登录试用，但 UI 结构可能不同，落地前建议补测一次登出态。
- **反自动化/机器人检测**：deep-research 阶段没查到任何证据表明 ChatGPT 有针对浏览器扩展的专门反制机制（相关具体声明均被对抗式核实推翻），本次真机 DOM 操作全程没有触发任何验证码/异常拦截，与调研结论一致。
- **多行文本换行行为**（`\n` 是否跟 Claude 一样被 ProseMirror 处理成段落、导致排版变松）本次没有专门测试多行注入，落地时需要跟 Claude 的"单 \n 变双 \n"那个已知行为做对比验证。
- **"深度研究"/"Codex"等模式切换**对输入框结构是否有影响未验证——本轮只测了默认"快速模式"下的普通对话输入框。

---

## 填完即可动手：adapter 实现清单

- `src/lib/adapters/chatgpt.ts`：`INPUT_SELECTORS = ["#prompt-textarea", 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]']`（§2），走 contenteditable 分支，直接复用 `dom-inject.ts` 现成的 `setContentEditableValue`/`isElementUsable`/clipboard fallback；`readDraftText` 用 `innerText`。
- `src/lib/adapters/index.ts`：REGISTRY 加 `"chatgpt.com": chatgptAdapter`（视 §1 决定要不要一并映射 `chat.openai.com`）。
- `src/contents/chatgpt.tsx`：镜像 `claude.tsx`，`config.matches` 覆盖 `https://chatgpt.com/*`（+ 视情况 `chat.openai.com`）、独立 `getShadowHostId`、`ASSISTANT_REPLY_SELECTOR = '[data-message-author-role="assistant"]'`（§3）、pill 偏移需真机截图确认不与 ChatGPT 自己的悬浮元素冲突。
- `package.json`：`host_permissions` 加对应 host（§1）。
- `src/lib/backgrounds.ts`：`detectTheme` 按 §4 结论直接复用现有路径；背景中和按 §5（预期无需额外覆盖，但要真机截图验证实际视觉效果，不能只信 computed style）。
- 联动更新：`docs/chrome-web-store-listing.md`、商店 `description`、`extension-review-report.md` 基线复扫（新增一个 host_permissions）。
- **验收**：Node 手段A + options eval 手段B + chatgpt.com 真机截图（含背景视觉对比度、多行注入排版）+ **DeepSeek/Claude.ai 无回归复跑**（手段C，因动了共享的 adapter 注册/background 逻辑）。
