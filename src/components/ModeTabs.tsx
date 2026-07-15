import type { FC } from "react"

import type { ModeKey } from "../types"

interface Props {
  active: ModeKey
  onChange: (mode: ModeKey) => void
}

const TABS: { key: ModeKey; label: string; description: string }[] = [
  { key: "original", label: "Original", description: "Untouched DeepSeek" },
  { key: "image", label: "Image", description: "Background presets" },
  { key: "persona", label: "Persona", description: "Roleplay & prompts" }
]

export const ModeTabs: FC<Props> = ({ active, onChange }) => {
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-800">
      {TABS.map((tab) => {
        const selected = active === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex-1 border-b-2 px-3 py-3 text-left transition ${
              selected
                ? "border-persona-600 bg-persona-50 text-persona-700 dark:bg-gray-800"
                : "border-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            <div className="text-sm font-semibold">{tab.label}</div>
            <div className="text-xs opacity-70">{tab.description}</div>
          </button>
        )
      })}
    </div>
  )
}
