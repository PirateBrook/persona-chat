import type { WorldInfoEntry } from "../types"

/**
 * Simplified stand-in for SillyTavern's World Info scanner. ST supports
 * recursion, selective keys, probability, case sensitivity, and tunable scan
 * depth against full chat history — all of that assumes per-request API
 * access to inject invisibly. We only get one shot per enrich-tap, scanning
 * the user's own draft, so flat case-insensitive substring matching covers
 * the value at a fraction of the complexity.
 */
export function matchWorldInfo(
  entries: WorldInfoEntry[] | undefined,
  text: string,
  alreadyTriggered: Set<string>
): WorldInfoEntry[] {
  if (!entries || entries.length === 0 || !text.trim()) return []

  const haystack = text.toLowerCase()

  return entries.filter((entry) => {
    if (!entry.enabled || alreadyTriggered.has(entry.id)) return false
    return entry.keys.some((key) => key.trim() && haystack.includes(key.trim().toLowerCase()))
  })
}

/**
 * Prepends matched lore and/or a drift reminder above the user's own typed
 * text. Kept visible and clearly delimited (📖 / 🎭) rather than hidden, so
 * the composed message stays legible in the chat transcript.
 */
export function composeEnrichedMessage(
  userText: string,
  matched: WorldInfoEntry[],
  driftReminder?: string
): string {
  const blocks: string[] = []

  for (const entry of matched) {
    blocks.push(`📖 ${entry.content.trim()}`)
  }

  if (driftReminder?.trim()) {
    blocks.push(`🎭 ${driftReminder.trim()}`)
  }

  if (blocks.length === 0) return userText

  return [...blocks, "", userText].join("\n")
}
