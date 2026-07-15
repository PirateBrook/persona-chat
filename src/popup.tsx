import { useEffect, useState } from "react"

import "./style.css"

import { getAppState, getPersona } from "~storage"
import type { PersonaCard } from "~types"

/**
 * Popup is a status surface + options-page launcher: users spend their time
 * on the DeepSeek page overlay, not the toolbar dropdown. Shows which
 * persona is live so the toolbar answers "what mode am I in?" without
 * switching tabs.
 */
export default function Popup() {
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
        <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-persona-400 to-persona-600" />
        <span className="text-sm font-semibold tracking-tight">Persona</span>
      </div>

      {loaded && activePersona ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-persona-100 bg-persona-50/70 p-3 dark:border-persona-900/60 dark:bg-persona-950/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm dark:bg-gray-800" aria-hidden>
            {activePersona.avatarEmoji || "🎭"}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{activePersona.name}</div>
            <div className="flex items-center gap-1 text-[10px] text-persona-600 dark:text-persona-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active on chat.deepseek.com
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          Open <span className="font-semibold text-gray-900 dark:text-gray-100">chat.deepseek.com</span>{" "}
          — the Persona button appears bottom-right.
        </div>
      )}

      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="w-full rounded-lg bg-persona-600 py-2 text-xs font-medium text-white transition hover:bg-persona-700"
      >
        Manage personas
      </button>
    </div>
  )
}
