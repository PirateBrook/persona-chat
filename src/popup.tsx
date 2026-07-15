import "./style.css"

/**
 * Popup is intentionally minimal in v0: users spend their time on the
 * DeepSeek page overlay, not the toolbar dropdown. This is a status +
 * options-page launcher, nothing more.
 */
export default function Popup() {
  return (
    <div className="w-72 bg-white p-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-3">
        <div className="text-base font-semibold">Persona.chat</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Give your AI a persona.
        </div>
      </div>

      <div className="mb-3 rounded-lg bg-persona-50 p-3 text-xs text-persona-700 dark:bg-gray-800 dark:text-persona-100">
        Open <span className="font-semibold">chat.deepseek.com</span> — the
        Persona.chat button appears bottom-right.
      </div>

      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="w-full rounded-md bg-persona-600 py-2 text-sm font-medium text-white hover:bg-persona-700"
      >
        Manage personas
      </button>
    </div>
  )
}
