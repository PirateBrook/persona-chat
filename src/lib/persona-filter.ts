import type { PersonaCard } from "../types"

/** Tag names sorted by descending frequency across `personas` — shared by
 *  the two persona-list UIs (options.tsx's editor list, PersonaList.tsx's
 *  content-script panel) so the tag chip row stays consistently ordered
 *  between them. */
export function collectPersonaTagCounts(personas: PersonaCard[]): string[] {
  const counts = new Map<string, number>()
  for (const p of personas) {
    for (const tag of p.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
}

/** Filters `personas` by an optional tag (exact match) and a free-text query
 *  (case-insensitive substring match against name/personaPrompt/tags) —
 *  shared by the same two persona-list UIs as collectPersonaTagCounts. */
export function filterPersonas(
  personas: PersonaCard[],
  query: string,
  tagFilter: string | null
): PersonaCard[] {
  const q = query.trim().toLowerCase()
  return personas.filter((p) => {
    if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.personaPrompt.toLowerCase().includes(q) ||
      (p.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
    )
  })
}
