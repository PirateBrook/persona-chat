import cssText from "data-text:~/style.css"
import type { PlasmoCSConfig, PlasmoGetShadowHostId, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"

import { FloatingButton } from "~components/FloatingButton"
import { PersonaPanel } from "~components/PersonaPanel"
import { applyBackground } from "~lib/backgrounds"
import { describeEnrichOutcome, usePersonaEnrich } from "~lib/use-persona-enrich"
import { getAppState, getPersona } from "~storage"
import type { PersonaCard } from "~types"

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
 * Root content-script UI. The floating button toggles the panel (all
 * create/browse/apply surface lives there). This shell also owns two things
 * that must survive independent of whether the panel is open: the persona
 * background (applied to the real page, not the shadow root) and the
 * "✨ Enrich" pill, which needs the active persona to run world-info
 * matching without requiring the panel to be open.
 */
export default function DeepSeekOverlay() {
  const [open, setOpen] = useState(false)
  const [activePersona, setActivePersona] = useState<PersonaCard | null>(null)
  const [pillToast, setPillToast] = useState<string | null>(null)
  const { enrich } = usePersonaEnrich(activePersona)

  useEffect(() => {
    void refresh()

    function onStorageChanged(
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) {
      if (area !== "local") return
      if (changes.appState || changes.personas) void refresh()
    }

    try {
      chrome.storage.onChanged.addListener(onStorageChanged)
    } catch {
      // Extension context already gone; PersonaPanel's own guard handles the banner.
    }
    return () => {
      try {
        chrome.storage.onChanged.removeListener(onStorageChanged)
      } catch {
        // no-op
      }
    }
  }, [])

  async function refresh() {
    const state = await getAppState()
    applyBackground(state.activeBackgroundId)

    if (!state.activePersonaId) {
      setActivePersona(null)
      return
    }
    setActivePersona(await getPersona(state.activePersonaId))
  }

  async function handleEnrich() {
    const outcome = await enrich()
    setPillToast(describeEnrichOutcome(outcome))
    setTimeout(() => setPillToast(null), 3000)
  }

  const canEnrich =
    !!activePersona && ((activePersona.worldInfo?.length ?? 0) > 0 || !!activePersona.driftReminder)

  return (
    <>
      <FloatingButton
        open={open}
        activeEmoji={activePersona?.avatarEmoji ?? null}
        onClick={() => setOpen((v) => !v)}
      />

      {canEnrich && (
        <button
          onClick={handleEnrich}
          className="fixed bottom-6 right-24 z-[999999] flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-lg transition hover:shadow-xl dark:bg-gray-800 dark:text-gray-200"
        >
          <span aria-hidden>✨</span> Enrich
        </button>
      )}

      {pillToast && (
        <div className="fixed bottom-[4.5rem] right-6 z-[999999] max-w-xs rounded-lg bg-gray-900/90 px-3 py-2 text-xs text-white shadow-lg">
          {pillToast}
        </div>
      )}

      {open && (
        <div className="fixed bottom-24 right-6 z-[999998] w-96 max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <PersonaPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
