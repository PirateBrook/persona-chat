import type { Locale, PersonaCard } from "../types"
import { translate } from "./i18n"

/**
 * Wraps a persona card into the one-time activation message so DeepSeek
 * understands "adopt this role" rather than treating the text as the user's
 * first request. Scenario and example dialogue are included only here, once
 * — they're expensive in tokens and only earn their keep on activation, not
 * on every later enrich-tap.
 *
 * The wrapper meta-instructions must be in the same language as the persona
 * content and the model's reply, so a zh user's DeepSeek stays in Chinese —
 * hence `locale`, not a fixed English wrapper.
 */
export function buildPersonaMessage(persona: PersonaCard, locale: Locale): string {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) =>
    translate(locale, key, params)

  const lines = [t("wrap.intro"), "", persona.personaPrompt.trim(), ""]

  if (persona.scenario?.trim()) {
    lines.push(t("wrap.scenario"), persona.scenario.trim(), "")
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
