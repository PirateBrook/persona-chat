import type { FC } from "react"

import { getActiveAdapter } from "../lib/adapters"
import { useI18n } from "../lib/i18n"
import type { PageTweaks } from "../types"

interface Props {
  tweaks: PageTweaks
  onChange: (next: PageTweaks) => void
}

export const PageTweaksPanel: FC<Props> = ({ tweaks, onChange }) => {
  const { t } = useI18n()

  // The only tweak (hideThinking) targets DeepSeek's own reasoning-trace DOM
  // (.ds-think-content), absent on other platforms — so on any non-DeepSeek
  // host there's nothing to show here. The Tweaks tab still renders TTS below.
  if (getActiveAdapter()?.id !== "deepseek") return null

  return (
    <div className="px-4 pb-2 pt-3">
      <p className="mb-3 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
        {t("tweaks.blurb")}
      </p>
      <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 dark:border-gray-800">
        <span className="min-w-0">
          <span className="block text-xs font-medium text-gray-900 dark:text-gray-100">
            {t("tweaks.hideThinking")}
          </span>
          <span className="block text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            {t("tweaks.hideThinkingDesc")}
          </span>
        </span>
        <input
          type="checkbox"
          checked={tweaks.hideThinking}
          onChange={(e) => onChange({ ...tweaks, hideThinking: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-persona-600"
        />
      </label>
    </div>
  )
}
