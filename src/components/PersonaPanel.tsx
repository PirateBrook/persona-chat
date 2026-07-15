import { useEffect, useState, type FC } from "react"

import { getActiveAdapter, type InjectResult } from "../lib/adapters"
import { extensionContext } from "../lib/extension-context"
import { useI18n } from "../lib/i18n"
import { buildPersonaMessage } from "../lib/persona-message"
import { ensureSeeds, getAppState, setAppState } from "../storage"
import type { AppState, Locale, ModeKey, PersonaCard } from "../types"
import { BackgroundPicker } from "./BackgroundPicker"
import { ModeTabs } from "./ModeTabs"
import { PersonaList } from "./PersonaList"

/**
 * Applying a persona: inject the wrapped persona message into the active
 * platform's chat input via its adapter. Falls back to clipboard if the
 * input can't be located (DOM change, unknown UI variant, or unsupported
 * host).
 */
async function applyPersona(persona: PersonaCard, locale: Locale): Promise<InjectResult> {
  const adapter = getActiveAdapter()
  if (!adapter) {
    return { ok: false, method: "clipboard-fallback", error: "unsupported_host" }
  }
  const message = buildPersonaMessage(persona, locale)
  return await adapter.injectText(message)
}

interface Props {
  onClose: () => void
}

const CloseIcon: FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M4 4L12 12M12 4L4 12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

export const PersonaPanel: FC<Props> = ({ onClose }) => {
  const { t, locale } = useI18n()
  const [state, setState] = useState<AppState | null>(null)
  const [personas, setPersonas] = useState<PersonaCard[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [contextInvalidated, setContextInvalidated] = useState(false)

  useEffect(() => {
    // Subscribe first so a context death while loading routes through the
    // banner instead of surfacing as blank state.
    const unsubscribe = extensionContext.subscribe(setContextInvalidated)
    void getAppState().then(setState)
    return unsubscribe
  }, [])

  useEffect(() => {
    // Installs missing seeds and refreshes non-customized ones to the
    // current locale. Re-running on every `locale` change (not just mount)
    // is what makes flipping the language pref re-expand already-installed
    // seed personas in place instead of freezing at whichever language they
    // were first installed in.
    void ensureSeeds(locale).then(setPersonas)
  }, [locale])

  async function handleModeChange(mode: ModeKey) {
    const next = await setAppState({ activeMode: mode })
    setState(next)
  }

  async function handleBackgroundSelect(id: string | null) {
    const next = await setAppState({ activeBackgroundId: id })
    setState(next)
  }

  async function handleDeactivate() {
    const next = await setAppState({ activePersonaId: null, activeBackgroundId: null })
    setState(next)
    showToast(t("toast.deactivated"))
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApply(persona: PersonaCard) {
    const result = await applyPersona(persona, locale)
    const next = await setAppState({
      activePersonaId: persona.id,
      ...(persona.backgroundId ? { activeBackgroundId: persona.backgroundId } : {})
    })
    setState(next)

    if (result.ok && result.method === "dom-injection") {
      showToast(t("toast.ready"))
    } else if (result.ok && result.method === "clipboard-fallback") {
      showToast(t("toast.clipboard"))
    } else {
      showToast(t("toast.injectFailed"))
    }
  }

  if (contextInvalidated) {
    return (
      <div className="flex h-full flex-col font-sans">
        <header className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">Persona</span>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label={t("common.close")}
          >
            <CloseIcon />
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-2 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-persona-50 text-lg dark:bg-gray-800">
            ↻
          </div>
          <div className="mb-1 text-sm font-medium">{t("panel.updatedTitle")}</div>
          <p className="mb-4 max-w-[240px] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {t("panel.updatedBody")}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-persona-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-persona-700"
          >
            {t("panel.refreshPage")}
          </button>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center p-8 font-sans">
        <span className="text-xs text-gray-400">{t("common.loading")}</span>
      </div>
    )
  }

  const activePersona = personas.find((p) => p.id === state.activePersonaId) ?? null
  // Legacy "original" mode maps to the persona surface (tab was removed).
  const effectiveMode: ModeKey = state.activeMode === "original" ? "persona" : state.activeMode

  return (
    <div className="relative flex h-full flex-col font-sans">
      <header className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gradient-to-br from-persona-400 to-persona-600" />
          <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Persona
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label={t("common.close")}
        >
          <CloseIcon />
        </button>
      </header>

      <ModeTabs active={effectiveMode} onChange={handleModeChange} />

      {activePersona && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl border border-persona-100 bg-persona-50/70 px-3 py-2 dark:border-persona-900/60 dark:bg-persona-950/40">
          <span className="text-lg leading-none" aria-hidden>
            {activePersona.avatarEmoji || "🎭"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
              {activePersona.name}
            </div>
            <div className="text-[10px] text-persona-600 dark:text-persona-300">
              {t("common.active")}
            </div>
          </div>
          <button
            onClick={handleDeactivate}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-gray-500 transition hover:bg-white hover:text-gray-800 hover:shadow-sm dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {t("panel.deactivate")}
          </button>
        </div>
      )}

      <main className="scrollbar-slim mt-1 flex-1 overflow-y-auto pb-2">
        {effectiveMode === "image" && (
          <BackgroundPicker
            activeBackgroundId={state.activeBackgroundId}
            onSelect={handleBackgroundSelect}
          />
        )}
        {effectiveMode === "persona" && (
          <PersonaList
            personas={personas}
            activePersonaId={state.activePersonaId}
            onApply={handleApply}
          />
        )}
      </main>

      {toast && (
        <div className="pointer-events-none absolute inset-x-4 bottom-3 animate-fade-up">
          <div className="rounded-xl bg-gray-900/95 px-3.5 py-2.5 text-center text-xs font-medium text-white shadow-lg backdrop-blur dark:bg-white/95 dark:text-gray-900">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
