import type { Locale, PersonaCard, WorldInfoEntry } from "../types"
import { translate } from "./i18n"
import { buildMacroContext, expandMacros } from "./macros"
import { isActivationFolded, loreLabel } from "./world-info"

/**
 * Wraps a persona card into the one-time activation message so DeepSeek
 * understands "adopt this role" rather than treating the text as the user's
 * first request. Scenario and example dialogue are included only here, once
 * — they're expensive in tokens and only earn their keep on activation, not
 * on every later enrich-tap.
 *
 * `constant` (alwaysActive) world-info entries pinned to a description slot
 * (before_desc/after_desc/personality/scenario) also get a copy folded in
 * here, near the persona description — an ADDITIONAL placement in the one-time
 * activation message. They still fire on every Enrich tap too (always-active
 * means always); folding never replaces that. See world-info.ts
 * isActivationFolded / matchWorldInfo.
 *
 * The wrapper meta-instructions must be in the same language as the persona
 * content and the model's reply, so a zh user's DeepSeek stays in Chinese —
 * hence `locale`, not a fixed English wrapper.
 *
 * Every piece of persona-authored text (prompt/scenario/example/greeting/
 * folded lore) is run through `expandMacros` before being pushed into
 * `lines`, so `{{char}}`/`{{user}}`/`{{random:...}}` tokens commonly found in
 * imported SillyTavern/chub.ai cards resolve to real values instead of
 * showing up as literal `{{...}}` strings. The wrapper meta-instructions
 * themselves (`t("wrap.intro")` etc.) are our own UI copy, not
 * persona-authored, so they're left untouched.
 */
export function buildPersonaMessage(
  persona: PersonaCard,
  locale: Locale,
  userName?: string
): string {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) =>
    translate(locale, key, params)
  const ctx = buildMacroContext(persona.name, userName, locale)

  const folded = (persona.worldInfo ?? []).filter((e) => e.enabled && isActivationFolded(e))
  const slot = (pos: WorldInfoEntry["position"]): string[] =>
    folded
      .filter((e) => e.position === pos)
      .map((e) => `${loreLabel(e.role, locale)} ${expandMacros(e.content.trim(), ctx)}`)

  const lines = [t("wrap.intro"), ""]

  const beforeDesc = slot("before_desc")
  if (beforeDesc.length) lines.push(...beforeDesc, "")

  lines.push(expandMacros(persona.personaPrompt.trim(), ctx), "")

  const afterDesc = [...slot("after_desc"), ...slot("personality")]
  if (afterDesc.length) lines.push(...afterDesc, "")

  if (persona.scenario?.trim()) {
    lines.push(t("wrap.scenario"), expandMacros(persona.scenario.trim(), ctx))
    lines.push(...slot("scenario"), "")
  } else {
    const scenarioLore = slot("scenario")
    if (scenarioLore.length) lines.push(...scenarioLore, "")
  }

  if (persona.exampleDialogue?.trim()) {
    lines.push(t("wrap.example"), expandMacros(persona.exampleDialogue.trim(), ctx), "")
  }

  if (persona.greeting?.trim()) {
    lines.push(t("wrap.ackGreeting", { greeting: expandMacros(persona.greeting.trim(), ctx) }))
  } else {
    lines.push(t("wrap.ackPlain"))
  }

  return lines.join("\n")
}
