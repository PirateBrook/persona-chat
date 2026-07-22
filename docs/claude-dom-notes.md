# Claude.ai DOM 勘察笔记（方向1 adapter 的唯一依据）

对标 `docs/deepseek-dom-notes.md`。**方向1（Claude.ai adapter）的 Phase 0 前置门**：adapter/content-script 的所有真实 selector 一律以本文件为准，不预设已知（研究已证伪 `data-testid` 稳定性）。

> 状态：**已勘察完成**（2026-07-22，CDP 真机验证，Claude build `d8ab11fbd8`，`colorVersion v2`）。第 1–8 节为勘察结果，最后一节是 adapter 实现清单（selector 已回填，可直接动手）。

---

## 0. 怎么采集（二选一）

**方式 A — browser-cdp（需先征得同意杀当前 Chrome）**
```bash
node ~/.claude/skills/browser-cdp/scripts/setup-cdp-chrome.js 9222 --detect-only
# needs-setup + CHROME_RUNNING=yes → 征得同意后：
node ~/.claude/skills/browser-cdp/scripts/setup-cdp-chrome.js 9222 --yes
# 单次链式执行（CDP 铁律：一个 shell 调用、先确认 tab URL）：
agent-browser --cdp 9222 open "https://claude.ai/new" && \
agent-browser --cdp 9222 wait 4000 && \
agent-browser --cdp 9222 eval 'location.href' && \
cat docs/claude-phase0-probe.txt | agent-browser --cdp 9222 eval --stdin
```

**方式 B — 直接在已登录的 claude.ai 标签页控制台粘贴**（零风险、不杀进程）
打开一个已登录的 claude.ai 对话页 → F12 控制台 → 粘贴下面这段**只读探针**，把返回的 JSON 贴回来。

### 只读探针（不改页面，安全）
```js
(() => {
  const out = { note: "claude.ai phase-0 readonly probe" };
  const desc = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(), id: el.id || null,
      class: (el.className && el.className.toString().slice(0, 200)) || null,
      contenteditable: el.getAttribute("contenteditable"),
      role: el.getAttribute("role"),
      dataTestid: el.getAttribute("data-testid"),
      placeholder: el.getAttribute("data-placeholder") || el.getAttribute("placeholder") || null,
      rect: { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) },
      visible: r.width > 0 && r.height > 0,
      textSample: (el.innerText || "").slice(0, 80)
    };
  };
  out.location = { hostname: location.hostname, href: location.href, pathname: location.pathname };
  const inputSel = [
    'div[contenteditable="true"].ProseMirror',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
    "textarea"
  ];
  out.inputCandidates = inputSel.map((sel) => {
    let els = []; try { els = Array.from(document.querySelectorAll(sel)); } catch (e) {}
    return { selector: sel, count: els.length, first: desc(els[0]) };
  });
  out.theme = {
    bodyColorScheme: getComputedStyle(document.body).colorScheme,
    htmlColorScheme: getComputedStyle(document.documentElement).colorScheme,
    htmlClass: document.documentElement.className.slice(0, 300),
    htmlDataset: Object.assign({}, document.documentElement.dataset),
    bodyDataset: Object.assign({}, document.body.dataset),
    prefersDark: matchMedia("(prefers-color-scheme: dark)").matches,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor
  };
  const cx = Math.floor(innerWidth / 2), cy = Math.floor(innerHeight / 2);
  const centerEl = document.elementFromPoint(cx, cy);
  out.centerElement = desc(centerEl);
  const opaque = [];
  let node = centerEl, hops = 0;
  while (node && node !== document.documentElement && hops < 30) {
    const cs = getComputedStyle(node);
    const bg = cs.backgroundColor, bgImg = cs.backgroundImage;
    const isOpaque = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    if (isOpaque || (bgImg && bgImg !== "none")) {
      opaque.push({ tag: node.tagName.toLowerCase(), class: (node.className || "").toString().slice(0, 120), dataTestid: node.getAttribute("data-testid"), bg, bgImg: bgImg.slice(0, 60) });
    }
    node = node.parentElement; hops++;
  }
  out.opaqueBackgroundAncestors = opaque;
  const msgSel = ['div.font-claude-message', '[data-testid*="message"]', 'div[class*="message"]', "div.prose", "[data-is-streaming]"];
  out.messageCandidates = msgSel.map((sel) => {
    let els = []; try { els = Array.from(document.querySelectorAll(sel)); } catch (e) {}
    return { selector: sel, count: els.length, lastTextSample: els.length ? (els[els.length - 1].innerText || "").slice(0, 80) : null };
  });
  const sendSel = ['button[aria-label*="Send" i]', 'button[data-testid*="send" i]', 'fieldset button', 'button[type="submit"]'];
  out.sendCandidates = sendSel.map((sel) => {
    let els = []; try { els = Array.from(document.querySelectorAll(sel)); } catch (e) {}
    return { selector: sel, count: els.length, first: els[0] ? { ariaLabel: els[0].getAttribute("aria-label"), disabled: els[0].disabled } : null };
  });
  return JSON.stringify(out, null, 2);
})()
```

### 可选：注入自测探针（**会往输入框写字并清除**，确认主路径可行性）
> 只在需要验证 FR-1 注入路径时跑；它会短暂在输入框写入 `PERSONA_CHAT_PROBE` 再清空。
```js
(() => {
  const el = document.querySelector('div[contenteditable="true"].ProseMirror') || document.querySelector('div[contenteditable="true"]');
  if (!el) return "NO_INPUT_FOUND";
  el.focus();
  const before = el.innerText;
  document.execCommand("selectAll", false);
  const ok = document.execCommand("insertText", false, "PERSONA_CHAT_PROBE");
  el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  const after = el.innerText;
  const sendBtn = document.querySelector('button[aria-label*="Send" i], fieldset button');
  const res = { execCommandReturned: ok, innerTextAfter: after.slice(0, 60), sendButtonDisabledAfter: sendBtn ? sendBtn.disabled : "no-send-btn" };
  // cleanup
  el.focus(); document.execCommand("selectAll", false); document.execCommand("delete", false);
  el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  res.restored = el.innerText === before;
  return JSON.stringify(res, null, 2);
})()
```

---

## 1. Host（决定 REGISTRY key + manifest/content-script match）
- 实际 hostname：**`claude.ai` 单一**（未见 `www.` 重定向）。
- URL 形态：新对话 `https://claude.ai/new`；对话 `https://claude.ai/chat/<uuid>`。
- → REGISTRY key `"claude.ai"`；manifest `host_permissions` + content-script `matches` 均 `https://claude.ai/*`。

## 2. 输入框（ProseMirror / Tiptap contenteditable）✅
- 最稳 selector（"具体→通用"）：`div.ProseMirror[contenteditable="true"]` → `div[contenteditable="true"][role="textbox"]` → `div[contenteditable="true"]`。（元素 class = `tiptap ProseMirror`，`role="textbox"`；另有 `data-testid="chat-input"` 但**不依赖**。）
- `execCommand("insertText")`：**可用**（`execReturned:true`，文本完整落入）。**多行实测**：内容全部保留，但 ProseMirror 把每个 `\n` 当段落分隔——innerText 里单换行会变双换行（发 3 个 `\n` → 读回 7 个）。**语义完整、仅排版偏松**，MVP 可接受；若要精确单换行需改 soft-break（Shift+Enter 语义），本轮不做。
- 注入后 `dispatch input(bubbles)` → 存在启用的 `type="submit"` 按钮（Claude 已"看到"文本，人类可按 Enter 发送）。
- `innerText` 读草稿：**准确**（读回 `PERSONA_CHAT_PROBE`）；清空复原正常。
- → 直接复用 `deepseek.ts` 的 `setContentEditableValue`（selectAll + execCommand insertText + input 事件，失败 clipboard fallback）；`readDraftText` 用 `el.innerText`。

## 3. 助手消息容器 ✅
- **`ASSISTANT_REPLY_SELECTOR` = `div.font-claude-response`**（干净答案文本块；等价 DeepSeek `.ds-assistant-message-main-content`）。
- 回合外层：`[data-is-streaming]`（`"true"`/`"false"` 标流式状态，可判断回复是否完成）。
- 用户消息：`[data-testid="user-message"]` / class 含 `!font-user-message`。
- 注意：回合外层含一个 `<h2 class="sr-only">Claude responded: …</h2>` 无障碍前缀——TTS 用 `font-claude-response`（不含该前缀），别用外层。
- 虚拟化未定论（本对话 2 回合全在 DOM）；**保留 MutationObserver**（照搬 deepseek.tsx）最稳。

## 4. 发送区布局
- 输入框在底部居中（有 max-width），/new 时 rect ≈ x683 y368 w636 h22（随内容增高）；toolbar 在 `fieldset` 内（5 个按钮：加文件/工具/模型等）。
- 我们的 pill/FloatingButton 走 `fixed` 右下角（现 `bottom-[4.6rem] right-6`）——Claude 输入居中、右侧有留白，**大概率不碰撞**；窄窗口需截图确认。MVP 沿用 DeepSeek 偏移，验收截图时核对。

## 5. 主题判定 ✅
- `getComputedStyle(document.body).colorScheme` **报 `"dark"`**（和 DeepSeek 一样能用！）。
- 稳定兜底：`html[data-mode="dark"|"light"]`、`html[data-theme="claude"]`。
- → `detectTheme()` 可复用"读 body.colorScheme"主路径；可加 `html[data-mode]` 兜底。**无需 Claude 专属主题逻辑**。

## 6. 背景可见性 ✅（Q2：不用降级）
- 从助手消息一路到 body（23 层）**唯一不透明层 = `body`**（`bg-bg-100` → `rgb(31,31,30)`）；html 透明（`rgba(0,0,0,0)`），中间**无不透明滚动容器**。
- → 现有 `applyBackground`（在 `html, body` 设 `background-image !important`）**应能直接透出**，比 DeepSeek 干净。**几乎不需要 Claude 专属容器中和**。
- 备注：Claude 用 Tailwind 语义 token（`bg-bg-100`=`--bg-100`，类似 DeepSeek `--dsw-alias-*`）；不去覆盖 `--bg-100`（会波及侧栏/卡片），直接靠 body background-image 叠在 body 底色之上即可。真机贴一张背景截图复核对比度。

## 7. 扩展思考块 DOM（hide-thinking）
- 未勘察（需带 extended-thinking 的对话）。→ **MVP 按 FR-8：在 claude.ai 隐藏该开关/Tweaks tab**（Q3 推荐），不本轮补规则。

## 8. 会话 URL 形态（为后续方向5留档）
- `https://claude.ai/chat/<uuid>`（含稳定会话 id，方向5 对话级隔离可用）。

---

## 填完即可动手：adapter 实现清单（selector 从上面回填）

- `src/lib/adapters/claude.ts`：`INPUT_SELECTORS`（§2）、走 contenteditable 分支（复用 `deepseek.ts` 的 `setContentEditableValue`/`isElementUsable`/clipboard fallback），`readDraftText` 用 `innerText`。
- `src/lib/adapters/index.ts`：REGISTRY 加 `"claude.ai": claudeAdapter`（若 §1 需 `www.` 一并加）。
- `src/contents/claude.tsx`：镜像 `deepseek.tsx`，`config.matches`（§1）、`getShadowHostId` 独立 id、`ASSISTANT_REPLY_SELECTOR`（§3）、pill 偏移（§4）。
- `package.json`：`host_permissions` 加 `"https://claude.ai/*"`（§1）。
- `src/lib/backgrounds.ts`：`detectTheme` 按 §5 结论决定是否需平台可注入策略；背景中和按 §6（DeepSeek 行为保持逐字节不变）。
- `page-tweaks`：按 §7 决定 Claude 上 Tweaks tab 处理（FR-8）。
- i18n 泛化（FR-11/12）：`enrich.failed`/`popup.activeOn`/`popup.hint`/`tweaks.blurb`/`tweaks.hideThinkingDesc` 去掉写死的 "DeepSeek/chat.deepseek.com"，双语。
- 联动更新：`docs/chrome-web-store-listing.md`、商店 `description`、`extension-review-report.md` 基线复扫。
- **验收**：Node（§6.1/6.2 手段A）+ options eval（手段B）+ claude.ai 真机截图 + **DeepSeek 无回归复跑**（手段C，因动了背景 seam）。
