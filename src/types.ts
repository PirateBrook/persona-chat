export type ModeKey = "original" | "image" | "persona"

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

export interface AppState {
  activeMode: ModeKey
  activePersonaId: string | null
  activeBackgroundId: string | null
  panelOpen: boolean
  language: LanguagePref
}

export const DEFAULT_APP_STATE: AppState = {
  activeMode: "persona",
  activePersonaId: null,
  activeBackgroundId: null,
  panelOpen: false,
  language: "auto"
}
