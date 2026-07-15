import type { FC } from "react"

import type { PersonaCard } from "../types"

interface Props {
  personas: PersonaCard[]
  activePersonaId: string | null
  onApply: (persona: PersonaCard) => void
}

export const PersonaList: FC<Props> = ({ personas, activePersonaId, onApply }) => {
  if (personas.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        <p className="mb-2">No personas yet.</p>
        <p className="text-xs opacity-70">Open the options page to create one.</p>
      </div>
    )
  }

  return (
    <ul className="max-h-96 overflow-y-auto">
      {personas.map((p) => {
        const isActive = p.id === activePersonaId
        return (
          <li key={p.id} className="border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => onApply(p)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                isActive ? "bg-persona-50 dark:bg-gray-800" : ""
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden>
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
    </ul>
  )
}
