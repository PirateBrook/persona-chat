import { findFirstUsable, injectInto, readDraftFrom } from "./dom-inject"
import type { PlatformAdapter } from "./types"

/**
 * DeepSeek chat input. It's a React app; the shared dom-inject helpers handle
 * the textarea/contenteditable mechanics (native value setter for the
 * textarea, execCommand for contenteditable, clipboard fallback). This file is
 * just the selector list.
 *
 * Selectors ordered specific → generic. DeepSeek's DOM has shifted over
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

export const deepseekAdapter: PlatformAdapter = {
  id: "deepseek",
  findChatInput: () => findFirstUsable(INPUT_SELECTORS),
  readDraftText: () => readDraftFrom(findFirstUsable(INPUT_SELECTORS)),
  injectText: (text) => injectInto(findFirstUsable(INPUT_SELECTORS), text)
}
