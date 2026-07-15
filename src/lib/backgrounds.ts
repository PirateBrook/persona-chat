export interface BackgroundPreset {
  id: string
  label: string
  category: string
  /** Value for the CSS `background-image` shorthand (gradients only — no
   *  bundled photo assets, so there's no licensing question and no binary
   *  weight in the repo). */
  css: string
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // ---- work ----
  { id: "bg_slate_focus", label: "Slate Focus", category: "work", css: "linear-gradient(160deg, #1e293b, #334155)" },
  { id: "bg_paper_desk", label: "Paper Desk", category: "work", css: "linear-gradient(160deg, #e7e2d8, #cfc9ba)" },
  { id: "bg_midnight_terminal", label: "Midnight Terminal", category: "work", css: "linear-gradient(160deg, #0f172a, #14532d)" },

  // ---- fun ----
  { id: "bg_sunset_pop", label: "Sunset Pop", category: "fun", css: "linear-gradient(160deg, #f97316, #ec4899)" },
  { id: "bg_candy", label: "Candy", category: "fun", css: "linear-gradient(160deg, #f9a8d4, #a78bfa)" },

  // ---- companion ----
  { id: "bg_late_night_bar", label: "Late Night Bar", category: "companion", css: "linear-gradient(160deg, #3b1f1f, #7c2d12)" },
  { id: "bg_warm_lamp", label: "Warm Lamp", category: "companion", css: "linear-gradient(160deg, #78350f, #d97706)" },
  { id: "bg_diary_pastel", label: "Diary Pastel", category: "companion", css: "linear-gradient(160deg, #fde68a, #fca5a5)" },

  // ---- roleplay ----
  { id: "bg_retro_quest", label: "Retro Quest", category: "roleplay", css: "linear-gradient(160deg, #1e1b4b, #6d28d9)" },
  { id: "bg_deduction_fog", label: "Deduction Fog", category: "roleplay", css: "linear-gradient(160deg, #374151, #6b7280)" },

  // ---- philosophy ----
  { id: "bg_marble_hall", label: "Marble Hall", category: "philosophy", css: "linear-gradient(160deg, #e5e7eb, #9ca3af)" },
  { id: "bg_zen_ink", label: "Zen Ink", category: "philosophy", css: "linear-gradient(160deg, #f4f4f5, #27272a)" }
]

export function getBackgroundPreset(id: string | null): BackgroundPreset | null {
  if (!id) return null
  return BACKGROUND_PRESETS.find((p) => p.id === id) ?? null
}

const STYLE_ELEMENT_ID = "persona-chat-background-style"

/**
 * Broad fallback: re-skinning `body` is cruder than targeting DeepSeek's
 * exact chat pane, but it's robust to DOM/class-name churn and doesn't
 * require reverse-engineering obfuscated class names. Layers a translucent
 * scrim (light/dark aware) under the gradient so DeepSeek's own message
 * bubbles — which paint their own solid background — stay legible regardless
 * of which preset is picked.
 */
export function applyBackground(id: string | null): void {
  const existing = document.getElementById(STYLE_ELEMENT_ID)
  const preset = getBackgroundPreset(id)

  if (!preset) {
    existing?.remove()
    return
  }

  const style = existing ?? document.createElement("style")
  style.id = STYLE_ELEMENT_ID
  style.textContent = `
    body {
      background-image: linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), ${preset.css} !important;
      background-size: cover !important;
      background-attachment: fixed !important;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-image: linear-gradient(rgba(17,24,39,0.55), rgba(17,24,39,0.55)), ${preset.css} !important;
      }
    }
  `

  if (!existing) document.head.appendChild(style)
}
