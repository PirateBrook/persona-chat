import { useEffect, useState, type FC } from "react"

import { useI18n } from "../lib/i18n"
import { getVoices } from "../lib/tts"
import type { TtsPreference } from "../types"

interface Props {
  tts: TtsPreference
  onChange: (next: TtsPreference) => void
}

export const TtsPanel: FC<Props> = ({ tts, onChange }) => {
  const { t } = useI18n()
  // null = still loading; [] = loaded but the platform reported no voices.
  // Both render the same "system default only" picker.
  const [voices, setVoices] = useState<chrome.tts.TtsVoice[] | null>(null)

  useEffect(() => {
    void getVoices().then(setVoices)
  }, [])

  return (
    <div className="px-4 pb-2 pt-3">
      <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 dark:border-gray-800">
        <span className="min-w-0">
          <span className="block text-xs font-medium text-gray-900 dark:text-gray-100">
            {t("tts.enable")}
          </span>
          <span className="block text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            {t("tts.enableDesc")}
          </span>
        </span>
        <input
          type="checkbox"
          checked={tts.enabled}
          onChange={(e) => onChange({ ...tts, enabled: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-persona-600"
        />
      </label>

      {tts.enabled && (
        <div className="mt-2 rounded-xl border border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <span className="mb-1.5 block text-xs font-medium text-gray-900 dark:text-gray-100">
            {t("tts.voice")}
          </span>
          <select
            value={tts.voiceName ?? ""}
            onChange={(e) => onChange({ ...tts, voiceName: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="">{t("tts.systemDefault")}</option>
            {voices
              ?.filter((v) => !!v.voiceName)
              .map((v) => (
                <option key={v.voiceName} value={v.voiceName}>
                  {v.lang ? `${v.voiceName} (${v.lang})` : v.voiceName}
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  )
}
