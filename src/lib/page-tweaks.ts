import type { PageTweaks } from "../types"

const STYLE_ELEMENT_ID = "persona-chat-page-tweaks-style"

function ensureStyleElement(): HTMLStyleElement {
  let style = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement("style")
    style.id = STYLE_ELEMENT_ID
    document.head.appendChild(style)
  }
  return style
}

/**
 * `.ds-think-content` is DeepSeek's own stable design-system class for the
 * rendered "已思考" reasoning trace (verified live against chat.deepseek.com
 * — see docs/deepseek-dom-notes.md). It's a direct child of the hashed div
 * that also holds the "已思考（用时 Ns）" toggle header; that hashed div is
 * itself a *sibling* of the actual answer (`.ds-assistant-message-main-content`)
 * one level up, not an ancestor of it. `:has(> .ds-think-content)` selects
 * exactly that header+content wrapper — without hardcoding the hash, which
 * regenerates every DeepSeek deploy — while leaving the answer untouched.
 */
const HIDE_THINKING_RULE = "div:has(> .ds-think-content) { display: none !important; }"

export function applyPageTweaks(tweaks?: PageTweaks): void {
  const style = ensureStyleElement()
  style.textContent = tweaks?.hideThinking ? HIDE_THINKING_RULE : ""
}
