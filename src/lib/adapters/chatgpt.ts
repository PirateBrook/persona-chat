import { findFirstUsable, injectInto, readDraftFrom } from "./dom-inject"
import type { PlatformAdapter } from "./types"

/**
 * ChatGPT (chatgpt.com) chat input. The composer is a ProseMirror
 * contenteditable div (NOT a <textarea>) — confirmed live, see
 * docs/chatgpt-dom-notes.md §2. `#prompt-textarea` is ChatGPT's stable
 * semantic id for this composer (not a hash-based class like the parent
 * node's `wcDTda_prosemirror-parent`), so it's listed first. The shared
 * dom-inject helpers read it via innerText and write via
 * execCommand("insertText") (verified live to fill ProseMirror and persist
 * past a render tick), falling back to clipboard.
 *
 * Selectors ordered specific → generic. Add selectors here as we observe
 * breakage, don't rewrite the algorithm.
 */
const INPUT_SELECTORS: readonly string[] = [
  "#prompt-textarea",
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"]'
]

export const chatgptAdapter: PlatformAdapter = {
  id: "chatgpt",
  findChatInput: () => findFirstUsable(INPUT_SELECTORS),
  readDraftText: () => readDraftFrom(findFirstUsable(INPUT_SELECTORS)),
  injectText: (text) => injectInto(findFirstUsable(INPUT_SELECTORS), text)
}
