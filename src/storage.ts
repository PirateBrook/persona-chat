import { safeChromeCall } from "./lib/extension-context"
import type { AppState, PersonaCard } from "./types"
import { DEFAULT_APP_STATE } from "./types"

/**
 * Storage layout
 * - chrome.storage.local key "personas": Record<string, PersonaCard>
 * - chrome.storage.local key "appState": AppState
 *
 * Long-form fields (worldInfo entries) currently live inline on the card.
 * When we outgrow the 10MB local quota (v1+), split heavy fields into
 * IndexedDB behind the same interface.
 *
 * All chrome.storage calls flow through safeChromeCall so a stale content
 * script (extension was reloaded on a live tab) fails soft and lets the
 * UI show a "please refresh" banner instead of an uncaught rejection.
 */

const KEY_PERSONAS = "personas"
const KEY_APP_STATE = "appState"

async function getRaw<T>(key: string, fallback: T): Promise<T> {
  return safeChromeCall(async () => {
    const res = await chrome.storage.local.get(key)
    return (res[key] as T) ?? fallback
  }, fallback)
}

async function setRaw<T>(key: string, value: T): Promise<void> {
  await safeChromeCall(async () => {
    await chrome.storage.local.set({ [key]: value })
    return null
  }, null)
}

export async function listPersonas(): Promise<PersonaCard[]> {
  const map = await getRaw<Record<string, PersonaCard>>(KEY_PERSONAS, {})
  return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getPersona(id: string): Promise<PersonaCard | null> {
  const map = await getRaw<Record<string, PersonaCard>>(KEY_PERSONAS, {})
  return map[id] ?? null
}

export async function upsertPersona(card: PersonaCard): Promise<void> {
  const map = await getRaw<Record<string, PersonaCard>>(KEY_PERSONAS, {})
  map[card.id] = { ...card, updatedAt: Date.now() }
  await setRaw(KEY_PERSONAS, map)
}

export async function deletePersona(id: string): Promise<void> {
  const map = await getRaw<Record<string, PersonaCard>>(KEY_PERSONAS, {})
  delete map[id]
  await setRaw(KEY_PERSONAS, map)
}

export async function getAppState(): Promise<AppState> {
  return getRaw<AppState>(KEY_APP_STATE, DEFAULT_APP_STATE)
}

export async function setAppState(patch: Partial<AppState>): Promise<AppState> {
  const cur = await getAppState()
  const next = { ...cur, ...patch }
  await setRaw(KEY_APP_STATE, next)
  return next
}

/**
 * Generic map access for callers that need to batch several persona changes
 * into a single read + write (e.g. seed.ts's ensureSeeds) instead of paying
 * a full get+set per card via upsertPersona in a loop.
 */
export async function getPersonaMap(): Promise<Record<string, PersonaCard>> {
  return getRaw<Record<string, PersonaCard>>(KEY_PERSONAS, {})
}

export async function setPersonaMap(map: Record<string, PersonaCard>): Promise<void> {
  await setRaw(KEY_PERSONAS, map)
}

export function makePersonaId(): string {
  return `persona_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function makeWorldInfoId(): string {
  return `wi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
