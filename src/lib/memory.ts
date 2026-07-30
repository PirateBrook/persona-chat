import type { Locale, PersonaCard } from "../types"
import { translate } from "./i18n"

/**
 * Zero-cost long-conversation memory (Stage 2 direction 2, A-only). Rather than
 * running a paid summarizer/embedding model over the transcript (which would
 * break the zero-cost + zero-network red lines, and can't work anyway since the
 * transcript is virtualized out of the DOM — see docs/prd/zerocost-memory-spike.md),
 * we let the user's OWN free chat summarize its own context: inject a visible
 * "recap the story so far" prompt, the user presses Enter, and the model — which
 * already holds its own context — replies with a summary. The user then saves
 * that reply as an alwaysActive `source:"memory"` WorldInfoEntry (use-memory-note.ts),
 * so it re-injects on every future Enrich. This module is the pure-function core
 * of that loop: the prompt text and the budget accounting. No side effects, no
 * chrome.* — deliberately Node-testable (pc-test 手段 A).
 */

/** How many bullet points the summary prompt asks the model for. A constant,
 *  not user-configurable (PRD non-goal) — 5 is enough to pin the load-bearing
 *  setting without bloating the alwaysActive blob that re-injects every Enrich. */
export const MEMORY_SUMMARY_BULLETS = 5

/** Soft ceiling (in characters) on a persona's total saved-memory content.
 *  Memory entries are alwaysActive, so ALL of them re-inject on every Enrich —
 *  unbounded growth both slows storage's whole-object JSON serialization
 *  (image-resize.ts warns about the same large-string cost) and dilutes the
 *  live context. This is a WARNING threshold surfaced in the options editor, not
 *  an auto-truncation limit: we never silently delete a user's saved memory
 *  (human-in-loop — they merge/delete themselves). Purely advisory, safe to tune. */
export const MEMORY_CHAR_BUDGET = 4000

/**
 * Builds the locale-aware "summarize our story so far" prompt the 🧠 button
 * injects into the chat input (visible; the user presses Enter). Mirrors
 * buildMacroContext/buildPersonaMessage in threading through `translate` so a
 * zh user never gets an English instruction that would drag the conversation's
 * language off course. Deliberately macro-free ({{char}}/{{user}} not expanded):
 * a scene can have several characters, so the generic "the characters" phrasing
 * in the template is safer than naming one. `{count}` is interpolated by the
 * i18n layer's `{token}` substitution.
 */
export function buildSummaryPrompt(locale: Locale): string {
  return translate(locale, "memory.summaryPrompt", { count: MEMORY_SUMMARY_BULLETS })
}

/** How much saved memory a persona is carrying, for the options-page usage
 *  indicator. Counts ONLY `source:"memory"` entries (hand-authored world info is
 *  the user's deliberate lore, not subject to the memory budget) and sums their
 *  content length. `chars` drives the MEMORY_CHAR_BUDGET warning. */
export function estimateMemoryUsage(persona: PersonaCard): { count: number; chars: number } {
  const memoryEntries = (persona.worldInfo ?? []).filter((e) => e.source === "memory")
  return {
    count: memoryEntries.length,
    chars: memoryEntries.reduce((sum, e) => sum + e.content.length, 0)
  }
}

/** Whether a persona's saved memory has crossed the advisory budget (drives the
 *  warning styling/copy in the options editor). */
export function isMemoryOverBudget(persona: PersonaCard): boolean {
  return estimateMemoryUsage(persona).chars > MEMORY_CHAR_BUDGET
}
