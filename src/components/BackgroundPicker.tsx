import type { FC } from "react"

import { BACKGROUND_PRESETS } from "../lib/backgrounds"

interface Props {
  activeBackgroundId: string | null
  onSelect: (id: string | null) => void
}

export const BackgroundPicker: FC<Props> = ({ activeBackgroundId, onSelect }) => {
  return (
    <div className="p-4">
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Applies behind DeepSeek's chat. Purely visual — doesn't touch what gets sent.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onSelect(null)}
          className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
            activeBackgroundId === null
              ? "border-persona-600 bg-persona-50 dark:bg-gray-800"
              : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
          }`}
        >
          <div className="flex h-12 w-full items-center justify-center rounded border border-dashed border-gray-300 text-[10px] text-gray-400 dark:border-gray-700">
            None
          </div>
          <span className="text-[10px] text-gray-600 dark:text-gray-300">Default</span>
        </button>

        {BACKGROUND_PRESETS.map((preset) => {
          const isActive = preset.id === activeBackgroundId
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
                isActive
                  ? "border-persona-600 bg-persona-50 dark:bg-gray-800"
                  : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              }`}
            >
              <div
                className="h-12 w-full rounded"
                style={{ backgroundImage: preset.css }}
                aria-hidden
              />
              <span className="truncate text-[10px] text-gray-600 dark:text-gray-300">
                {preset.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
