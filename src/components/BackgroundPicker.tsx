import { useRef, useState, type ChangeEvent, type FC } from "react"

import {
  BACKGROUND_PRESETS,
  customBackgroundToPreset,
  detectTheme,
  getSwatchCss
} from "../lib/backgrounds"
import { useI18n, type MessageKey } from "../lib/i18n"
import type { CustomBackground } from "../types"

interface Props {
  activeBackgroundId: string | null
  customBackgrounds: CustomBackground[]
  onSelect: (id: string | null) => void
  onUploadCustom: (file: File) => void
  onDeleteCustom: (id: string) => void
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

const DeleteBadge: FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onClick()
    }}
    aria-label={label}
    className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow-sm transition hover:bg-black/80 group-hover:opacity-100"
  >
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  </button>
)

export const BackgroundPicker: FC<Props> = ({
  activeBackgroundId,
  customBackgrounds,
  onSelect,
  onUploadCustom,
  onDeleteCustom
}) => {
  const { t } = useI18n()
  // Computed once on mount, not on every render — swatches only need to
  // roughly track DeepSeek's theme, not live-update mid-toggle while the
  // picker is open.
  const [theme] = useState(detectTheme)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUploadCustom(file)
    e.target.value = ""
  }

  return (
    <div className="px-4 pb-2 pt-3">
      <p className="mb-3 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
        {t("bg.blurb")}
      </p>

      {customBackgrounds.length > 0 && (
        <>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {t("bg.custom.heading")}
          </p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {customBackgrounds.map((custom) => {
              const isActive = custom.id === activeBackgroundId
              return (
                <button
                  key={custom.id}
                  onClick={() => onSelect(custom.id)}
                  title={custom.name}
                  className={`group relative overflow-hidden rounded-xl transition ${
                    isActive
                      ? "ring-2 ring-persona-500 ring-offset-2 dark:ring-offset-gray-900"
                      : "hover:scale-[1.03]"
                  }`}
                >
                  <div
                    className="aspect-[4/3] w-full"
                    style={{ backgroundImage: getSwatchCss(customBackgroundToPreset(custom), theme) }}
                    aria-hidden
                  />
                  <DeleteBadge onClick={() => onDeleteCustom(custom.id)} label={t("bg.custom.delete")} />
                  {isActive && <CheckBadge />}
                </button>
              )
            })}
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 transition hover:border-persona-400 hover:text-persona-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-persona-600 dark:hover:text-persona-400"
      >
        <span aria-hidden>+</span> {t("bg.custom.upload")}
      </button>

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
