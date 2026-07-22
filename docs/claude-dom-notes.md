# Claude.ai DOM 勘察笔记（方向1 adapter 的唯一依据）

对标 `docs/deepseek-dom-notes.md`。**方向1（Claude.ai adapter）的 Phase 0 前置门**：adapter/content-script 的所有真实 selector 一律以本文件为准，不预设已知（研究已证伪 `data-testid` 稳定性）。

> 状态：**待勘察**（用户选择"先准备，晚点再跑"）。下面第 0 节是采集探针，第 1–8 节是待填结果，最后一节是"填完即可动手"的 adapter 实现清单。

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
- 实际 hostname：`____`（`claude.ai` 单一？是否也需 `www.claude.ai`？）
- 对话页 URL 形态：`____`

## 2. 输入框（ProseMirror contenteditable）
- 命中的最稳 selector（"具体→通用"，**不含 data-testid**）：`____`
- `execCommand("insertText")` 能否真正填入、不拆段：`____`
- 注入后 `input` 事件 → 发送按钮是否变可用：`____`
- `innerText`/`textContent` 读草稿是否准确：`____`

## 3. 助手消息容器（TTS 取最近回复 + Enrich pill 判断有无回复）
- Claude 版 `ASSISTANT_REPLY_SELECTOR`：`____`
- 消息列表是否虚拟化（决定是否必须 MutationObserver）：`____`

## 4. 发送区布局（右下角 pill/FloatingButton 的 fixed 定位是否碰撞）
- Claude 输入区/发送按钮位置与尺寸：`____`
- 建议的安全偏移（bottom/right）：`____`

## 5. 主题判定（深/浅）
- `getComputedStyle(body).colorScheme` 是否报 dark/light：`____`
- 若不可用，稳定信号（html 的 class / `data-theme` / `data-mode`）：`____`

## 6. 背景可见性（能否在 html,body 设 background-image 透出）
- 在 `html, body` 设背景能否透出到聊天区背后：`____`
- 若被不透明容器盖住：需中和的容器 + 其 CSS 变量 / `:has()` 命中方式（Claude 版 `--dsw-alias-bg-layer-1` 对应物，**不追 hash 类名**）：`____`

## 7.（可选）扩展思考块 DOM（若要移植 hide-thinking）
- 稳定选择器：`____`（否则 MVP 按 FR-8 在 Claude 隐藏该开关/Tweaks tab）

## 8.（记录备用）会话 URL 形态（为后续方向5留档，不阻塞本方向）
- `____`

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
