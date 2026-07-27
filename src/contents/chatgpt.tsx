import cssText from "data-text:~/style.css"
import type { PlasmoCSConfig, PlasmoGetShadowHostId, PlasmoGetStyle } from "plasmo"

import { PlatformOverlay } from "~components/PlatformOverlay"

/** ChatGPT's per-message role marker — a semantic data attribute (not a hash
 *  class), confirmed via docs/chatgpt-dom-notes.md §3. Each message div
 *  carries `data-message-author-role="user"` or `"assistant"`. */
const ASSISTANT_REPLY_SELECTOR = '[data-message-author-role="assistant"]'

export const config: PlasmoCSConfig = {
  matches: ["https://chatgpt.com/*"],
  all_frames: false
}

export const getShadowHostId: PlasmoGetShadowHostId = () => "persona-chat-root-chatgpt"

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function ChatGPTOverlay() {
  return <PlatformOverlay assistantReplySelector={ASSISTANT_REPLY_SELECTOR} />
}
