import { useState } from "react"

import { getActiveAdapter } from "../lib/adapters"
import { useI18n } from "../lib/i18n"
import { buildSummaryPrompt } from "../lib/memory"
import { INPUT_BASE_CLS } from "../lib/styles"
import { useMemoryNote } from "../lib/use-memory-note"
import type { PersonaCard } from "../types"

interface Props {
  persona: PersonaCard
  /** Same per-platform selector PlatformOverlay reads for TTS — the "📥 use last
   *  reply" action reads the last assistant message so the user can save the
   *  model's own summary as memory without retyping it. */
  assistantReplySelector: string
  /** Reuses PlatformOverlay's pill toast so injection feedback matches the
   *  Enrich / Guard pills (this card closes on inject, so a shared toast reads
   *  better than an inline one that would vanish with the card). */
  onToast: (msg: string) => void
}

/**
 * The memory hub. Collapsed it's a "📌" pill (a flex child of PlatformOverlay's
 * pill rail, same shape as the "✨ Enrich" pill). Expanded it's a small card
 * that gathers the three memory actions in one place:
 *   - type/edit a note by hand (prefilled from the chat draft — flagging what
 *     you just wrote is the common case);
 *   - "🧠 Summarize with AI" — inject a visible "recap the story so far" prompt
 *     into the chat input (user presses Enter, the model summarizes its own
 *     context — the zero-cost memory mechanism, see lib/memory.ts);
 *   - "📥 Use last reply" — pull the model's last reply into the textarea so its
 *     summary can be reviewed/edited, then saved.
 * Saving writes straight through `upsertPersona`; the content script's own
 * storage-change subscription (deepseek.tsx) picks up the new persona, so this
 * component doesn't hand anything back to its parent.
 */
export function MemoryNotePrompt({ persona, assistantReplySelector, onToast }: Props) {
  const { t, locale } = useI18n()
  const { saveMemory } = useMemoryNote()
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  function open() {
    const draft = getActiveAdapter()?.readDraftText().trim() ?? ""
    setText(draft)
    setExpanded(true)
  }

  function cancel() {
    setExpanded(false)
    setText("")
  }

  async function save() {
    if (!text.trim() || saving) return
    setSaving(true)
    await saveMemory(persona, text.trim())
    setSaving(false)
    setExpanded(false)
    setText("")
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  /**
   * Injects the locale-aware summary prompt above whatever's in the draft —
   * same visible-injection mechanic as the Guard pill (readDraftText →
   * injectText, no auto-send). Non-destructive: an existing draft is preserved
   * below the prompt (plain concatenation, not a template literal — the same
   * astral-emoji-before-`${` build truncation the Guard button documents), so
   * the user can trim it before pressing Enter. Closes the card; feedback goes
   * through the shared pill toast.
   */
  async function summarize() {
    const adapter = getActiveAdapter()
    if (!adapter) {
      onToast(t("toast.injectFailed"))
      return
    }
    const draft = adapter.readDraftText()
    const prompt = buildSummaryPrompt(locale)
    const composed = draft ? prompt + "\n\n" + draft : prompt
    const result = await adapter.injectText(composed)
    if (result.ok && result.method === "dom-injection") {
      onToast(t("toast.summaryInjected"))
    } else if (result.ok && result.method === "clipboard-fallback") {
      onToast(t("toast.clipboard"))
    } else {
      onToast(t("toast.injectFailed"))
    }
    setExpanded(false)
  }

  /** Reads the last assistant reply (same selector TTS reads) into the textarea
   *  for review before saving — the model's summary becomes the memory draft. */
  function pullLastReply() {
    const replies = document.querySelectorAll(assistantReplySelector)
    const last = replies[replies.length - 1]
    const reply = last?.textContent?.trim()
    if (!reply) {
      onToast(t("memory.pullReplyEmpty"))
      return
    }
    setText(reply)
  }

  if (!expanded) {
    return (
      <button
        onClick={open}
        className="flex h-9 items-center gap-1.5 rounded-full border border-gray-200/80 bg-white/95 px-3.5 text-[12px] font-medium text-gray-700 shadow-md backdrop-blur transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 dark:border-gray-700 dark:bg-gray-800/95 dark:text-gray-200"
      >
        <span aria-hidden>📌</span> {justSaved ? t("memory.saved") : t("pill.memory")}
      </button>
    )
  }

  const ghostBtn =
    "rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"

  return (
    <div className="fixed bottom-[4.6rem] right-6 z-[999999] w-72 max-w-[calc(100vw-3rem)] space-y-2 rounded-2xl border border-gray-200/80 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={t("memory.placeholder")}
        className={`w-full resize-none bg-gray-50/60 px-2.5 py-1.5 text-xs ${INPUT_BASE_CLS}`}
      />
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void summarize()} title={t("memory.summarizeHint")} className={ghostBtn}>
          {t("memory.summarize")}
        </button>
        <button onClick={pullLastReply} className={ghostBtn}>
          {t("memory.pullReply")}
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={cancel}
          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={save}
          disabled={!text.trim() || saving}
          className="rounded-lg bg-persona-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-persona-700 disabled:opacity-50"
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  )
}
