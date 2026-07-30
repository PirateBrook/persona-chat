import { useEffect, useState } from "react"

import { FloatingButton } from "~components/FloatingButton"
import { MemoryNotePrompt } from "~components/MemoryNotePrompt"
import { PersonaPanel } from "~components/PersonaPanel"
import { getActiveAdapter } from "~lib/adapters"
import { applyBackground } from "~lib/backgrounds"
import { useI18n } from "~lib/i18n"
import { buildMacroContext, expandMacros } from "~lib/macros"
import { applyPageTweaks } from "~lib/page-tweaks"
import { subscribeStorageChanged } from "~lib/storage-events"
import { speak } from "~lib/tts"
import { describeEnrichOutcome, usePersonaEnrich } from "~lib/use-persona-enrich"
import { getAppState, getPersona, setAppState } from "~storage"
import { DEFAULT_APP_STATE, type PersonaCard, type TtsPreference } from "~types"

/**
 * Shared content-script overlay for every supported platform. The floating
 * button toggles the panel (all create/browse/apply surface lives there). This
 * shell also owns things that must survive independent of whether the panel
 * is open: the persona background (applied to the real page, not the shadow
 * root), the "✨ Enrich" pill (needs the active persona to run world-info
 * matching without requiring the panel to be open), and the "🎭 Guard"
 * anti-cross-talk button (same visible-injection mechanic as Enrich, but a
 * one-off macro-expanded reminder rather than world-info/drift matching —
 * available whenever a persona is active, independent of `canEnrich`).
 *
 * The only per-platform difference is `assistantReplySelector` — the DOM the
 * TTS pill reads aloud and the enrich pill uses to detect a reply exists. The
 * thin per-site content scripts (contents/deepseek.tsx, contents/claude.tsx)
 * pass their own selector and declare their own config / shadow-host id.
 */
/** Shared look for the overlay's icon-only action buttons (Enrich / Guard /
 *  Memory / TTS) — a 36px circular pill matching the FloatingButton's language. */
const ICON_BTN_CLS =
  "flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/80 bg-white/95 text-sm shadow-md backdrop-blur transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 dark:border-gray-700 dark:bg-gray-800/95"

export function PlatformOverlay({
  assistantReplySelector
}: {
  assistantReplySelector: string
}) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [activePersona, setActivePersona] = useState<PersonaCard | null>(null)
  const [pillToast, setPillToast] = useState<string | null>(null)
  const [tts, setTts] = useState<TtsPreference>(DEFAULT_APP_STATE.tts)
  const [hasAssistantReply, setHasAssistantReply] = useState(false)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [seenHint, setSeenHint] = useState(true)
  const { enrich } = usePersonaEnrich(activePersona, locale, userName)

  useEffect(() => {
    void refresh()

    return subscribeStorageChanged((changes, area) => {
      if (area !== "local") return
      if (changes.appState || changes.personas) void refresh()
    })
  }, [])

  useEffect(() => {
    // Virtualized message lists (DeepSeek is, Claude may be for long chats) —
    // a reply can mount/unmount as the user scrolls or as streaming finishes,
    // so presence is tracked live rather than checked once. Debounced since a
    // streaming reply mutates the DOM continuously.
    function checkReply() {
      setHasAssistantReply(document.querySelectorAll(assistantReplySelector).length > 0)
    }
    checkReply()

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let observer: MutationObserver | null = null
    try {
      observer = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(checkReply, 200)
      })
      observer.observe(document.body, { childList: true, subtree: true })
    } catch {
      // MutationObserver unavailable in some odd context — pill just won't
      // live-update; it'll still reflect reality on next mount/refresh.
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      observer?.disconnect()
    }
  }, [assistantReplySelector])

  async function refresh() {
    const state = await getAppState()
    void applyBackground(state.activeBackgroundId)
    applyPageTweaks(state.pageTweaks)
    setTts(state.tts ?? DEFAULT_APP_STATE.tts)
    setUserName(state.userName)
    setSeenHint(!!state.hasSeenOverlayHint)

    if (!state.activePersonaId) {
      setActivePersona(null)
      return
    }
    setActivePersona(await getPersona(state.activePersonaId))
  }

  /** Permanently dismisses the one-time overlay coach-mark. Optimistic local
   *  update so it disappears instantly; the storage write is fire-and-forget
   *  (the storage-change subscription would reconcile it anyway). */
  function dismissHint() {
    setSeenHint(true)
    void setAppState({ hasSeenOverlayHint: true })
  }

  /** Shows a transient pill toast (auto-clears after 3s). Shared by every
   *  floating action — Enrich, Guard, and the memory card's inject feedback —
   *  so they read identically. */
  function showPillToast(msg: string) {
    setPillToast(msg)
    setTimeout(() => setPillToast(null), 3000)
  }

  function handleSpeak() {
    const replies = document.querySelectorAll(assistantReplySelector)
    const last = replies[replies.length - 1]
    if (!last?.textContent) return
    speak(last.textContent, tts)
  }

  async function handleEnrich() {
    const outcome = await enrich()
    showPillToast(describeEnrichOutcome(outcome, locale))
  }

  /**
   * Anti-cross-talk guard: a one-off, macro-expanded reminder prepended above
   * whatever's currently in the draft — same visible-injection mechanic as
   * Enrich (readDraftText → injectText, no auto-send), but independent of it.
   * Not tracked in turn/trigger state; every click is a fresh, standalone
   * injection.
   */
  async function handleGuard() {
    const adapter = getActiveAdapter()
    if (!adapter || !activePersona) return
    const draft = adapter.readDraftText()
    const ctx = buildMacroContext(activePersona.name, userName, locale)
    const reminder = expandMacros(t("guard.reminder"), ctx)
    // Plain concatenation, not a template literal: the production build
    // truncates a raw astral emoji to a lone high surrogate whenever it sits
    // directly before a template literal's `${` (confirmed in the built
    // bundle during pc-test real-machine checks, 2026-07-27) — `+` avoids it.
    const composed = draft ? "🎭 " + reminder + "\n\n" + draft : "🎭 " + reminder
    const result = await adapter.injectText(composed)
    if (result.ok && result.method === "dom-injection") {
      showPillToast(t("toast.ready"))
    } else if (result.ok && result.method === "clipboard-fallback") {
      showPillToast(t("toast.clipboard"))
    } else {
      showPillToast(t("toast.injectFailed"))
    }
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

      {/* Vertical icon stack anchored above the FloatingButton, occupying only
          the far-right column (w-12, same as the FAB, so items-center lines the
          icons up with it) — it never reaches leftward into the page's own
          centered chat box / send controls the way the old labeled horizontal
          rail did. Icon-only with hover tooltips; discoverability is carried by
          the tooltips, the first-run coach-mark below, and the options "How it
          works" section. flex-col-reverse puts Enrich (the primary action) at
          the bottom, nearest the FAB. MemoryNotePrompt's collapsed pill is one
          more stack item; its expanded card is `fixed` and overlays as before. */}
      {!open && (
        <div className="fixed bottom-[4.6rem] right-6 z-[999999] flex w-12 flex-col-reverse items-center gap-2">
          {canEnrich && (
            <button
              onClick={handleEnrich}
              aria-label={t("pill.enrich")}
              title={t("tooltip.enrich")}
              className={ICON_BTN_CLS}
            >
              <span aria-hidden>✨</span>
            </button>
          )}

          {!!activePersona && (
            <button
              onClick={() => void handleGuard()}
              aria-label={t("guard.button")}
              title={t("tooltip.guard")}
              className={ICON_BTN_CLS}
            >
              <span aria-hidden>🎭</span>
            </button>
          )}

          {!!activePersona && (
            <MemoryNotePrompt
              persona={activePersona}
              assistantReplySelector={assistantReplySelector}
              onToast={showPillToast}
            />
          )}

          {tts.enabled && hasAssistantReply && (
            <button
              onClick={handleSpeak}
              aria-label={t("tts.play")}
              title={t("tts.play")}
              className={ICON_BTN_CLS}
            >
              <span aria-hidden>🔊</span>
            </button>
          )}
        </div>
      )}

      {/* One-time coach-mark: the "it writes into the box, you press Enter"
          flow is genuinely non-obvious, and the icon-only stack no longer
          spells the actions out. Sits to the LEFT of the stack (right-[4.75rem]
          clears the w-12 column at right-6) so it points at the icons without
          covering them. Dismissed forever on tap. */}
      {!open && !seenHint && !!activePersona && (
        <div className="fixed bottom-[4.6rem] right-[4.75rem] z-[999999] w-56 max-w-[calc(100vw-5.5rem)] animate-fade-up rounded-2xl border border-gray-200/80 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
          <div className="mb-1 text-xs font-semibold text-gray-900 dark:text-gray-50">
            {t("hint.title")}
          </div>
          <p className="mb-2.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
            {t("hint.body")}
          </p>
          <div className="flex justify-end">
            <button
              onClick={dismissHint}
              className="rounded-lg bg-persona-600 px-3 py-1 text-[11px] font-medium text-white shadow-sm transition hover:bg-persona-700"
            >
              {t("hint.dismiss")}
            </button>
          </div>
        </div>
      )}

      {pillToast && (
        <div className="fixed bottom-[7.2rem] right-6 z-[999999] max-w-xs animate-fade-up rounded-xl bg-gray-900/95 px-3.5 py-2.5 text-xs font-medium text-white shadow-lg backdrop-blur dark:bg-white/95 dark:text-gray-900">
          {pillToast}
        </div>
      )}

      {open && (
        <div className="fixed bottom-[5.2rem] right-6 z-[999998] flex max-h-[calc(100dvh-6.5rem)] w-[360px] max-w-[calc(100vw-3rem)] flex-col animate-fade-up overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-gray-900 shadow-2xl shadow-gray-900/10 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
          <PersonaPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
