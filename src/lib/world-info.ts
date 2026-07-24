import type { Locale, WorldInfoEntry, WorldInfoPosition, WorldInfoRole } from "../types"
import { translate } from "./i18n"

/** Positions that also fold a `constant` (alwaysActive) entry into the
 *  one-time activation message (persona-message.ts), as an extra copy placed
 *  near the persona description. `at_depth` is excluded — it has no
 *  description slot to fold into. */
const ACTIVATION_POSITIONS: readonly WorldInfoPosition[] = [
  "before_desc",
  "after_desc",
  "personality",
  "scenario"
]

/**
 * True when a constant entry ALSO gets a copy folded into the activation
 * message's description slot (see buildPersonaMessage). This is ADDITIVE: the
 * entry still fires on every Enrich like any alwaysActive entry — folding only
 * adds a second placement in the first activation message, it never replaces
 * the per-tap injection. (An earlier version excluded folded entries from
 * Enrich, which silently dropped always-on lore in any conversation where the
 * activation message wasn't re-sent — the activation message is per-apply,
 * Enrich is forever.)
 */
export function isActivationFolded(entry: WorldInfoEntry): boolean {
  return (
    !!entry.alwaysActive && !!entry.position && ACTIVATION_POSITIONS.includes(entry.position)
  )
}

function keyMatches(key: string, draftLower: string): boolean {
  const k = key.trim().toLowerCase()
  return k.length > 0 && draftLower.includes(k)
}

/**
 * Simplified stand-in for SillyTavern's World Info scanner. ST supports
 * recursion, selective keys, probability, case sensitivity, and tunable scan
 * depth against full chat history — all of that assumes per-request API
 * access to inject invisibly. We only get one shot per enrich-tap, scanning
 * the user's own draft, so flat case-insensitive substring matching covers
 * the value at a fraction of the complexity. (Regex key matching was
 * deliberately dropped: a card-supplied pattern like `(a+)+$` runs
 * synchronously on the page thread and catastrophically backtracks on
 * ordinary input, freezing the tab — not worth the marginal power here.)
 */
export function matchWorldInfo(
  entries: WorldInfoEntry[] | undefined,
  text: string,
  alreadyTriggered: Set<string>
): WorldInfoEntry[] {
  if (!entries || entries.length === 0) return []

  const draft = text.trim()
  const draftLower = draft.toLowerCase()

  return entries.filter((entry) => {
    if (!entry.enabled) return false
    // alwaysActive (memory notes + constant lore) fires on every tap
    // regardless of keywords or prior triggers — that's what "always active"
    // means. A constant entry may ALSO be folded into the activation message
    // (isActivationFolded), but that's an extra placement, not a replacement,
    // so it must still fire here.
    if (entry.alwaysActive) return true
    if (alreadyTriggered.has(entry.id)) return false
    if (!draft) return false
    return entry.keys.some((key) => keyMatches(key, draftLower))
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
