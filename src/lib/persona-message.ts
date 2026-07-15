import type { PersonaCard } from "../types"

/**
 * Wraps a persona card into the one-time activation message so DeepSeek
 * understands "adopt this role" rather than treating the text as the user's
 * first request. Scenario and example dialogue are included only here, once
 * — they're expensive in tokens and only earn their keep on activation, not
 * on every later enrich-tap.
 */
export function buildPersonaMessage(persona: PersonaCard): string {
  const lines = [
    "From now on, please act as the following persona and stay in character for the rest of our conversation:",
    "",
    persona.personaPrompt.trim(),
    ""
  ]

  if (persona.scenario?.trim()) {
    lines.push("Scenario:", persona.scenario.trim(), "")
  }

  if (persona.exampleDialogue?.trim()) {
    lines.push("Example of how you speak in character:", persona.exampleDialogue.trim(), "")
  }

  if (persona.greeting?.trim()) {
    lines.push(`When you acknowledge, respond in character with: "${persona.greeting.trim()}"`)
  } else {
    lines.push("Acknowledge briefly in character, then wait for my first question.")
  }

  return lines.join("\n")
}
