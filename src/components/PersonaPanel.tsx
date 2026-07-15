import { useEffect, useState, type FC } from "react"

import { buildPersonaMessage, injectIntoActiveChat } from "../lib/deepseek-injector"
import { extensionContext } from "../lib/extension-context"
import {
  getAppState,
  listPersonas,
  setAppState,
  upsertPersona
} from "../storage"
import { SEED_PERSONAS } from "../seed"
import type { AppState, ModeKey, PersonaCard } from "../types"
import { ModeTabs } from "./ModeTabs"
import { PersonaList } from "./PersonaList"

/**
 * Applying a persona: inject the wrapped persona message into DeepSeek's
 * chat input via React-aware DOM manipulation. Falls back to clipboard if
 * the input can't be located (DOM change, unknown UI variant).
 */
async function applyPersona(persona: PersonaCard) {
  const message = buildPersonaMessage(persona.personaPrompt, persona.greeting)
  return await injectIntoActiveChat(message)
}

interface Props {
  onClose: () => void
}

export const PersonaPanel: FC<Props> = ({ onClose }) => {
  const [state, setState] = useState<AppState | null>(null)
  const [personas, setPersonas] = useState<PersonaCard[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [contextInvalidated, setContextInvalidated] = useState(false)

  useEffect(() => {
    // Subscribe first so bootstrap() failures caused by context death
    // route through the banner instead of surfacing as blank state.
    const unsubscribe = extensionContext.subscribe(setContextInvalidated)
    void bootstrap()
    return unsubscribe
  }, [])

  async function bootstrap() {
    const [initState, initPersonas] = await Promise.all([getAppState(), listPersonas()])
    setState(initState)

    // Incremental seed install: add missing built-ins without touching
    // user-edited or user-created personas. Trade-off: a persona deleted
    // by the user will re-appear on next boot. v0.2 can track deleted
    // seed ids to make deletion sticky.
    const existingIds = new Set(initPersonas.map((p) => p.id))
    const missing = SEED_PERSONAS.filter((s) => !existingIds.has(s.id))

    if (missing.length > 0) {
      for (const seed of missing) {
        await upsertPersona(seed)
      }
      setPersonas(await listPersonas())
    } else {
      setPersonas(initPersonas)
    }
  }

  async function handleModeChange(mode: ModeKey) {
    const next = await setAppState({ activeMode: mode })
    setState(next)
  }

  async function handleApply(persona: PersonaCard) {
    const result = await applyPersona(persona)
    const next = await setAppState({ activePersonaId: persona.id })
    setState(next)

    let message: string
    if (result.ok && result.method === "dom-injection") {
      message = "Persona applied. Press Enter to send."
    } else if (result.ok && result.method === "clipboard-fallback") {
      message = "Input not found; copied to clipboard. Paste to activate."
    } else {
      message = "Failed to apply persona. Try refreshing DeepSeek."
    }

    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }

  if (contextInvalidated) {
    return (
      <div className="flex h-full flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <div className="text-sm font-semibold">Persona.chat</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Reconnecting…</div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Extension was updated
          </div>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Persona.chat reloaded while this tab was open. Refresh the page to
            reconnect — your personas are safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-persona-600 px-4 py-2 text-sm font-medium text-white hover:bg-persona-700"
          >
            Refresh page
          </button>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div>
          <div className="text-sm font-semibold">Persona.chat</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">v0 · Local only</div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <ModeTabs active={state.activeMode} onChange={handleModeChange} />

      <main className="flex-1 overflow-y-auto">
        {state.activeMode === "original" && (
          <div className="p-6 text-sm text-gray-500">
            <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">
              DeepSeek stays untouched.
            </p>
            <p className="opacity-80">
              Switch tabs above when you want to layer a persona or image prompt.
            </p>
          </div>
        )}
        {state.activeMode === "image" && (
          <div className="p-6 text-sm text-gray-500">
            <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">Coming soon</p>
            <p className="opacity-80">
              Image-mode PE + asset library ships in v0.1. Native DeepSeek image gen
              isn't out yet; paid gen via Persona.chat cloud is a v1 feature.
            </p>
          </div>
        )}
        {state.activeMode === "persona" && (
          <PersonaList
            personas={personas}
            activePersonaId={state.activePersonaId}
            onApply={handleApply}
          />
        )}
      </main>

      {toast && (
        <div className="border-t border-gray-200 bg-persona-50 px-4 py-2 text-xs text-persona-700 dark:border-gray-800 dark:bg-gray-800 dark:text-persona-100">
          {toast}
        </div>
      )}
    </div>
  )
}
