import { useEffect, useRef } from "react"

import type { Locale, PersonaCard } from "../types"
import { getActiveAdapter } from "./adapters"
import { translate, translatePlural } from "./i18n"
import { composeEnrichedMessage, matchWorldInfo } from "./world-info"

const DRIFT_INTERVAL = 6

export interface EnrichOutcome {
  ok: boolean
  addedLoreCount: number
  addedDrift: boolean
  reason?: "no-persona" | "input-not-found" | "inject-failed"
}

/**
 * One shared "enrich the draft" flow, called from both the floating pill and
 * (later) any in-panel affordance. There's no send-interception here — this
 * only rewrites whatever is currently sitting in the chat input; the human
 * still presses Enter. Turn/trigger state lives in refs so taps accumulate
 * across renders but reset the moment the active persona changes.
 *
 * `userName` is the global {{user}} macro value (AppState.userName, unset =
 * locale-aware fallback) — threaded through to composeEnrichedMessage so
 * matched lore/drift-reminder text expands macros the same way the
 * activation message does.
 */
export function usePersonaEnrich(
  activePersona: PersonaCard | null,
  locale: Locale,
  userName: string | undefined
) {
  const turnCountRef = useRef(0)
  const triggeredRef = useRef<Set<string>>(new Set())
  const personaIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (personaIdRef.current !== (activePersona?.id ?? null)) {
      personaIdRef.current = activePersona?.id ?? null
      turnCountRef.current = 0
      triggeredRef.current = new Set()
    }
  }, [activePersona?.id])

  async function enrich(): Promise<EnrichOutcome> {
    if (!activePersona) {
      return { ok: false, addedLoreCount: 0, addedDrift: false, reason: "no-persona" }
    }

    const adapter = getActiveAdapter()
    if (!adapter) {
      return { ok: false, addedLoreCount: 0, addedDrift: false, reason: "input-not-found" }
    }

    const draft = adapter.readDraftText()
    const matched = matchWorldInfo(activePersona.worldInfo, draft, triggeredRef.current)

    turnCountRef.current += 1
    const driftDue = !!activePersona.driftReminder && turnCountRef.current % DRIFT_INTERVAL === 0

    if (matched.length === 0 && !driftDue) {
      return { ok: true, addedLoreCount: 0, addedDrift: false }
    }

    const composed = composeEnrichedMessage(
      draft,
      matched,
      driftDue ? activePersona.driftReminder : undefined,
      locale,
      activePersona.name,
      userName
    )

    const result = await adapter.injectText(composed)
    if (!result.ok) {
      return { ok: false, addedLoreCount: 0, addedDrift: false, reason: "inject-failed" }
    }

    matched.forEach((m) => triggeredRef.current.add(m.id))

    return { ok: true, addedLoreCount: matched.length, addedDrift: driftDue }
  }

  return { enrich }
}

/**
 * Takes a raw `Locale` and calls `translate`/`translatePlural` directly
 * (matching persona-message.ts's convention) rather than a hook-derived
 * `t`/`tp` pair — this is a plain function usable from anywhere a locale is
 * known, not just from within a component that already called useI18n().
 */
export function describeEnrichOutcome(outcome: EnrichOutcome, locale: Locale): string {
  if (!outcome.ok) {
    return outcome.reason === "inject-failed"
      ? translate(locale, "enrich.failed")
      : translate(locale, "enrich.nothingYet")
  }
  if (outcome.addedLoreCount === 0 && !outcome.addedDrift) {
    return translate(locale, "enrich.nothingNew")
  }
  const parts: string[] = []
  if (outcome.addedLoreCount > 0) {
    parts.push(translatePlural(locale, "enrich.loreNote", outcome.addedLoreCount))
  }
  if (outcome.addedDrift) parts.push(translate(locale, "enrich.reminder"))
  return translate(locale, "enrich.added", { parts: parts.join(" + ") })
}
