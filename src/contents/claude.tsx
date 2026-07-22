import cssText from "data-text:~/style.css"
import type { PlasmoCSConfig, PlasmoGetShadowHostId, PlasmoGetStyle } from "plasmo"

import { PlatformOverlay } from "~components/PlatformOverlay"

/** Claude.ai's assistant reply text block — the clean answer body, without the
 *  screen-reader "Claude responded:" prefix that wraps it (see
 *  docs/claude-dom-notes.md). */
const ASSISTANT_REPLY_SELECTOR = "div.font-claude-response"

export const config: PlasmoCSConfig = {
  matches: ["https://claude.ai/*"],
  all_frames: false
}

export const getShadowHostId: PlasmoGetShadowHostId = () => "persona-chat-root-claude"

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function ClaudeOverlay() {
  return <PlatformOverlay assistantReplySelector={ASSISTANT_REPLY_SELECTOR} />
}
