import type { Locale } from "../types"
import { translate } from "./i18n"

/** Resolved values for the three macros this app expands — built once per
 *  compose call (buildPersonaMessage / composeEnrichedMessage / the guard
 *  button) via buildMacroContext, then threaded through expandMacros. */
export interface MacroContext {
  charName: string
  userName: string
}

/**
 * Resolves the {{user}} macro's value: explicit userName if set, else a
 * locale-aware fallback noun ("User"/"用户") — chosen as a noun, not a
 * pronoun like "you", so it stays grammatically safe as a sentence subject
 * in imported lore text (e.g. "{{user}} is a knight" -> "User is a knight",
 * not the ungrammatical "You is a knight").
 */
export function buildMacroContext(
  charName: string,
  userName: string | undefined,
  locale: Locale
): MacroContext {
  const trimmed = userName?.trim()
  return {
    charName,
    userName: trimmed ? trimmed : translate(locale, "macro.user.default")
  }
}

/**
 * Expands the three SillyTavern-style macros this app supports —
 * `{{char}}` / `{{user}}` / `{{random:a,b,c}}` — inside persona-authored text
 * (imported SillyTavern/chub.ai cards commonly use these in
 * description/first_mes/character_book fields). Any other `{{xxx}}` token
 * (e.g. `{{time}}`, an unrecognized macro) is left as literal text — three
 * targeted `.replace()` calls only ever touch what they explicitly match, so
 * "unrecognized token" handling falls out for free, no extra branch needed.
 *
 * Deliberately NOT a generic `{{\w+:.*}}` scanner: this function runs
 * synchronously on untrusted, user-imported card text. This codebase already
 * dropped a `@@use_regex` feature after a card-supplied pattern like
 * `(a+)+$` catastrophically backtracked on the page thread and froze the tab
 * (see the comment on matchWorldInfo in world-info.ts). Each replacement
 * below uses a single bounded `[^}]*`-style character class — never
 * nested/overlapping quantifiers — so matching stays linear in the input
 * length no matter how pathological the card text is.
 *
 * Replacements use a function replacer (not a plain string) for `{{char}}`/
 * `{{user}}` so a `$` inside a persona name or the user's own name can't be
 * misread as a `String.replace` special pattern (`$&`, `$$`, ...).
 */
export function expandMacros(text: string, ctx: MacroContext): string {
  let result = text.replace(/\{\{char\}\}/g, () => ctx.charName)
  result = result.replace(/\{\{user\}\}/g, () => ctx.userName)
  result = result.replace(/\{\{random:([^}]*)\}\}/g, (_match, optionsRaw: string) => {
    const options = optionsRaw
      .split(",")
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0)
    if (options.length === 0) return ""
    if (options.length === 1) return options[0]
    return options[Math.floor(Math.random() * options.length)]
  })
  return result
}
