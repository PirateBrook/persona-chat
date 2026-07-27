export type ModeKey = "original" | "image" | "persona" | "tweaks"

export type Locale = "en" | "zh"
export type LanguagePref = "auto" | "en" | "zh"

/** How a lore entry maps onto the two injection anchors we actually own (the
 *  one-time activation message and the per-tap Enrich block). Mirrors
 *  Character Card V3's `@@position` names, but the semantics are a LOCAL,
 *  VISIBLE reinterpretation — we can't assemble a real prompt, so a `constant`
 *  entry with `before_desc`/`after_desc`/`personality`/`scenario` folds into
 *  the matching slot of the activation message; `at_depth` just means
 *  "ordered within the Enrich block by `depth`". */
export type WorldInfoPosition =
  | "before_desc"
  | "after_desc"
  | "personality"
  | "scenario"
  | "at_depth"

/** V3 `@@role`. We only have one user input box, so this is NOT a real
 *  system/assistant turn — it only picks the visible framing label the lore
 *  block is prefixed with. */
export type WorldInfoRole = "system" | "user" | "assistant"

export interface WorldInfoEntry {
  id: string
  keys: string[]
  content: string
  enabled: boolean
  /** Bypasses keyword matching entirely — always injected on "✨ Enrich"
   *  regardless of the draft's text. Used by user-flagged "memory" entries
   *  (see use-memory-note.ts), which have no natural trigger keyword since
   *  the point is the assistant remembers them unprompted. Hand-authored
   *  lore leaves this unset and keeps normal keyword gating. */
  alwaysActive?: boolean
  /** Provenance for UI grouping/display — "memory" entries (user-flagged
   *  mid-conversation) render separately from hand-authored world info in
   *  the options-page editor. Absent/undefined means "authored". */
  source?: "authored" | "memory"
  /** Character Card V3 `@@position` — see WorldInfoPosition. A `constant`
   *  (alwaysActive) entry in a description slot folds into the one-time
   *  activation message instead of repeating on every Enrich. */
  position?: WorldInfoPosition
  /** Character Card V3 `@@depth`. NOT history insertion (we can't touch chat
   *  history) — relative ordering *within* one Enrich message: larger depth
   *  sits farther from the user's draft (higher up). Absent = 0 (nearest). */
  depth?: number
  /** Character Card V3 `@@role` — visible framing label only (see
   *  WorldInfoRole), never a real message turn. */
  role?: WorldInfoRole
  /** Character Card V3 `insertion_order` — tiebreak among entries at the same
   *  depth, ascending. Absent = 0. */
  order?: number
}

export interface PersonaCard {
  id: string
  name: string
  avatarEmoji: string
  /** A real portrait image (data URL), e.g. extracted from an imported
   *  character-card PNG. Takes priority over `avatarEmoji` wherever an
   *  avatar renders — `avatarEmoji` stays as the fallback for cards that
   *  don't have one (all hand-authored seeds, manually created cards). */
  avatarImageDataUrl?: string
  personaPrompt: string
  scenario?: string
  exampleDialogue?: string
  greeting?: string
  /** Additional opening lines beyond `greeting` (Character Card V2/V3's
   *  `alternate_greetings`). `greeting` remains the default; these are
   *  extra options a UI may offer instead of it. */
  alternateGreetings?: string[]
  driftReminder?: string
  worldInfo?: WorldInfoEntry[]
  backgroundId?: string
  /** A persona's own scene background image (data URL, downscaled the same way
   *  as `avatarImageDataUrl`). Travels with the persona on export/import;
   *  applying the persona switches the page background to it. Takes priority
   *  over `backgroundId` (which references a shared preset / custom background). */
  backgroundImageDataUrl?: string
  /** Original card author, kept for attribution when importing a
   *  community character card (Character Card V2/V3 `creator`). Absent on
   *  hand-authored/seed cards. */
  creator?: string
  /** The creator's own notes about the character (V2/V3 `creator_notes`),
   *  shown as read-only context in the editor — distinct from our own
   *  `scenario`/`personaPrompt`, which the user can freely edit. */
  creatorNotes?: string
  /** Set once a user edits this card via the options page. Distinguishes
   *  "still the untouched built-in default" from "user customized it", so
   *  seed content updates can safely refresh the former without clobbering
   *  the latter. */
  isCustomized?: boolean
  /** Locale this card was expanded from at seed-install time. Absent on
   *  user-created cards — those stay single-language, whatever was typed. */
  seedLocale?: Locale
  tags: string[]
  createdAt: number
  updatedAt: number
  /** When the persona was last applied ("Apply"). Drives most-recently-used
   *  ordering. Set via markPersonaUsed, which deliberately does NOT bump
   *  updatedAt (applying isn't editing). Absent = never used. */
  lastUsedAt?: number
  /** User-pinned to the top of the persona list for quick access. */
  pinned?: boolean
}

/** A user-uploaded background image (downscaled + re-encoded client-side
 *  before storage — see BackgroundPicker.tsx). Selected the same way as a
 *  built-in `BackgroundPreset`, via its `id` in `AppState.activeBackgroundId`. */
export interface CustomBackground {
  id: string
  name: string
  dataUrl: string
  createdAt: number
}

/** DeepSeek page-DOM customizations — CSS-only tweaks applied to the real
 *  page (not our shadow-root panel). Each field is its own on/off switch so
 *  the set can grow without touching every reader. */
export interface PageTweaks {
  /** Hides DeepSeek's own "已思考" reasoning-trace block, leaving the final
   *  answer untouched. See docs/deepseek-dom-notes.md for the selector. */
  hideThinking: boolean
}

/** Text-to-speech playback preference. `chrome.tts` is the browser's own,
 *  free, on-device engine — no network call, no API cost. */
export interface TtsPreference {
  enabled: boolean
  /** `chrome.tts.TtsVoice.voiceName`. Undefined = system default voice. */
  voiceName?: string
  /** Playback rate, chrome.tts range 0.1–10. Undefined = 1 (normal). */
  rate?: number
}

export interface AppState {
  activeMode: ModeKey
  activePersonaId: string | null
  activeBackgroundId: string | null
  panelOpen: boolean
  language: LanguagePref
  pageTweaks: PageTweaks
  tts: TtsPreference
  /** Last tag filter chosen in the persona list, remembered across panel
   *  reopens. `null` = no filter. */
  personaTagFilter?: string | null
  /** Expansion value for the `{{user}}` macro (see lib/macros.ts) — a
   *  global setting, not per-persona. Optional: unset falls back to a
   *  locale-aware default noun ("User"/"用户") at expansion time, so macro
   *  expansion works correctly with zero configuration. */
  userName?: string
}

export const DEFAULT_APP_STATE: AppState = {
  activeMode: "persona",
  activePersonaId: null,
  activeBackgroundId: null,
  panelOpen: false,
  language: "auto",
  pageTweaks: { hideThinking: false },
  tts: { enabled: false },
  personaTagFilter: null
}
