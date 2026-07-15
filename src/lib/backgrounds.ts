export interface BackgroundPreset {
  id: string
  label: string
  category: string
  /** Value for the CSS `background-image` shorthand. Layered radial +
   *  linear gradients (mesh-gradient style) — no bundled photo assets, so
   *  there's no licensing question and no binary weight in the repo. */
  css: string
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // ---- work ----
  {
    id: "bg_slate_focus",
    label: "Slate Focus",
    category: "work",
    css: "radial-gradient(at 0% 0%, #334155 0%, transparent 55%), radial-gradient(at 100% 100%, #1e293b 0%, transparent 55%), linear-gradient(160deg, #0f172a, #1e293b)"
  },
  {
    id: "bg_paper_desk",
    label: "Paper Desk",
    category: "work",
    css: "radial-gradient(at 20% 10%, #f5f0e6 0%, transparent 60%), radial-gradient(at 90% 90%, #d6cfbf 0%, transparent 55%), linear-gradient(160deg, #ece7db, #d8d2c2)"
  },
  {
    id: "bg_midnight_terminal",
    label: "Midnight Terminal",
    category: "work",
    css: "radial-gradient(at 80% 0%, #14532d33 0%, transparent 50%), radial-gradient(at 10% 100%, #05966922 0%, transparent 50%), linear-gradient(170deg, #0a0f1c, #111827)"
  },

  // ---- fun ----
  {
    id: "bg_sunset_pop",
    label: "Sunset Pop",
    category: "fun",
    css: "radial-gradient(at 10% 20%, #fb923c66 0%, transparent 55%), radial-gradient(at 90% 80%, #ec489966 0%, transparent 55%), linear-gradient(160deg, #7c2d12, #9d174d)"
  },
  {
    id: "bg_candy",
    label: "Candy",
    category: "fun",
    css: "radial-gradient(at 15% 15%, #f9a8d4aa 0%, transparent 55%), radial-gradient(at 85% 85%, #a78bfaaa 0%, transparent 55%), linear-gradient(160deg, #fdf2f8, #ede9fe)"
  },

  // ---- companion ----
  {
    id: "bg_late_night_bar",
    label: "Late Night Bar",
    category: "companion",
    css: "radial-gradient(at 75% 20%, #b4530944 0%, transparent 50%), radial-gradient(at 20% 90%, #7c2d1233 0%, transparent 55%), linear-gradient(170deg, #1c1210, #2c1810)"
  },
  {
    id: "bg_warm_lamp",
    label: "Warm Lamp",
    category: "companion",
    css: "radial-gradient(at 50% 0%, #f59e0b55 0%, transparent 60%), radial-gradient(at 90% 100%, #92400e44 0%, transparent 50%), linear-gradient(170deg, #451a03, #78350f)"
  },
  {
    id: "bg_diary_pastel",
    label: "Diary Pastel",
    category: "companion",
    css: "radial-gradient(at 20% 20%, #fde68aa8 0%, transparent 55%), radial-gradient(at 85% 80%, #fca5a5a8 0%, transparent 55%), linear-gradient(160deg, #fffbeb, #fef2f2)"
  },

  // ---- roleplay ----
  {
    id: "bg_retro_quest",
    label: "Retro Quest",
    category: "roleplay",
    css: "radial-gradient(at 80% 10%, #6d28d955 0%, transparent 55%), radial-gradient(at 10% 90%, #4c1d9544 0%, transparent 55%), linear-gradient(170deg, #12102b, #1e1b4b)"
  },
  {
    id: "bg_deduction_fog",
    label: "Deduction Fog",
    category: "roleplay",
    css: "radial-gradient(at 30% 20%, #6b728044 0%, transparent 55%), radial-gradient(at 90% 90%, #37415155 0%, transparent 55%), linear-gradient(170deg, #1f2937, #374151)"
  },

  // ---- philosophy ----
  {
    id: "bg_marble_hall",
    label: "Marble Hall",
    category: "philosophy",
    css: "radial-gradient(at 25% 15%, #f9fafb 0%, transparent 55%), radial-gradient(at 80% 90%, #d1d5db 0%, transparent 55%), linear-gradient(160deg, #f3f4f6, #e5e7eb)"
  },
  {
    id: "bg_zen_ink",
    label: "Zen Ink",
    category: "philosophy",
    css: "radial-gradient(at 85% 15%, #52525b33 0%, transparent 55%), radial-gradient(at 15% 85%, #27272a55 0%, transparent 50%), linear-gradient(160deg, #fafafa, #d4d4d8)"
  }
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
      background-image: linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), ${preset.css} !important;
      background-size: cover !important;
      background-attachment: fixed !important;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-image: linear-gradient(rgba(10,12,18,0.5), rgba(10,12,18,0.5)), ${preset.css} !important;
      }
    }
  `

  if (!existing) document.head.appendChild(style)
}
