import { useMemo, useState, type FC } from "react"

import type { PersonaCard } from "../types"

interface Props {
  personas: PersonaCard[]
  activePersonaId: string | null
  onApply: (persona: PersonaCard) => void
}

export const PersonaList: FC<Props> = ({ personas, activePersonaId, onApply }) => {
  const [query, setQuery] = useState("")
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of personas) {
      for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    // Most-used tags first so the chip row stays scannable as the library grows.
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
  }, [personas])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return personas.filter((p) => {
      if (tagFilter && !p.tags.includes(tagFilter)) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.personaPrompt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [personas, query, tagFilter])

  if (personas.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        <p className="mb-2">No personas yet.</p>
        <p className="text-xs opacity-70">Open the options page to create one.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search personas…"
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-persona-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => {
              const selected = tag === tagFilter
              return (
                <button
                  key={tag}
                  onClick={() => setTagFilter(selected ? null : tag)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                    selected
                      ? "bg-persona-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-persona-50 hover:text-persona-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ul className="max-h-80 overflow-y-auto">
        {visible.map((p) => {
          const isActive = p.id === activePersonaId
          return (
            <li key={p.id} className="border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => onApply(p)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  isActive ? "bg-persona-50 dark:bg-gray-800" : ""
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none ${
                    isActive
                      ? "bg-persona-100 ring-1 ring-persona-500 dark:bg-gray-700"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                  aria-hidden
                >
                  {p.avatarEmoji || "🎭"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {p.name}
                    </span>
                    {isActive && (
                      <span className="rounded bg-persona-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Active
                      </span>
                    )}
                    {(p.worldInfo?.length ?? 0) > 0 && (
                      <span
                        className="text-[10px] text-persona-600 dark:text-persona-100"
                        title="Has world info"
                      >
                        📖
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {p.personaPrompt.slice(0, 80)}
                    {p.personaPrompt.length > 80 && "…"}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
        {visible.length === 0 && (
          <li className="p-6 text-center text-xs text-gray-400">
            No personas match “{query || tagFilter}”.
          </li>
        )}
      </ul>
    </div>
  )
}
