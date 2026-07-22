import type { Locale, PersonaCard, WorldInfoEntry } from "../types"
import { translate } from "./i18n"
import { isActivationFolded, loreLabel } from "./world-info"

/**
 * Wraps a persona card into the one-time activation message so DeepSeek
 * understands "adopt this role" rather than treating the text as the user's
 * first request. Scenario and example dialogue are included only here, once
 * — they're expensive in tokens and only earn their keep on activation, not
 * on every later enrich-tap.
 *
 * `constant` (alwaysActive) world-info entries pinned to a description slot
 * (before_desc/after_desc/personality/scenario) are also folded in here, once,
 * instead of repeating on every Enrich tap — see world-info.ts
 * isActivationFolded. All other lore stays with the per-tap Enrich scanner.
 *
 * The wrapper meta-instructions must be in the same language as the persona
 * content and the model's reply, so a zh user's DeepSeek stays in Chinese —
 * hence `locale`, not a fixed English wrapper.
 */
export function buildPersonaMessage(persona: PersonaCard, locale: Locale): string {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) =>
    translate(locale, key, params)

  const folded = (persona.worldInfo ?? []).filter((e) => e.enabled && isActivationFolded(e))
  const slot = (pos: WorldInfoEntry["position"]): string[] =>
    folded
      .filter((e) => e.position === pos)
      .map((e) => `${loreLabel(e.role, locale)} ${e.content.trim()}`)

  const lines = [t("wrap.intro"), ""]

  const beforeDesc = slot("before_desc")
  if (beforeDesc.length) lines.push(...beforeDesc, "")

  lines.push(persona.personaPrompt.trim(), "")

  const afterDesc = [...slot("after_desc"), ...slot("personality")]
  if (afterDesc.length) lines.push(...afterDesc, "")

  if (persona.scenario?.trim()) {
    lines.push(t("wrap.scenario"), persona.scenario.trim())
    lines.push(...slot("scenario"), "")
  } else {
    const scenarioLore = slot("scenario")
    if (scenarioLore.length) lines.push(...scenarioLore, "")
  }

  if (persona.exampleDialogue?.trim()) {
    lines.push(t("wrap.example"), persona.exampleDialogue.trim(), "")
  }

  if (persona.greeting?.trim()) {
    lines.push(t("wrap.ackGreeting", { greeting: persona.greeting.trim() }))
  } else {
    lines.push(t("wrap.ackPlain"))
  }

  return lines.join("\n")
}
