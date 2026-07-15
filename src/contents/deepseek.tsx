import cssText from "data-text:~/style.css"
import type { PlasmoCSConfig, PlasmoGetShadowHostId, PlasmoGetStyle } from "plasmo"
import { useState } from "react"

import { FloatingButton } from "~components/FloatingButton"
import { PersonaPanel } from "~components/PersonaPanel"

export const config: PlasmoCSConfig = {
  matches: ["https://chat.deepseek.com/*"],
  all_frames: false
}

export const getShadowHostId: PlasmoGetShadowHostId = () => "persona-chat-root"

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

/**
 * Root content-script UI. Kept as a lean shell: the floating button toggles a
 * fixed-position panel that hosts all product surface. If a future refactor
 * needs to move the panel into a sidebar or overlay, only this file changes.
 */
export default function DeepSeekOverlay() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <FloatingButton open={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div className="fixed bottom-24 right-6 z-[999998] w-96 max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <PersonaPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
