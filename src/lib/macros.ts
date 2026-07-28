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
    charName: charName.trim(),
    userName: trimmed ? trimmed : translate(locale, "macro.user.default")
  }
}

/** Small, dependency-free string hash (not cryptographic) — deterministic
 *  index into an option list. `{{random:...}}` resolves via this instead of
 *  Math.random() so the same macro occurrence (e.g. an alwaysActive
 *  world-info entry folded into the one-time activation message AND fired
 *  again on every Enrich tap) always picks the same option — otherwise the
 *  same "constant" trait could visibly contradict itself between the
 *  activation message and a later Enrich tap (both injections are visible
 *  in the chat transcript, never hidden). Deterministic per (options list,
 *  character) — same persona always gets the same pick for a given random
 *  block, different personas can still land on different picks. */
function stableIndex(seed: string, modulus: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % modulus
}

/**
 * Resolves a `{{random:...}}` macro's raw comma-separated option list to a
 * single option: split/trim/drop-empties, then pick deterministically (see
 * stableIndex) rather than with Math.random() — see stableIndex's doc for
 * why (the alwaysActive/folded activation-message-vs-Enrich contradiction).
 */
function resolveRandomPick(optionsRaw: string, ctx: MacroContext): string {
  const options = optionsRaw
    .split(",")
    .map((opt) => opt.trim())
    .filter((opt) => opt.length > 0)
  if (options.length === 0) return ""
  if (options.length === 1) return options[0]
  return options[stableIndex(optionsRaw + "|" + ctx.charName, options.length)]
}

/**
 * Expands the three SillyTavern-style macros this app supports —
 * `{{char}}` / `{{user}}` / `{{random:a,b,c}}` — inside persona-authored text
 * (imported SillyTavern/chub.ai cards commonly use these in
 * description/first_mes/character_book fields). Any other `{{xxx}}` token
 * (e.g. `{{time}}`, an unrecognized macro) is left as literal text — the
 * combined regex only ever matches what it explicitly lists, so
 * "unrecognized token" handling falls out for free, no extra branch needed.
 *
 * A SINGLE combined regex with alternation, replaced in ONE `.replace()`
 * call, is deliberate: `String.replace` with a global regex advances through
 * the ORIGINAL input and never re-scans replacement text. Three separate
 * sequential `.replace()` calls (char, then user, then random) would each
 * scan the entire current string, so text substituted in by an earlier pass
 * (e.g. a persona name or the user's configured name that itself contains
 * the literal text `"{{random:a,b}}"` — very plausible, since this app's own
 * feature teaches users this exact macro syntax) could be re-matched and
 * re-expanded by a later pass, corrupting content that should have been
 * inserted verbatim. Matching everything in one pass over the original text
 * makes that impossible.
 *
 * Deliberately NOT a generic `{{\w+:.*}}` scanner: this function runs
 * synchronously on untrusted, user-imported card text. This codebase already
 * dropped a `@@use_regex` feature after a card-supplied pattern like
 * `(a+)+$` catastrophically backtracked on the page thread and froze the tab
 * (see the comment on matchWorldInfo in world-info.ts). The combined regex
 * below uses a single bounded `[^}]*`-style character class for the random
 * branch — never nested/overlapping quantifiers — so matching stays linear
 * in the input length no matter how pathological the card text is.
 *
 * The replacer function (not a plain string) also means a `$` inside a
 * persona name or the user's own name can't be misread as a `String.replace`
 * special pattern (`$&`, `$$`, ...).
 */
export function expandMacros(text: string, ctx: MacroContext): string {
  return text.replace(
    /\{\{char\}\}|\{\{user\}\}|\{\{random:([^}]*)\}\}/g,
    (match, optionsRaw?: string) => {
      if (match === "{{char}}") return ctx.charName
      if (match === "{{user}}") return ctx.userName
      return resolveRandomPick(optionsRaw ?? "", ctx)
    }
  )
}
