import type { Locale } from "../../types"
import { getMessages } from "./index"

/**
 * Tags are stored as stable English keys (filtering/search logic depends on
 * them); only the displayed label is localized. A bounded lookup of its own
 * rather than a widened `I18n.t()` — tags are arbitrary strings (including
 * user-created ones), so this can't be typed against `MessageKey` the way
 * every other translation call is. Returns undefined for unknown/user tags
 * so callers decide their own fallback (usually the raw tag).
 */
export function translateTag(locale: Locale, tag: string): string | undefined {
  return (getMessages(locale) as Record<string, string | undefined>)[`tag.${tag}`]
}
