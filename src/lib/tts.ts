import type { TtsPreference } from "../types"

/**
 * Wraps chrome.tts — the browser's own on-device speech engine. No network
 * call, no API key, no per-message cost; this is what keeps voice playback
 * inside the same zero-backend model as the rest of the extension. Every
 * export fails soft when chrome.tts isn't present (e.g. a stale/invalidated
 * extension context, or this module loading outside a real extension page)
 * instead of throwing.
 */
function ttsAvailable(): boolean {
  return typeof chrome !== "undefined" && !!chrome.tts
}

export function speak(text: string, pref: TtsPreference): void {
  const trimmed = text.trim()
  if (!ttsAvailable() || !trimmed) return
  chrome.tts.speak(trimmed, {
    enqueue: false,
    ...(pref.voiceName ? { voiceName: pref.voiceName } : {}),
    ...(pref.rate ? { rate: pref.rate } : {})
  })
}

export function stop(): void {
  if (!ttsAvailable()) return
  chrome.tts.stop()
}

export async function getVoices(): Promise<chrome.tts.TtsVoice[]> {
  if (!ttsAvailable()) return []
  try {
    return await chrome.tts.getVoices()
  } catch {
    return []
  }
}
