import type { FC } from "react"

import { BACKGROUND_PRESETS, detectTheme, getSwatchCss } from "../lib/backgrounds"
import { useI18n, type MessageKey } from "../lib/i18n"

interface Props {
  activeBackgroundId: string | null
  onSelect: (id: string | null) => void
}

const CheckBadge: FC = () => (
  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-persona-600 text-white shadow-sm">
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <path
        d="M1.5 5.5L4 8L8.5 2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
)

export const BackgroundPicker: FC<Props> = ({ activeBackgroundId, onSelect }) => {
  const { t } = useI18n()
  // Read once per render — cheap, and swatches only need to roughly track
  // DeepSeek's theme, not live-update mid-toggle while the picker is open.
  const theme = detectTheme()

  return (
    <div className="px-4 pb-2 pt-3">
      <p className="mb-3 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
        {t("bg.blurb")}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onSelect(null)}
          className={`group relative overflow-hidden rounded-xl transition ${
            activeBackgroundId === null
              ? "ring-2 ring-persona-500 ring-offset-2 dark:ring-offset-gray-900"
              : "hover:scale-[1.03]"
          }`}
        >
          <div className="flex aspect-[4/3] w-full items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-[10px] font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
            {t("bg.none")}
          </div>
          {activeBackgroundId === null && <CheckBadge />}
        </button>

        {BACKGROUND_PRESETS.map((preset) => {
          const isActive = preset.id === activeBackgroundId
          const label = t(`bg.${preset.id}` as MessageKey)
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              title={label}
              className={`group relative overflow-hidden rounded-xl transition ${
                isActive
                  ? "ring-2 ring-persona-500 ring-offset-2 dark:ring-offset-gray-900"
                  : "hover:scale-[1.03]"
              }`}
            >
              <div
                className="aspect-[4/3] w-full"
                style={{ backgroundImage: getSwatchCss(preset, theme) }}
                aria-hidden
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 pb-1 pt-3 text-left text-[9px] font-medium text-white/90">
                {label}
              </span>
              {isActive && <CheckBadge />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
