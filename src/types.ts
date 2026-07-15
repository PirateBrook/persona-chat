export type ModeKey = "original" | "image" | "persona"

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
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface AppState {
  activeMode: ModeKey
  activePersonaId: string | null
  activeBackgroundId: string | null
  panelOpen: boolean
}

export const DEFAULT_APP_STATE: AppState = {
  activeMode: "original",
  activePersonaId: null,
  activeBackgroundId: null,
  panelOpen: false
}
