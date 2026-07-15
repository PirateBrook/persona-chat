import { useMemo, useState, type FC } from "react"

import { getMessages, useI18n } from "../lib/i18n"
import type { Locale, PersonaCard } from "../types"

interface Props {
  personas: PersonaCard[]
  activePersonaId: string | null
  onApply: (persona: PersonaCard) => void
}

/** Tags are stored as stable English keys (filtering/search logic depends on
 *  them); only the displayed label is localized. Unknown/user-created tags
 *  fall back to the raw key rather than crashing on a missing dict entry. */
function tagLabel(locale: Locale, tag: string): string {
  const dict = getMessages(locale) as Record<string, string>
  return dict[`tag.${tag}`] ?? tag
}

export const PersonaList: FC<Props> = ({ personas, activePersonaId, onApply }) => {
  const { t, tp, locale } = useI18n()
  const [query, setQuery] = useState("")
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of personas) {
      for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
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
        p.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [personas, query, tagFilter])

  if (personas.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <div className="mb-2 text-2xl">🎭</div>
        <p className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          {t("list.emptyTitle")}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("list.emptyBody")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-2 px-4 pb-2 pt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("list.searchPlaceholder")}
          className="w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-persona-400 focus:bg-white focus:ring-2 focus:ring-persona-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-100 dark:focus:border-persona-500 dark:focus:bg-gray-800"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => {
              const selected = tag === tagFilter
              return (
                <button
                  key={tag}
                  onClick={() => setTagFilter(selected ? null : tag)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                    selected
                      ? "bg-persona-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {tagLabel(locale, tag)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ul className="max-h-80 space-y-0.5 overflow-y-auto px-2 pb-2 scrollbar-slim">
        {visible.map((p) => {
          const isActive = p.id === activePersonaId
          return (
            <li key={p.id}>
              <button
                onClick={() => onApply(p)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  isActive
                    ? "bg-persona-50 dark:bg-persona-950/40"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/70"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none transition ${
                    isActive
                      ? "bg-white shadow-sm ring-1 ring-persona-300 dark:bg-gray-800 dark:ring-persona-700"
                      : "bg-gray-100 group-hover:bg-white group-hover:shadow-sm dark:bg-gray-800"
                  }`}
                  aria-hidden
                >
                  {p.avatarEmoji || "🎭"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {p.name}
                    </span>
                    {(p.worldInfo?.length ?? 0) > 0 && (
                      <span
                        className="text-[10px] opacity-60"
                        title={tp("list.worldInfoTitle", p.worldInfo!.length)}
                      >
                        📖
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {p.personaPrompt.slice(0, 72)}
                    {p.personaPrompt.length > 72 && "…"}
                  </div>
                </div>
                {isActive ? (
                  <span className="shrink-0 rounded-full bg-persona-600 px-2 py-0.5 text-[10px] font-medium text-white">
                    {t("common.active")}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-persona-600 opacity-0 transition group-hover:opacity-100 dark:text-persona-300">
                    {t("list.apply")}
                  </span>
                )}
              </button>
            </li>
          )
        })}
        {visible.length === 0 && (
          <li className="px-4 py-8 text-center text-xs text-gray-400">
            {t("list.noMatch", { query: query || tagFilter || "" })}
          </li>
        )}
      </ul>
    </div>
  )
}
