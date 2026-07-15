export type ModeKey = "original" | "image" | "persona"

export interface PersonaCard {
  id: string
  name: string
  avatarEmoji: string
  personaPrompt: string
  greeting?: string
  worldLore?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface AppState {
  activeMode: ModeKey
  activePersonaId: string | null
  panelOpen: boolean
}

export const DEFAULT_APP_STATE: AppState = {
  activeMode: "original",
  activePersonaId: null,
  panelOpen: false
}
