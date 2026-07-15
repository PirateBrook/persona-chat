import type { InjectResult, PlatformAdapter } from "./types"

/**
 * DeepSeek chat input injection.
 *
 * DeepSeek is a React app; changing element.value directly won't propagate to
 * React's internal state. We use the well-known nativeInputValueSetter trick
 * so React thinks a real user typed. If we can't find the input (DOM changed,
 * new UI version), we fall back to clipboard — degraded but never broken.
 *
 * Intentionally does NOT auto-send. User sees the injected text and presses
 * Enter themselves. Auto-send is a v0.2 config option.
 */

/**
 * Selectors ordered from specific → generic. DeepSeek's DOM has shifted over
 * releases, so we try known patterns first then broad fallbacks. Add new
 * selectors here as we observe breakage, don't rewrite the algorithm.
 */
const INPUT_SELECTORS: readonly string[] = [
  'textarea#chat-input',
  'textarea[data-testid="chat-input"]',
  'textarea[placeholder*="DeepSeek"]',
  'textarea[placeholder*="deepseek"]',
  'textarea[placeholder*="消息"]',
  'textarea[placeholder*="Message"]',
  'textarea[placeholder*="Send"]',
  'textarea[placeholder*="给"]',
  'div[contenteditable="true"][role="textbox"]',
  'textarea',
  'div[contenteditable="true"]'
]

function findChatInput(): HTMLElement | null {
  for (const selector of INPUT_SELECTORS) {
    const nodes = document.querySelectorAll<HTMLElement>(selector)
    for (const el of Array.from(nodes)) {
      if (isElementUsable(el)) return el
    }
  }
  return null
}

function isElementUsable(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  const style = window.getComputedStyle(el)
  if (style.display === "none" || style.visibility === "hidden") return false
  if (el instanceof HTMLTextAreaElement && el.disabled) return false
  return true
}

function readDraftText(): string {
  const el = findChatInput()
  if (!el) return ""
  if (el instanceof HTMLTextAreaElement) return el.value
  if (el.getAttribute("contenteditable") === "true") return el.innerText
  return ""
}

async function injectText(text: string): Promise<InjectResult> {
  const el = findChatInput()

  if (!el) {
    return clipboardFallback(text, "input_not_found")
  }

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
 * Some React chat UIs use contenteditable divs (Slate, Lexical, ProseMirror).
 * execCommand.insertText is a compatibility shim that works across all three
 * of those editor frameworks — deprecated but not going away in Chrome.
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

export const deepseekAdapter: PlatformAdapter = {
  id: "deepseek",
  findChatInput,
  readDraftText,
  injectText
}
