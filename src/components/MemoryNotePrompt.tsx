import { useState } from "react"

import { getActiveAdapter } from "../lib/adapters"
import { useI18n } from "../lib/i18n"
import { INPUT_BASE_CLS } from "../lib/styles"
import { useMemoryNote } from "../lib/use-memory-note"
import type { PersonaCard } from "../types"

interface Props {
  persona: PersonaCard
}

/**
 * Collapsed state is a "📌" pill, the same shape as the "✨ Enrich" pill it
 * sits alongside. Expanding pre-fills the note from whatever's currently
 * typed in the chat input — flagging something you just wrote is the common
 * case — but starts blank if the draft is empty, rather than forcing the
 * user to clear text that isn't theirs to begin with. Saving writes straight
 * through `upsertPersona`; the content script's own storage-change
 * subscription (see deepseek.tsx) picks up the new persona automatically, so
 * this component doesn't need to hand anything back to its parent.
 */
export function MemoryNotePrompt({ persona }: Props) {
  const { t } = useI18n()
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

  if (!expanded) {
    return (
      <button
        onClick={open}
        className="fixed bottom-[4.6rem] right-56 z-[999999] flex h-9 items-center gap-1.5 rounded-full border border-gray-200/80 bg-white/95 px-3.5 text-[11px] font-medium text-gray-700 shadow-md backdrop-blur transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 dark:border-gray-700 dark:bg-gray-800/95 dark:text-gray-200"
      >
        <span aria-hidden>📌</span> {justSaved ? t("memory.saved") : t("pill.memory")}
      </button>
    )
  }

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
