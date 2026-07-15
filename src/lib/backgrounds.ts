export interface BackgroundPreset {
  id: string
  category: string
  /** Full layered `background-image` stack, authored inside a hard
   *  luminance band so it never gets murky at any composited point:
   *  dark ≤ 0.086 relative luminance (≥7:1 vs light assistant text),
   *  light ≥ 0.451 (≥7:1 vs dark assistant text). No global scrim can
   *  rescue a preset authored at the wrong polarity, so each theme gets
   *  its own from-scratch stack rather than one gradient + an overlay. */
  cssDark: string
  cssLight: string
  /** Reading-band scrim strength (see readingBand()). Default 0.35;
   *  presets with saturated accents near center get a stronger band
   *  (0.40–0.45) so the text zone feels equally calm across all presets. */
  bandAlpha?: number
}

const GRAIN_DARK =
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.009) 0 1px, transparent 1px 4px)"
const GRAIN_LIGHT =
  "repeating-linear-gradient(0deg, rgba(0,0,0,0.016) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.012) 0 1px, transparent 1px 4px)"

/** Three-stop feathering so blooms have a soft bleed edge instead of a
 *  uniform fade — reads as an intentional ink/light bloom, not a flat CSS
 *  radial. */
function accent(x: number, y: number, r: number, g: number, b: number, alpha: number): string {
  const dim = Math.round(alpha * 40) / 100
  return `radial-gradient(55% 42% at ${x}% ${y}%, rgba(${r},${g},${b},${alpha}) 0%, rgba(${r},${g},${b},${dim}) 45%, transparent 72%)`
}

function base(from: string, to: string): string {
  return `linear-gradient(165deg, ${from} 0%, ${to} 100%)`
}

function variant(grain: string, layers: string[], baseLayer: string): string {
  return [grain, ...layers, baseLayer].join(", ")
}

const MARBLE_VEINS_DARK =
  "repeating-linear-gradient(105deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 14px), repeating-linear-gradient(100deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 23px)"
const MARBLE_VEINS_LIGHT =
  "repeating-linear-gradient(105deg, rgba(148,155,168,0.05) 0 2px, transparent 2px 14px), repeating-linear-gradient(100deg, rgba(148,155,168,0.03) 0 1px, transparent 1px 23px)"

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // ---- work ----
  {
    id: "bg_slate_focus",
    category: "work",
    cssDark: variant(
      GRAIN_DARK,
      [accent(0, 0, 51, 65, 85, 0.8), accent(100, 100, 30, 41, 59, 0.9)],
      base("#0f172a", "#1e293b")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(0, 0, 148, 163, 184, 0.35), accent(100, 100, 100, 116, 139, 0.22)],
      base("#e8edf4", "#ccd5e0")
    ),
    bandAlpha: 0.35
  },
  {
    id: "bg_paper_desk",
    category: "work",
    cssDark: variant(
      GRAIN_DARK,
      [accent(20, 10, 168, 148, 110, 0.1), accent(90, 90, 120, 105, 80, 0.14)],
      base("#1b1712", "#262019")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(20, 10, 245, 240, 230, 0.9), accent(90, 90, 198, 188, 166, 0.5)],
      base("#f0ebdf", "#dad3c3")
    ),
    bandAlpha: 0.35
  },
  {
    id: "bg_midnight_terminal",
    category: "work",
    // Phosphor glow + scanlines + depth falloff — the flagship "terminal" mood.
    cssDark: variant(
      "repeating-linear-gradient(0deg, rgba(134,239,172,0.02) 0 1px, transparent 1px 3px)",
      [
        "radial-gradient(120% 100% at 50% 40%, transparent 60%, rgba(2,6,12,0.5) 100%)",
        "radial-gradient(70% 55% at 78% 0%, rgba(20,83,45,0.35) 0%, rgba(20,83,45,0.12) 45%, transparent 70%)",
        "radial-gradient(50% 60% at 8% 100%, rgba(5,150,105,0.14) 0%, transparent 60%)"
      ],
      base("#070b14", "#101827")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(80, 0, 22, 101, 52, 0.1), accent(10, 100, 5, 150, 105, 0.08)],
      base("#eaf0ea", "#d3ddd3")
    ),
    bandAlpha: 0.35
  },

  // ---- fun ----
  {
    id: "bg_sunset_pop",
    category: "fun",
    cssDark: variant(
      GRAIN_DARK,
      [accent(10, 20, 251, 146, 60, 0.2), accent(90, 80, 236, 72, 153, 0.2)],
      base("#4a1a0b", "#6b1038")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(10, 20, 251, 146, 60, 0.35), accent(90, 80, 236, 72, 153, 0.28)],
      base("#ffe8d9", "#fbd5e5")
    ),
    bandAlpha: 0.45
  },
  {
    id: "bg_candy",
    category: "fun",
    cssDark: variant(
      GRAIN_DARK,
      [accent(15, 15, 244, 114, 182, 0.14), accent(85, 85, 139, 92, 246, 0.14)],
      base("#241222", "#1c1730")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(15, 15, 249, 168, 212, 0.55), accent(85, 85, 167, 139, 250, 0.45)],
      base("#fdf2f8", "#ece8fd")
    ),
    bandAlpha: 0.4
  },

  // ---- companion ----
  {
    id: "bg_late_night_bar",
    category: "companion",
    // Conic lamp cone + bokeh dots + floor bounce.
    cssDark: variant(
      "repeating-linear-gradient(115deg, rgba(255,255,255,0.008) 0 1px, transparent 1px 4px)",
      [
        "radial-gradient(3.5% 5% at 82% 30%, rgba(251,146,60,0.14) 0%, rgba(251,146,60,0.05) 60%, transparent 100%)",
        "radial-gradient(2.5% 4% at 68% 18%, rgba(245,158,11,0.10) 0%, transparent 100%)",
        "radial-gradient(3% 4.5% at 90% 48%, rgba(217,119,6,0.08) 0%, transparent 100%)",
        "conic-gradient(from 195deg at 78% -5%, transparent 0deg, rgba(180,83,9,0.28) 18deg, rgba(180,83,9,0.10) 42deg, transparent 60deg)",
        "radial-gradient(60% 30% at 25% 100%, rgba(124,45,18,0.25) 0%, transparent 65%)"
      ],
      base("#150d0a", "#26170f")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(75, 20, 217, 119, 6, 0.16), accent(20, 90, 154, 52, 18, 0.1)],
      base("#f6ede2", "#e9d9c6")
    ),
    bandAlpha: 0.35
  },
  {
    id: "bg_warm_lamp",
    category: "companion",
    cssDark: variant(
      GRAIN_DARK,
      [accent(50, 0, 245, 158, 11, 0.22), accent(90, 100, 146, 64, 14, 0.2)],
      base("#2e1503", "#4a2408")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(50, 0, 245, 158, 11, 0.3), accent(90, 100, 180, 83, 9, 0.14)],
      base("#fdf3e0", "#f3ddb8")
    ),
    bandAlpha: 0.45
  },
  {
    id: "bg_diary_pastel",
    category: "companion",
    cssDark: variant(
      GRAIN_DARK,
      [accent(20, 20, 217, 180, 80, 0.1), accent(85, 80, 220, 120, 120, 0.1)],
      base("#262019", "#2a1d1f")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(20, 20, 253, 230, 138, 0.6), accent(85, 80, 252, 165, 165, 0.55)],
      base("#fffbeb", "#fdeeee")
    ),
    bandAlpha: 0.35
  },

  // ---- roleplay ----
  {
    id: "bg_retro_quest",
    category: "roleplay",
    cssDark: variant(
      GRAIN_DARK,
      [accent(80, 10, 109, 40, 217, 0.25), accent(10, 90, 76, 29, 149, 0.25)],
      base("#12102b", "#1e1b4b")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(80, 10, 139, 92, 246, 0.22), accent(10, 90, 109, 40, 217, 0.14)],
      base("#efeafd", "#ddd5f5")
    ),
    bandAlpha: 0.45
  },
  {
    id: "bg_deduction_fog",
    category: "roleplay",
    cssDark: variant(
      GRAIN_DARK,
      [accent(30, 20, 107, 114, 128, 0.2), accent(90, 90, 55, 65, 81, 0.35)],
      base("#1b2430", "#2e3844")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [accent(30, 20, 107, 114, 128, 0.18), accent(90, 90, 148, 163, 184, 0.28)],
      base("#e8ebef", "#ccd2da")
    ),
    bandAlpha: 0.35
  },

  // ---- philosophy ----
  {
    id: "bg_marble_hall",
    category: "philosophy",
    cssDark: variant(
      GRAIN_DARK,
      [
        MARBLE_VEINS_DARK,
        accent(25, 15, 120, 126, 138, 0.12),
        accent(80, 90, 78, 82, 92, 0.16)
      ],
      base("#17181b", "#232529")
    ),
    cssLight: variant(
      GRAIN_LIGHT,
      [
        MARBLE_VEINS_LIGHT,
        accent(25, 15, 255, 255, 255, 0.9),
        accent(80, 90, 190, 196, 205, 0.5)
      ],
      base("#f4f5f7", "#e2e5e9")
    ),
    bandAlpha: 0.35
  },
  {
    id: "bg_zen_ink",
    category: "philosophy",
    // Night ink — mist blooms lighter than the paper, the flagship fix for
    // the "flat murky gray" bug (the old single gradient was authored light
    // and got crushed by a global 50% dark scrim).
    cssDark: variant(
      GRAIN_DARK,
      [
        "radial-gradient(60% 45% at 85% 10%, rgba(113,113,122,0.16) 0%, rgba(113,113,122,0.06) 45%, transparent 72%)",
        "radial-gradient(50% 38% at 12% 88%, rgba(82,82,91,0.14) 0%, transparent 68%)"
      ],
      base("#101013", "#1e1e24")
    ),
    // Rice paper + ink bleed.
    cssLight: variant(
      GRAIN_LIGHT,
      [
        "linear-gradient(178deg, transparent 58%, rgba(212,212,216,0.5) 68%, transparent 80%)",
        "radial-gradient(60% 45% at 88% 8%, rgba(39,39,42,0.38) 0%, rgba(39,39,42,0.22) 34%, rgba(39,39,42,0.08) 58%, transparent 75%)",
        "radial-gradient(45% 35% at 70% 22%, rgba(63,63,70,0.2) 0%, rgba(63,63,70,0.07) 45%, transparent 70%)",
        "radial-gradient(55% 40% at 6% 96%, rgba(24,24,27,0.3) 0%, rgba(24,24,27,0.1) 45%, transparent 72%)"
      ],
      base("#f6f5f1", "#d6d5d0")
    ),
    bandAlpha: 0.35
  }
]

export function getBackgroundPreset(id: string | null): BackgroundPreset | null {
  if (!id) return null
  return BACKGROUND_PRESETS.find((p) => p.id === id) ?? null
}

export type Theme = "light" | "dark"

/**
 * `prefers-color-scheme` reflects the OS, but DeepSeek has its own theme
 * toggle that can disagree with it. `color-scheme` is the standards-based
 * signal a page uses to declare its own actual theme (verified live against
 * chat.deepseek.com: `getComputedStyle(document.body).colorScheme` reports
 * "dark"/"light" directly and correctly) — prefer it over guessing from an
 * arbitrary computed color, which earlier turned out to read body's
 * inherited text color rather than anything theme-related (measured
 * rgb(128,0,128) on an actually-dark page — meaningless). Falls back to
 * body's own background-color luminance (still theme-indicative, unlike
 * text color), then prefers-color-scheme.
 */
export function detectTheme(): Theme {
  try {
    const scheme = getComputedStyle(document.body).colorScheme
    if (scheme.includes("dark") && !scheme.includes("light")) return "dark"
    if (scheme.includes("light") && !scheme.includes("dark")) return "light"

    const match = getComputedStyle(document.body).backgroundColor.match(/\d+/g)
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number)
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return luminance > 140 ? "light" : "dark"
    }
  } catch {
    // fall through
  }
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

/**
 * One fixed horizontal band, pinned to where DeepSeek's centered content
 * column always lives (never wider than ~60% of the viewport). This is the
 * ONLY scrim in the system — it's margin on top of variants already inside
 * their luminance band, not a rescue, so the reading zone stays calm while
 * the gutters keep the gradient's full vividness. Do not reintroduce a
 * full-viewport scrim.
 */
function readingBand(theme: Theme, alpha: number): string {
  const rgb = theme === "dark" ? "9,11,16" : "250,250,250"
  return `linear-gradient(to right, rgba(${rgb},0) 0%, rgba(${rgb},${alpha}) 16%, rgba(${rgb},${alpha}) 84%, rgba(${rgb},0) 100%)`
}

function compositedImage(preset: BackgroundPreset, theme: Theme): string {
  const band = readingBand(theme, preset.bandAlpha ?? 0.35)
  const layer = theme === "dark" ? preset.cssDark : preset.cssLight
  return `${band}, ${layer}`
}

/** Uniform-strength version of the band for swatch previews — a 4:3 swatch
 *  is all "reading zone", so there's no gutter/center distinction to show. */
export function getSwatchCss(preset: BackgroundPreset, theme: Theme): string {
  const rgb = theme === "dark" ? "9,11,16" : "250,250,250"
  const alpha = preset.bandAlpha ?? 0.35
  const layer = theme === "dark" ? preset.cssDark : preset.cssLight
  return `linear-gradient(rgba(${rgb},${alpha}), rgba(${rgb},${alpha})), ${layer}`
}

const STYLE_ELEMENT_ID = "persona-chat-background-style"
let activePresetId: string | null = null
let themeWatcherInstalled = false

/**
 * A `<style>` rule targeting `html` AND `body`'s own `background-image` —
 * NOT a sibling element. A sibling div, even at `z-index: -1`, is just
 * another normal element in the stacking order: verified live that
 * DeepSeek's own descendants (any of them, at any depth, with any opaque
 * background) painted over such a div, since negative z-index only
 * outranks other things in the *same* stacking context, not every opaque
 * box in the whole subtree.
 *
 * Setting it on `body` alone isn't reliable either: per the CSS canvas
 * background-propagation rule, when `html` has no background, `body`'s
 * background gets "promoted" to paint the page canvas, and `body`'s own box
 * is treated as if it has no background *of its own* for normal painting —
 * an ambiguous, implementation-sensitive path. Declaring the identical
 * image on both elements sidesteps the propagation question entirely:
 * whichever one ends up responsible for the canvas, it's carrying the
 * right value, at the cost of not being animatable — presets swap
 * instantly rather than cross-fading.
 */
function ensureStyleElement(): HTMLStyleElement {
  let style = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement("style")
    style.id = STYLE_ELEMENT_ID
    document.head.appendChild(style)
  }
  return style
}

function render(preset: BackgroundPreset, theme: Theme): void {
  const style = ensureStyleElement()
  const image = compositedImage(preset, theme)
  style.textContent = `
    html, body {
      background-image: ${image} !important;
      background-repeat: no-repeat !important;
      background-size: cover !important;
      background-attachment: fixed !important;
    }
  `
}

function clear(): void {
  document.getElementById(STYLE_ELEMENT_ID)?.remove()
}

function installThemeWatcher(): void {
  if (themeWatcherInstalled) return
  themeWatcherInstalled = true

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  function onThemeMaybeChanged() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (!activePresetId) return
      const preset = getBackgroundPreset(activePresetId)
      if (preset) render(preset, detectTheme())
    }, 150)
  }

  try {
    const observer = new MutationObserver(onThemeMaybeChanged)
    const opts: MutationObserverInit = { attributes: true, attributeFilter: ["class", "style", "data-theme"] }
    observer.observe(document.documentElement, opts)
    observer.observe(document.body, opts)
  } catch {
    // MutationObserver unavailable in some odd context — theme just won't live-update.
  }

  try {
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onThemeMaybeChanged)
  } catch {
    // no-op
  }
}

export function applyBackground(id: string | null): void {
  activePresetId = id
  const preset = getBackgroundPreset(id)
  if (!preset) {
    clear()
    return
  }
  installThemeWatcher()
  render(preset, detectTheme())
}
