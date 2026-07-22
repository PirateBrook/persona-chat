import type { InjectResult } from "./types"

/**
 * Shared DOM-injection primitives for text-input platform adapters. Each
 * official site (DeepSeek, Claude, ...) differs only in its input selectors;
 * the mechanics of reading/writing a <textarea> or a contenteditable editor
 * (Slate / Lexical / ProseMirror / Tiptap) are identical, so they live here
 * and each adapter supplies just its own selector list.
 *
 * Injection intentionally never auto-sends — the user sees the injected text
 * and presses Enter themselves.
 */

export function isElementUsable(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  const style = window.getComputedStyle(el)
  if (style.display === "none" || style.visibility === "hidden") return false
  if (el instanceof HTMLTextAreaElement && el.disabled) return false
  return true
}

/** Tries selectors in order (specific → generic) and returns the first
 *  visible/usable match. Add selectors on breakage; don't rewrite this. */
export function findFirstUsable(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const nodes = document.querySelectorAll<HTMLElement>(selector)
    for (const el of Array.from(nodes)) {
      if (isElementUsable(el)) return el
    }
  }
  return null
}

export function readDraftFrom(el: HTMLElement | null): string {
  if (!el) return ""
  if (el instanceof HTMLTextAreaElement) return el.value
  if (el.getAttribute("contenteditable") === "true") return el.innerText
  return ""
}

export async function injectInto(el: HTMLElement | null, text: string): Promise<InjectResult> {
  if (!el) return clipboardFallback(text, "input_not_found")
  try {
    if (el instanceof HTMLTextAreaElement) {
      setReactTextareaValue(el, text)
    } else if (el.getAttribute("contenteditable") === "true") {
      setContentEditableValue(el, text)
    } else {
      return clipboardFallback(text, "unsupported_element_type")
    }
    // Focus so the user's next Enter goes to the chat input.
    el.focus()
    return { ok: true, method: "dom-injection" }
  } catch (err) {
    console.error("[persona.chat] injection failed", err)
    return clipboardFallback(text, err instanceof Error ? err.message : String(err))
  }
}

/**
 * React's <textarea> reads value from its own state, not the DOM. Assigning
 * el.value won't fire onChange. We reach past React by calling the native
 * value setter, then dispatch a bubbled input event so React syncs its state.
 */
function setReactTextareaValue(el: HTMLTextAreaElement, value: string): void {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set

  if (!nativeSetter) {
    throw new Error("HTMLTextAreaElement value setter not available")
  }

  nativeSetter.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

/**
 * Some React chat UIs use contenteditable divs (Slate, Lexical, ProseMirror,
 * Tiptap). execCommand.insertText is a compatibility shim that works across
 * all of those editor frameworks — deprecated but not going away in Chrome.
 * Verified live against DeepSeek and against Claude's Tiptap/ProseMirror
 * composer (fills without splitting into stray paragraphs).
 */
function setContentEditableValue(el: HTMLElement, value: string): void {
  el.focus()

  // Select all existing content so insertText replaces rather than appends.
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)

  const inserted = document.execCommand("insertText", false, value)
  if (!inserted) {
    // Fallback for editors that block execCommand (rare).
    el.textContent = value
  }
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

async function clipboardFallback(text: string, reason: string): Promise<InjectResult> {
  try {
    await navigator.clipboard.writeText(text)
    return { ok: true, method: "clipboard-fallback", error: reason }
  } catch (err) {
    return {
      ok: false,
      method: "clipboard-fallback",
      error: `${reason} + clipboard write failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}
