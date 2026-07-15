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
    <div className="w-72 bg-white p-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-3">
        <div className="text-base font-semibold">Persona.chat</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Give your AI a persona.
        </div>
      </div>

      {loaded && activePersona ? (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-persona-50 p-3 dark:bg-gray-800">
          <span className="text-2xl leading-none" aria-hidden>
            {activePersona.avatarEmoji || "🎭"}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-persona-700 dark:text-persona-100">
              {activePersona.name}
            </div>
            <div className="text-[10px] text-persona-600/70 dark:text-gray-400">
              Active on chat.deepseek.com
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 rounded-lg bg-persona-50 p-3 text-xs text-persona-700 dark:bg-gray-800 dark:text-persona-100">
          Open <span className="font-semibold">chat.deepseek.com</span> — the
          Persona.chat button appears bottom-right.
        </div>
      )}

      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="w-full rounded-md bg-persona-600 py-2 text-sm font-medium text-white hover:bg-persona-700"
      >
        Manage personas
      </button>
    </div>
  )
}
