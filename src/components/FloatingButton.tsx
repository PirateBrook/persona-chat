import type { FC } from "react"

interface Props {
  open: boolean
  onClick: () => void
}

export const FloatingButton: FC<Props> = ({ open, onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label={open ? "Close Persona.chat panel" : "Open Persona.chat panel"}
      className="fixed bottom-6 right-6 z-[999999] flex h-14 w-14 items-center justify-center rounded-full bg-persona-600 text-white shadow-lg transition hover:bg-persona-700 hover:shadow-xl"
    >
      {open ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 5L15 15M15 5L5 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="15" cy="15" r="3" stroke="currentColor" strokeWidth="2" />
          <path d="M9 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
