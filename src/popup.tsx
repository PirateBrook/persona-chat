import { useEffect, useState } from "react"

import "./style.css"

import appIcon from "../assets/icon.png"
import { feedbackUrl } from "~lib/feedback"
import { useI18n } from "~lib/i18n"
import { getAppState, getPersona } from "~storage"
import type { PersonaCard } from "~types"

/**
 * Popup is a status surface + options-page launcher: users spend their time
 * on the DeepSeek page overlay, not the toolbar dropdown. Shows which
 * persona is live so the toolbar answers "what mode am I in?" without
 * switching tabs.
 */
export default function Popup() {
  const { t } = useI18n()
  const [activePersona, setActivePersona] = useState<PersonaCard | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void (async () => {
      const state = await getAppState()
      if (state.activePersonaId) {
        setActivePersona(await getPersona(state.activePersonaId))
      }
      setLoaded(true)
    })()
  }, [])

  return (
    <div className="w-72 bg-white p-4 font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-4 flex items-center gap-2">
        <img src={appIcon} alt="" className="h-5 w-5 rounded-full" />
        <span className="text-sm font-semibold tracking-tight">Persona</span>
      </div>

      {loaded && activePersona ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-persona-100 bg-persona-50/70 p-3 dark:border-persona-900/60 dark:bg-persona-950/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm dark:bg-gray-800" aria-hidden>
            {activePersona.avatarEmoji || "🎭"}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{activePersona.name}</div>
            <div className="flex items-center gap-1 text-[11px] text-persona-600 dark:text-persona-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t("popup.activeOn")}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {t("popup.hint")}
        </div>
      )}

      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="w-full rounded-lg bg-persona-600 py-2 text-xs font-medium text-white transition hover:bg-persona-700"
      >
        {t("popup.manage")}
      </button>

      <a
        href={feedbackUrl("inapp")}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block text-center text-[11px] text-gray-400 underline decoration-gray-300 decoration-dotted underline-offset-4 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {t("popup.feedback")}
      </a>
    </div>
  )
}
