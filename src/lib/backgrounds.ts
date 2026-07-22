import { getCustomBackground } from "../storage"
import type { CustomBackground } from "../types"

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

/**
 * Real noise, not a stripe pattern. An SVG `feTurbulence` filter rendered to
 * a fixed, low, uniform alpha via `feColorMatrix` (the matrix zeroes every
 * RGB channel and clamps alpha to a constant regardless of the turbulence's
 * own per-pixel luminance) — so it reads as fine, organic grain rather than
 * the flat repeating-linear-gradient "scanline" banding this used to be.
 * One shared generator, two alpha strengths: dark backgrounds read grain a
 * touch stronger than light ones do at the same alpha (eyes pick up light
 * speckle on dark more readily), so light gets less.
 */
function noiseLayer(alpha: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${alpha} 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
const NOISE_DARK = noiseLayer(0.05)
const NOISE_LIGHT = noiseLayer(0.035)

/**
 * Three-stop feathering so blooms have a soft bleed edge instead of a
 * uniform fade — reads as an intentional ink/light bloom, not a flat CSS
 * radial. Interpolated `in oklch`: fading a saturated color to transparent
 * in plain rgb/hsl space passes through a muddy, desaturated gray at the
 * midpoint (a well-documented artifact); oklch keeps the fade perceptually
 * clean the whole way to transparent.
 */
function accent(x: number, y: number, r: number, g: number, b: number, alpha: number): string {
  const dim = Math.round(alpha * 40) / 100
  return `radial-gradient(55% 42% at ${x}% ${y}% in oklch, rgba(${r},${g},${b},${alpha}) 0%, rgba(${r},${g},${b},${dim}) 45%, transparent 72%)`
}

function base(from: string, to: string): string {
  return `linear-gradient(165deg in oklch, ${from} 0%, ${to} 100%)`
}

function variant(grain: string, layers: string[], baseLayer: string): string {
  return [grain, ...layers, baseLayer].join(", ")
}

/** Fine architectural hairline grid — drafting-table vernacular, not a
 *  generic soft blob. Repeating-gradient period is intrinsic to the
 *  function (an angle + a pixel cycle), so it isn't distorted by the
 *  shared `background-size: cover` the way a tiled raster image would be —
 *  same reasoning MARBLE_VEINS already relies on below. */
function hairlineGrid(rgba: string, cell: number): string {
  return [
    `repeating-linear-gradient(0deg, ${rgba} 0 1px, transparent 1px ${cell}px)`,
    `repeating-linear-gradient(90deg, ${rgba} 0 1px, transparent 1px ${cell}px)`
  ].join(", ")
}

/** Ruled-notebook horizontal lines — literal desk paper, not a metaphor. */
function ruledLines(rgba: string, spacing: number): string {
  return `repeating-linear-gradient(0deg, ${rgba} 0 1px, transparent 1px ${spacing}px)`
}

/** A handful of hand-placed small highlights (confetti / star-dust). Fixed
 *  pixel radii, not a tiled pattern — background-size doesn't rescale a
 *  gradient's absolute px stops, so these stay crisp regardless of
 *  viewport size, but deliberately placed rather than mechanically
 *  repeated. */
function dots(points: Array<[number, number, number, string]>): string {
  return points
    .map(([x, y, r, rgba]) => `radial-gradient(circle at ${x}% ${y}%, ${rgba} 0 ${r}px, transparent ${r + 1}px)`)
    .join(", ")
}

/** Soft drifting fog bands — noir vernacular built from plain gradient
 *  stops, `in oklch` for the same clean-fade-to-transparent reason as
 *  accent(). */
function fogBands(rgba: string): string {
  return `linear-gradient(190deg in oklch, transparent 0%, ${rgba} 30%, transparent 55%, ${rgba} 78%, transparent 100%)`
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
    // Drafting-table hairline grid — the "focus" mood grounded in an actual
    // instrument (blueprint/graph paper) instead of a generic cool blob.
    cssDark: variant(
      NOISE_DARK,
      [
        hairlineGrid("rgba(148,163,184,0.06)", 56),
        accent(0, 0, 51, 65, 85, 0.8),
        accent(100, 100, 30, 41, 59, 0.9)
      ],
      base("#0f172a", "#1e293b")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [
        hairlineGrid("rgba(51,65,85,0.05)", 56),
        accent(0, 0, 148, 163, 184, 0.35),
        accent(100, 100, 100, 116, 139, 0.22)
      ],
      base("#e8edf4", "#ccd5e0")
    ),
    bandAlpha: 0.35
  },
  {
    id: "bg_paper_desk",
    category: "work",
    // Literal ruled paper — the desk's own material, not a wash of brown.
    cssDark: variant(
      NOISE_DARK,
      [
        ruledLines("rgba(255,255,255,0.025)", 32),
        accent(20, 10, 168, 148, 110, 0.1),
        accent(90, 90, 120, 105, 80, 0.14)
      ],
      base("#1b1712", "#262019")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [
        ruledLines("rgba(120,98,66,0.06)", 32),
        accent(20, 10, 245, 240, 230, 0.9),
        accent(90, 90, 198, 188, 166, 0.5)
      ],
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
        "radial-gradient(120% 100% at 50% 40% in oklch, transparent 60%, rgba(2,6,12,0.5) 100%)",
        "radial-gradient(70% 55% at 78% 0% in oklch, rgba(20,83,45,0.35) 0%, rgba(20,83,45,0.12) 45%, transparent 70%)",
        "radial-gradient(50% 60% at 8% 100% in oklch, rgba(5,150,105,0.14) 0%, transparent 60%)"
      ],
      base("#070b14", "#101827")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [accent(80, 0, 22, 101, 52, 0.1), accent(10, 100, 5, 150, 105, 0.08)],
      base("#eaf0ea", "#d3ddd3")
    ),
    bandAlpha: 0.35
  },

  // ---- fun ----
  {
    id: "bg_sunset_pop",
    category: "fun",
    // Confetti dots, hand-placed rather than a mechanical tile — pop
    // energy without falling back to a plain diagonal wash.
    cssDark: variant(
      NOISE_DARK,
      [
        dots([
          [15, 25, 3.5, "rgba(255,247,237,0.85)"],
          [78, 15, 2.5, "rgba(251,191,36,0.75)"],
          [62, 70, 3, "rgba(255,247,237,0.7)"],
          [30, 82, 2.5, "rgba(244,114,182,0.65)"],
          [88, 60, 2, "rgba(251,146,60,0.6)"]
        ]),
        accent(10, 20, 251, 146, 60, 0.2),
        accent(90, 80, 236, 72, 153, 0.2)
      ],
      base("#4a1a0b", "#6b1038")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [
        dots([
          [15, 25, 3.5, "rgba(154,52,18,0.55)"],
          [78, 15, 2.5, "rgba(217,119,6,0.55)"],
          [62, 70, 3, "rgba(154,52,18,0.45)"],
          [30, 82, 2.5, "rgba(219,39,119,0.45)"],
          [88, 60, 2, "rgba(194,65,12,0.4)"]
        ]),
        accent(10, 20, 251, 146, 60, 0.35),
        accent(90, 80, 236, 72, 153, 0.28)
      ],
      base("#ffe8d9", "#fbd5e5")
    ),
    bandAlpha: 0.45
  },
  {
    id: "bg_candy",
    category: "fun",
    cssDark: variant(
      NOISE_DARK,
      [
        dots([
          [20, 20, 3, "rgba(253,242,248,0.8)"],
          [75, 30, 2.5, "rgba(244,114,182,0.7)"],
          [55, 75, 3, "rgba(253,242,248,0.65)"],
          [85, 80, 2.5, "rgba(167,139,250,0.65)"],
          [35, 55, 2, "rgba(232,121,249,0.55)"]
        ]),
        accent(15, 15, 244, 114, 182, 0.14),
        accent(85, 85, 139, 92, 246, 0.14)
      ],
      base("#241222", "#1c1730")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [
        dots([
          [20, 20, 3, "rgba(157,23,77,0.5)"],
          [75, 30, 2.5, "rgba(109,40,217,0.5)"],
          [55, 75, 3, "rgba(157,23,77,0.4)"],
          [85, 80, 2.5, "rgba(88,28,135,0.45)"],
          [35, 55, 2, "rgba(162,28,175,0.4)"]
        ]),
        accent(15, 15, 249, 168, 212, 0.55),
        accent(85, 85, 167, 139, 250, 0.45)
      ],
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
        "radial-gradient(3.5% 5% at 82% 30% in oklch, rgba(251,146,60,0.14) 0%, rgba(251,146,60,0.05) 60%, transparent 100%)",
        "radial-gradient(2.5% 4% at 68% 18% in oklch, rgba(245,158,11,0.10) 0%, transparent 100%)",
        "radial-gradient(3% 4.5% at 90% 48% in oklch, rgba(217,119,6,0.08) 0%, transparent 100%)",
        "conic-gradient(from 195deg at 78% -5% in oklch, transparent 0deg, rgba(180,83,9,0.28) 18deg, rgba(180,83,9,0.10) 42deg, transparent 60deg)",
        "radial-gradient(60% 30% at 25% 100% in oklch, rgba(124,45,18,0.25) 0%, transparent 65%)"
      ],
      base("#150d0a", "#26170f")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [accent(75, 20, 217, 119, 6, 0.16), accent(20, 90, 154, 52, 18, 0.1)],
      base("#f6ede2", "#e9d9c6")
    ),
    bandAlpha: 0.35
  },
  {
    id: "bg_warm_lamp",
    category: "companion",
    cssDark: variant(
      NOISE_DARK,
      [accent(50, 0, 245, 158, 11, 0.22), accent(90, 100, 146, 64, 14, 0.2)],
      base("#2e1503", "#4a2408")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [accent(50, 0, 245, 158, 11, 0.3), accent(90, 100, 180, 83, 9, 0.14)],
      base("#fdf3e0", "#f3ddb8")
    ),
    bandAlpha: 0.45
  },
  {
    id: "bg_diary_pastel",
    category: "companion",
    // Washi-paper fiber wash — two low-alpha crossing angles, wider and
    // softer than a structural grid so it reads as material, not lines.
    cssDark: variant(
      NOISE_DARK,
      [
        "repeating-linear-gradient(15deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 46px), repeating-linear-gradient(102deg, rgba(255,255,255,0.014) 0 1px, transparent 1px 61px)",
        accent(20, 20, 217, 180, 80, 0.1),
        accent(85, 80, 220, 120, 120, 0.1)
      ],
      base("#262019", "#2a1d1f")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [
        "repeating-linear-gradient(15deg, rgba(180,140,100,0.035) 0 1px, transparent 1px 46px), repeating-linear-gradient(102deg, rgba(180,140,100,0.025) 0 1px, transparent 1px 61px)",
        accent(20, 20, 253, 230, 138, 0.6),
        accent(85, 80, 252, 165, 165, 0.55)
      ],
      base("#fffbeb", "#fdeeee")
    ),
    bandAlpha: 0.35
  },

  // ---- roleplay ----
  {
    id: "bg_retro_quest",
    category: "roleplay",
    // Star-dust — hand-placed points of light, the JRPG world-map vernacular
    // this mood is actually borrowing from.
    cssDark: variant(
      NOISE_DARK,
      [
        dots([
          [10, 15, 1, "rgba(224,231,255,0.7)"],
          [85, 10, 1.2, "rgba(199,210,254,0.6)"],
          [60, 25, 0.8, "rgba(255,255,255,0.55)"],
          [25, 60, 1, "rgba(196,181,253,0.5)"],
          [92, 55, 0.8, "rgba(224,231,255,0.45)"],
          [45, 85, 1, "rgba(199,210,254,0.4)"]
        ]),
        accent(80, 10, 109, 40, 217, 0.25),
        accent(10, 90, 76, 29, 149, 0.25)
      ],
      base("#12102b", "#1e1b4b")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [
        dots([
          [10, 15, 1, "rgba(109,40,217,0.18)"],
          [85, 10, 1, "rgba(76,29,149,0.15)"],
          [55, 70, 1, "rgba(109,40,217,0.12)"],
          [30, 80, 1, "rgba(76,29,149,0.1)"]
        ]),
        accent(80, 10, 139, 92, 246, 0.22),
        accent(10, 90, 109, 40, 217, 0.14)
      ],
      base("#efeafd", "#ddd5f5")
    ),
    bandAlpha: 0.45
  },
  {
    id: "bg_deduction_fog",
    category: "roleplay",
    // Drifting fog bands — the noir/detective mood grounded in an actual
    // atmosphere instead of a flat gray-blue wash.
    cssDark: variant(
      NOISE_DARK,
      [fogBands("rgba(148,163,184,0.10)"), accent(30, 20, 107, 114, 128, 0.2), accent(90, 90, 55, 65, 81, 0.35)],
      base("#1b2430", "#2e3844")
    ),
    cssLight: variant(
      NOISE_LIGHT,
      [fogBands("rgba(100,116,139,0.08)"), accent(30, 20, 107, 114, 128, 0.18), accent(90, 90, 148, 163, 184, 0.28)],
      base("#e8ebef", "#ccd2da")
    ),
    bandAlpha: 0.35
  },

  // ---- philosophy ----
  {
    id: "bg_marble_hall",
    category: "philosophy",
    cssDark: variant(
      NOISE_DARK,
      [
        MARBLE_VEINS_DARK,
        accent(25, 15, 120, 126, 138, 0.12),
        accent(80, 90, 78, 82, 92, 0.16)
      ],
      base("#17181b", "#232529")
    ),
    cssLight: variant(
      NOISE_LIGHT,
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
      NOISE_DARK,
      [
        "radial-gradient(60% 45% at 85% 10% in oklch, rgba(113,113,122,0.16) 0%, rgba(113,113,122,0.06) 45%, transparent 72%)",
        "radial-gradient(50% 38% at 12% 88% in oklch, rgba(82,82,91,0.14) 0%, transparent 68%)"
      ],
      base("#101013", "#1e1e24")
    ),
    // Rice paper + ink bleed.
    cssLight: variant(
      NOISE_LIGHT,
      [
        "linear-gradient(178deg in oklch, transparent 58%, rgba(212,212,216,0.5) 68%, transparent 80%)",
        "radial-gradient(60% 45% at 88% 8% in oklch, rgba(39,39,42,0.38) 0%, rgba(39,39,42,0.22) 34%, rgba(39,39,42,0.08) 58%, transparent 75%)",
        "radial-gradient(45% 35% at 70% 22% in oklch, rgba(63,63,70,0.2) 0%, rgba(63,63,70,0.07) 45%, transparent 70%)",
        "radial-gradient(55% 40% at 6% 96% in oklch, rgba(24,24,27,0.3) 0%, rgba(24,24,27,0.1) 45%, transparent 72%)"
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

/**
 * Wraps a user-uploaded photo as a `BackgroundPreset`-shaped value so it can
 * flow through the exact same render/swatch pipeline as a built-in preset —
 * same image for both themes, and a stronger reading-band scrim by default
 * since an arbitrary photo (unlike the hand-tuned presets above) has no
 * guaranteed luminance band to keep DeepSeek's own text readable.
 */
export function customBackgroundToPreset(custom: CustomBackground): BackgroundPreset {
  const image = `url("${custom.dataUrl}")`
  return { id: custom.id, category: "custom", cssDark: image, cssLight: image, bandAlpha: 0.55 }
}

async function resolveBackground(id: string): Promise<BackgroundPreset | null> {
  const preset = getBackgroundPreset(id)
  if (preset) return preset
  const custom = await getCustomBackground(id)
  return custom ? customBackgroundToPreset(custom) : null
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
      void resolveBackground(activePresetId).then((preset) => {
        if (preset) render(preset, detectTheme())
      })
    }, 150)
  }

  try {
    const observer = new MutationObserver(onThemeMaybeChanged)
    // data-mode covers Claude.ai's theme signal (html[data-mode]); class/style/
    // data-theme cover DeepSeek's. Observing an extra attribute a platform
    // doesn't use is harmless.
    const opts: MutationObserverInit = {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-mode"]
    }
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

export async function applyBackground(id: string | null): Promise<void> {
  activePresetId = id
  const preset = id ? await resolveBackground(id) : null
  if (activePresetId !== id) return // superseded by a later call while this one awaited
  if (!preset) {
    clear()
    return
  }
  installThemeWatcher()
  render(preset, detectTheme())
}
