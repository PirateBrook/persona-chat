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

      {canEnrich && !open && (
        <button
          onClick={handleEnrich}
          className="fixed bottom-[4.6rem] right-6 z-[999999] flex h-9 items-center gap-1.5 rounded-full border border-gray-200/80 bg-white/95 px-3.5 text-[11px] font-medium text-gray-700 shadow-md backdrop-blur transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 dark:border-gray-700 dark:bg-gray-800/95 dark:text-gray-200"
        >
          <span aria-hidden>✨</span> Enrich
        </button>
      )}

      {pillToast && (
        <div className="fixed bottom-[7.2rem] right-6 z-[999999] max-w-xs animate-fade-up rounded-xl bg-gray-900/95 px-3.5 py-2.5 text-xs font-medium text-white shadow-lg backdrop-blur dark:bg-white/95 dark:text-gray-900">
          {pillToast}
        </div>
      )}

      {open && (
        <div className="fixed bottom-[5.2rem] right-6 z-[999998] w-[360px] max-w-[calc(100vw-3rem)] animate-fade-up overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-gray-900 shadow-2xl shadow-gray-900/10 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
          <PersonaPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
