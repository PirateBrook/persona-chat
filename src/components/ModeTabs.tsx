import type { FC } from "react"

import { useI18n } from "../lib/i18n"
import type { ModeKey } from "../types"

interface Props {
  active: ModeKey
  onChange: (mode: ModeKey) => void
}

/**
 * Segmented control over the two real surfaces. The legacy "original" mode
 * (an informational placeholder tab) is gone from the UI; PersonaPanel maps
 * any stored "original" value to "persona" so old state keeps working.
 */
const TABS: { key: ModeKey; labelKey: "tab.personas" | "tab.scenes" }[] = [
  { key: "persona", labelKey: "tab.personas" },
  { key: "image", labelKey: "tab.scenes" }
]

export const ModeTabs: FC<Props> = ({ active, onChange }) => {
  const { t } = useI18n()

  return (
    <div className="px-4 pt-3">
      <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
        {TABS.map((tab) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                selected
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
