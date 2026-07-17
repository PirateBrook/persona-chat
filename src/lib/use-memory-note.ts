import { makeWorldInfoId, upsertPersona } from "../storage"
import type { PersonaCard, WorldInfoEntry } from "../types"

/**
 * Our zero-cost stand-in for "persistent memory": rather than running a
 * summarization model over the transcript, the user explicitly flags a note
 * mid-conversation and it becomes an `alwaysActive` WorldInfoEntry — so it
 * resurfaces on every future "✨ Enrich" tap for this persona unprompted, via
 * matchWorldInfo's alwaysActive branch (world-info.ts), with no keyword to
 * author since there's nothing to match against.
 */
export function useMemoryNote() {
  async function saveMemory(persona: PersonaCard, text: string): Promise<PersonaCard> {
    const entry: WorldInfoEntry = {
      id: makeWorldInfoId(),
      keys: [],
      content: text.trim(),
      enabled: true,
      alwaysActive: true,
      source: "memory"
    }

    const next: PersonaCard = { ...persona, worldInfo: [...(persona.worldInfo ?? []), entry] }
    await upsertPersona(next)
    return next
  }

  return { saveMemory }
}
