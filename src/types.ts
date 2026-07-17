export type ModeKey = "original" | "image" | "persona" | "tweaks"

export type Locale = "en" | "zh"
export type LanguagePref = "auto" | "en" | "zh"

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
}

export const DEFAULT_APP_STATE: AppState = {
  activeMode: "persona",
  activePersonaId: null,
  activeBackgroundId: null,
  panelOpen: false,
  language: "auto",
  pageTweaks: { hideThinking: false },
  tts: { enabled: false }
}
