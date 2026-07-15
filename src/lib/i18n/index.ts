import { useCallback, useEffect, useState } from "react"

import { safeChromeCall } from "../extension-context"
import type { Locale, LanguagePref } from "../../types"
import { en } from "./en"
import { zh } from "./zh"

export type MessageKey = keyof typeof en
export type Messages = Record<MessageKey, string>

export const DICTS: Record<Locale, Messages> = { en, zh }

/**
 * Pure function of navigator.language — every realm (content script, popup,
 * options) resolves independently to the same value, so there's no
 * cross-realm handoff to coordinate. Anything not starting with "zh"
 * (covers zh-CN/zh-Hans/zh-TW/zh-HK/...) falls back to English; we only
 * ship two locales so Traditional-Chinese users get Simplified for now.
 */
export function detectBrowserLocale(
  nav: string = typeof navigator !== "undefined" ? navigator.language : "en"
): Locale {
  return nav.toLowerCase().startsWith("zh") ? "zh" : "en"
}

export function resolveLocale(pref: LanguagePref, nav?: string): Locale {
  return pref === "auto" ? detectBrowserLocale(nav) : pref
}

export function getMessages(locale: Locale): Messages {
  return DICTS[locale]
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, token) =>
    token in params ? String(params[token]) : match
  )
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>
): string {
  return interpolate(DICTS[locale][key], params)
}

/**
 * Picks `${baseKey}.one` for English count===1, `${baseKey}.other`
 * otherwise. Chinese has no plural morphology, so its `.one`/`.other`
 * values are simply identical — the split exists to satisfy English, not
 * because Chinese needs it.
 */
export function translatePlural(
  locale: Locale,
  baseKey: string,
  count: number,
  params?: Record<string, string | number>
): string {
  const suffix = locale === "en" && count === 1 ? "one" : "other"
  const key = `${baseKey}.${suffix}` as MessageKey
  return interpolate(DICTS[locale][key], { count, ...params })
}

export interface I18n {
  locale: Locale
  pref: LanguagePref
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  tp: (baseKey: string, count: number, params?: Record<string, string | number>) => string
  setPref: (pref: LanguagePref) => Promise<void>
}

/**
 * Reactive without a page reload: subscribes to chrome.storage.onChanged so
 * flipping the language in the options tab flips every other open realm
 * (the live DeepSeek overlay included) instantly — the same mechanism
 * deepseek.tsx already uses to react to persona/appState changes.
 */
export function useI18n(): I18n {
  const [pref, setPrefState] = useState<LanguagePref>("auto")

  useEffect(() => {
    let cancelled = false

    void safeChromeCall(async () => {
      const res = await chrome.storage.local.get("appState")
      return res.appState?.language as LanguagePref | undefined
    }, undefined).then((language) => {
      if (!cancelled && language) setPrefState(language)
    })

    function onStorageChanged(
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) {
      if (area !== "local" || !changes.appState) return
      const next = (changes.appState.newValue as { language?: LanguagePref } | undefined)
        ?.language
      if (next) setPrefState(next)
    }

    try {
      chrome.storage.onChanged.addListener(onStorageChanged)
    } catch {
      // Extension context already gone; harmless — this realm just won't
      // react live, matching the rest of the app's soft-fail posture.
    }

    return () => {
      cancelled = true
      try {
        chrome.storage.onChanged.removeListener(onStorageChanged)
      } catch {
        // no-op
      }
    }
  }, [])

  const locale = resolveLocale(pref)

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  )
  const tp = useCallback(
    (baseKey: string, count: number, params?: Record<string, string | number>) =>
      translatePlural(locale, baseKey, count, params),
    [locale]
  )

  const setPref = useCallback(async (next: LanguagePref) => {
    await safeChromeCall(async () => {
      const res = await chrome.storage.local.get("appState")
      const nextState = { ...(res.appState ?? {}), language: next }
      await chrome.storage.local.set({ appState: nextState })
      return null
    }, null)
    setPrefState(next)
  }, [])

  return { locale, pref, t, tp, setPref }
}
