export type ModeKey = "original" | "image" | "persona" | "tweaks"

export type Locale = "en" | "zh"
export type LanguagePref = "auto" | "en" | "zh"

export interface WorldInfoEntry {
  id: string
  keys: string[]
  content: string
  enabled: boolean
}

export interface PersonaCard {
  id: string
  name: string
  avatarEmoji: string
  personaPrompt: string
  scenario?: string
  exampleDialogue?: string
  greeting?: string
  driftReminder?: string
  worldInfo?: WorldInfoEntry[]
  backgroundId?: string
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

export interface AppState {
  activeMode: ModeKey
  activePersonaId: string | null
  activeBackgroundId: string | null
  panelOpen: boolean
  language: LanguagePref
  pageTweaks: PageTweaks
}

export const DEFAULT_APP_STATE: AppState = {
  activeMode: "persona",
  activePersonaId: null,
  activeBackgroundId: null,
  panelOpen: false,
  language: "auto",
  pageTweaks: { hideThinking: false }
}
