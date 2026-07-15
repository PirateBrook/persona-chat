import type { FC } from "react"

import { useI18n } from "../lib/i18n"

interface Props {
  open: boolean
  /** Emoji of the active persona; shown on the button so the user can tell
   *  at a glance which character is live without opening the panel. */
  activeEmoji?: string | null
  onClick: () => void
}

export const FloatingButton: FC<Props> = ({ open, activeEmoji, onClick }) => {
  const { t } = useI18n()
  const hasActive = !!activeEmoji && !open

  return (
    <button
      onClick={onClick}
      aria-label={open ? t("fab.close") : t("fab.open")}
      className={`fixed bottom-6 right-6 z-[999999] flex h-12 w-12 items-center justify-center rounded-full shadow-lg shadow-persona-600/25 transition-all duration-200 hover:scale-105 active:scale-95 ${
        hasActive
          ? "bg-white ring-2 ring-persona-500 dark:bg-gray-800"
          : "bg-gradient-to-br from-persona-500 to-persona-700 text-white"
      }`}
    >
      {open ? (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 5L15 15M15 5L5 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : hasActive ? (
        <span className="text-xl leading-none" aria-hidden>
          {activeEmoji}
        </span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3a7 7 0 0 1 7 7c0 2.5-1.3 4.4-3 5.7V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-3.3c-1.7-1.3-3-3.2-3-5.7a7 7 0 0 1 7-7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="10" r="1" fill="currentColor" />
          <circle cx="14.5" cy="10" r="1" fill="currentColor" />
        </svg>
      )}
    </button>
  )
}
