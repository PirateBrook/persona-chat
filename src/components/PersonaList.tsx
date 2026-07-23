import { useMemo, useState, type FC } from "react"

import { useI18n } from "../lib/i18n"
import { translateTag } from "../lib/i18n/tags"
import { INPUT_BASE_CLS } from "../lib/styles"
import type { PersonaCard } from "../types"

interface Props {
  personas: PersonaCard[]
  activePersonaId: string | null
  /** Remembered across panel reopens (persisted in AppState by PersonaPanel). */
  tagFilter: string | null
  onApply: (persona: PersonaCard) => void
  onTogglePin: (persona: PersonaCard) => void
  onTagFilterChange: (tag: string | null) => void
}

export const PersonaList: FC<Props> = ({
  personas,
  activePersonaId,
  tagFilter,
  onApply,
  onTogglePin,
  onTagFilterChange
}) => {
  const { t, tp, locale } = useI18n()
  const [query, setQuery] = useState("")

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

  // `personas` arrives already sorted (comparePersonas: pinned → recent →
  // updated), so filtering preserves that order.
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

  // Section grouping only makes sense while browsing; when searching, show a
  // single flat ranked list.
  const searching = query.trim().length > 0
  const groups = useMemo(() => {
    return {
      pinned: visible.filter((p) => p.pinned),
      recent: visible.filter((p) => !p.pinned && p.lastUsedAt),
      rest: visible.filter((p) => !p.pinned && !p.lastUsedAt)
    }
  }, [visible])

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

  function renderRow(p: PersonaCard) {
    const isActive = p.id === activePersonaId
    return (
      <li key={p.id}>
        <div
          className={`group flex items-center rounded-xl transition ${
            isActive ? "bg-persona-50 dark:bg-persona-950/40" : "hover:bg-gray-50 dark:hover:bg-gray-800/70"
          }`}
        >
          <button
            onClick={() => onApply(p)}
            className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg leading-none transition ${
                isActive
                  ? "bg-white shadow-sm ring-1 ring-persona-300 dark:bg-gray-800 dark:ring-persona-700"
                  : "bg-gray-100 group-hover:bg-white group-hover:shadow-sm dark:bg-gray-800"
              }`}
              aria-hidden
            >
              {p.avatarImageDataUrl ? (
                <img src={p.avatarImageDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                p.avatarEmoji || "🎭"
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {p.name}
                </span>
                {(p.worldInfo?.length ?? 0) > 0 && (
                  <span
                    className="text-[11px] opacity-60"
                    title={tp("list.worldInfoTitle", p.worldInfo!.length)}
                  >
                    📖
                  </span>
                )}
              </div>
              <div className="truncate text-[12px] text-gray-500 dark:text-gray-400">
                {p.personaPrompt.slice(0, 72)}
                {p.personaPrompt.length > 72 && "…"}
              </div>
            </div>
            {isActive ? (
              <span className="shrink-0 rounded-full bg-persona-600 px-2 py-0.5 text-[11px] font-medium text-white">
                {t("common.active")}
              </span>
            ) : (
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-persona-600 opacity-0 transition group-hover:opacity-100 dark:text-persona-300">
                {t("list.apply")}
              </span>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(p)
            }}
            title={p.pinned ? t("list.unpin") : t("list.pin")}
            aria-label={p.pinned ? t("list.unpin") : t("list.pin")}
            aria-pressed={!!p.pinned}
            className={`mr-1.5 shrink-0 rounded-md px-1.5 py-1 text-xs leading-none transition hover:bg-gray-200/70 dark:hover:bg-gray-700 ${
              p.pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            📌
          </button>
        </div>
      </li>
    )
  }

  const sectionHeader = (label: string) => (
    <li className="select-none px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
      {label}
    </li>
  )

  return (
    <div className="flex flex-col">
      <div className="space-y-2 px-4 pb-2 pt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter applies the top result — type a name, hit Enter, done.
            if (e.key === "Enter" && visible.length > 0) {
              e.preventDefault()
              onApply(visible[0])
            }
          }}
          placeholder={t("list.searchPlaceholder")}
          className={`w-full bg-gray-50/80 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 ${INPUT_BASE_CLS}`}
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => {
              const selected = tag === tagFilter
              return (
                <button
                  key={tag}
                  onClick={() => onTagFilterChange(selected ? null : tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    selected
                      ? "bg-persona-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {translateTag(locale, tag) ?? tag}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ul className="max-h-80 space-y-0.5 overflow-y-auto px-2 pb-2 scrollbar-slim">
        {visible.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-gray-400">
            {t("list.noMatch", { query: query || tagFilter || "" })}
          </li>
        ) : searching ? (
          visible.map(renderRow)
        ) : (
          <>
            {groups.pinned.length > 0 && sectionHeader(`📌 ${t("list.pinned")}`)}
            {groups.pinned.map(renderRow)}
            {groups.recent.length > 0 && sectionHeader(`🕒 ${t("list.recent")}`)}
            {groups.recent.map(renderRow)}
            {(groups.pinned.length > 0 || groups.recent.length > 0) &&
              groups.rest.length > 0 &&
              sectionHeader(t("list.all"))}
            {groups.rest.map(renderRow)}
          </>
        )}
      </ul>
    </div>
  )
}
