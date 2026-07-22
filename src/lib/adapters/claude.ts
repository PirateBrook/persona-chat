import { findFirstUsable, injectInto, readDraftFrom } from "./dom-inject"
import type { PlatformAdapter } from "./types"

/**
 * Claude.ai chat input. The composer is a Tiptap/ProseMirror contenteditable
 * div (NOT a <textarea>) — confirmed live, see docs/claude-dom-notes.md. The
 * shared dom-inject helpers read it via innerText and write via
 * execCommand("insertText") (verified to fill ProseMirror without splitting),
 * falling back to clipboard.
 *
 * Selectors ordered specific → generic. `data-testid="chat-input"` exists on
 * the composer but is intentionally NOT used — testids drift across Claude
 * releases; the `.ProseMirror` + `role="textbox"` shape is the stable signal.
 * Add selectors here as we observe breakage, don't rewrite the algorithm.
 */
const INPUT_SELECTORS: readonly string[] = [
  'div.ProseMirror[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"]'
]

export const claudeAdapter: PlatformAdapter = {
  id: "claude",
  findChatInput: () => findFirstUsable(INPUT_SELECTORS),
  readDraftText: () => readDraftFrom(findFirstUsable(INPUT_SELECTORS)),
  injectText: (text) => injectInto(findFirstUsable(INPUT_SELECTORS), text)
}
