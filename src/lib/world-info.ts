import type { Locale, WorldInfoEntry, WorldInfoPosition, WorldInfoRole } from "../types"
import { translate } from "./i18n"

/** Positions that fold a `constant` (alwaysActive) entry into the one-time
 *  activation message (persona-message.ts) rather than re-injecting it on
 *  every Enrich tap. `at_depth` is deliberately excluded — it belongs in the
 *  Enrich block, ordered by `depth`. */
const ACTIVATION_POSITIONS: readonly WorldInfoPosition[] = [
  "before_desc",
  "after_desc",
  "personality",
  "scenario"
]

/**
 * A `constant`/alwaysActive entry pinned to a description slot is emitted once,
 * inside the activation message (buildPersonaMessage) — so the Enrich scanner
 * must skip it to avoid re-injecting the same lore on every tap. Memory notes
 * (alwaysActive, no position) and `at_depth` constants are NOT folded and keep
 * firing per-tap.
 */
export function isActivationFolded(entry: WorldInfoEntry): boolean {
  return (
    !!entry.alwaysActive && !!entry.position && ACTIVATION_POSITIONS.includes(entry.position)
  )
}

// Cap key length before compiling a user/card-supplied regex. The scanned
// draft is the user's own (short) message, so a modest cap plus try/catch
// keeps catastrophic backtracking bounded without a real timeout mechanism.
const MAX_REGEX_KEY_LENGTH = 200

function keyMatches(key: string, draft: string, draftLower: string, useRegex?: boolean): boolean {
  const k = key.trim()
  if (!k) return false
  if (useRegex && k.length <= MAX_REGEX_KEY_LENGTH) {
    try {
      return new RegExp(k, "i").test(draft)
    } catch {
      // Malformed pattern — fall through to literal substring matching.
    }
  }
  return draftLower.includes(k.toLowerCase())
}

/**
 * Simplified stand-in for SillyTavern's World Info scanner. ST supports
 * recursion, selective keys, probability, case sensitivity, and tunable scan
 * depth against full chat history — all of that assumes per-request API
 * access to inject invisibly. We only get one shot per enrich-tap, scanning
 * the user's own draft, so flat substring (or opt-in regex) matching covers
 * the value at a fraction of the complexity.
 */
export function matchWorldInfo(
  entries: WorldInfoEntry[] | undefined,
  text: string,
  alreadyTriggered: Set<string>
): WorldInfoEntry[] {
  if (!entries || entries.length === 0) return []

  const draft = text.trim()
  // Empty draft still lets `alwaysActive` entries (memory notes) fire on their
  // own; only keyword matching needs actual draft text.
  const draftLower = draft.toLowerCase()

  return entries.filter((entry) => {
    if (!entry.enabled) return false
    // Emitted once inside the activation message — never re-inject via Enrich.
    if (isActivationFolded(entry)) return false
    // Checked before `alreadyTriggered`: a memory note's whole point is that
    // it keeps resurfacing on every future tap, unlike keyword-matched lore
    // which is meant to fire once per session so it doesn't repeat itself
    // every time the same word comes up again.
    if (entry.alwaysActive) return true
    if (alreadyTriggered.has(entry.id)) return false
    if (!draft) return false
    return entry.keys.some((key) => keyMatches(key, draft, draftLower, entry.useRegex))
  })
}

/** Ordering within a single Enrich message: larger `depth` sits farther from
 *  the user's draft (rendered higher up); ties broken by ascending `order`
 *  (V3 insertion_order). Both default to 0. */
function byDepthThenOrder(a: WorldInfoEntry, b: WorldInfoEntry): number {
  const depthDiff = (b.depth ?? 0) - (a.depth ?? 0)
  if (depthDiff !== 0) return depthDiff
  return (a.order ?? 0) - (b.order ?? 0)
}

/** Visible framing prefix for an injected lore block. `system`/`assistant`
 *  get a localized label; `user`/absent keep the plain 📖 marker. Purely
 *  cosmetic — there is no real role turn (we only have one user input box). */
export function loreLabel(role: WorldInfoRole | undefined, locale: Locale): string {
  if (role === "system") return translate(locale, "worldbook.label.system")
  if (role === "assistant") return translate(locale, "worldbook.label.assistant")
  return "📖"
}

/**
 * Prepends matched lore and/or a drift reminder above the user's own typed
 * text. Kept visible and clearly delimited (📖 / role label / 🎭) rather than
 * hidden, so the composed message stays legible in the chat transcript.
 */
export function composeEnrichedMessage(
  userText: string,
  matched: WorldInfoEntry[],
  driftReminder: string | undefined,
  locale: Locale
): string {
  const blocks: string[] = []

  for (const entry of [...matched].sort(byDepthThenOrder)) {
    blocks.push(`${loreLabel(entry.role, locale)} ${entry.content.trim()}`)
  }

  if (driftReminder?.trim()) {
    blocks.push(`🎭 ${driftReminder.trim()}`)
  }

  if (blocks.length === 0) return userText

  return [...blocks, "", userText].join("\n")
}
