import { safeChromeCall } from "./lib/extension-context"
import type { AppState, CustomBackground, PersonaCard } from "./types"
import { DEFAULT_APP_STATE } from "./types"

/**
 * Storage layout
 * - chrome.storage.local key "personas": Record<string, PersonaCard>
 * - chrome.storage.local key "appState": AppState
 * - chrome.storage.local key "customBackgrounds": Record<string, CustomBackground>
 *
 * Long-form fields (worldInfo entries, custom background data URLs) live
 * inline. The `unlimitedStorage` permission lifts chrome.storage.local's
 * default 10MB quota specifically so custom background images (base64,
 * downscaled but still sizable) don't run into it.
 *
 * All chrome.storage calls flow through safeChromeCall so a stale content
 * script (extension was reloaded on a live tab) fails soft and lets the
 * UI show a "please refresh" banner instead of an uncaught rejection.
 */

const KEY_PERSONAS = "personas"
const KEY_APP_STATE = "appState"
const KEY_CUSTOM_BACKGROUNDS = "customBackgrounds"

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

/**
 * Generic map access — the one place that knows the persona map lives under
 * KEY_PERSONAS. Every persona CRUD function below reads/writes through
 * these two rather than repeating `getRaw(KEY_PERSONAS, {})` inline, and
 * callers that need to batch several changes into a single read + write
 * (e.g. seed.ts's ensureSeeds) can use them directly instead of paying a
 * full get+set per card via upsertPersona in a loop.
 */
export async function getPersonaMap(): Promise<Record<string, PersonaCard>> {
  return getRaw<Record<string, PersonaCard>>(KEY_PERSONAS, {})
}

export async function setPersonaMap(map: Record<string, PersonaCard>): Promise<void> {
  await setRaw(KEY_PERSONAS, map)
}

/**
 * Persona list ordering, shared by listPersonas and seed.ts's ensureSeeds so
 * every surface agrees: pinned entries first, then most-recently-used
 * ("Apply"), then most-recently-updated (edited/created).
 */
export function comparePersonas(a: PersonaCard, b: PersonaCard): number {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
  const used = (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)
  if (used !== 0) return used
  return b.updatedAt - a.updatedAt
}

export async function listPersonas(): Promise<PersonaCard[]> {
  const map = await getPersonaMap()
  return Object.values(map).sort(comparePersonas)
}

export async function getPersona(id: string): Promise<PersonaCard | null> {
  const map = await getPersonaMap()
  return map[id] ?? null
}

export async function upsertPersona(card: PersonaCard): Promise<void> {
  const map = await getPersonaMap()
  map[card.id] = { ...card, updatedAt: Date.now() }
  await setPersonaMap(map)
}

export async function deletePersona(id: string): Promise<void> {
  const map = await getPersonaMap()
  delete map[id]
  await setPersonaMap(map)
}

/**
 * Records that a persona was applied. Sets `lastUsedAt` only — NOT `updatedAt`
 * — so most-recently-used ordering works without making every apply look like
 * an edit (which would also fight ensureSeeds' seed-refresh comparison).
 */
export async function markPersonaUsed(id: string): Promise<void> {
  const map = await getPersonaMap()
  const p = map[id]
  if (!p) return
  map[id] = { ...p, lastUsedAt: Date.now() }
  await setPersonaMap(map)
}

/** Pins / unpins a persona (list ordering only; doesn't bump updatedAt). */
export async function setPersonaPinned(id: string, pinned: boolean): Promise<void> {
  const map = await getPersonaMap()
  const p = map[id]
  if (!p) return
  map[id] = { ...p, pinned }
  await setPersonaMap(map)
}

export async function getCustomBackgroundMap(): Promise<Record<string, CustomBackground>> {
  return getRaw<Record<string, CustomBackground>>(KEY_CUSTOM_BACKGROUNDS, {})
}

export async function setCustomBackgroundMap(map: Record<string, CustomBackground>): Promise<void> {
  await setRaw(KEY_CUSTOM_BACKGROUNDS, map)
}

export async function listCustomBackgrounds(): Promise<CustomBackground[]> {
  const map = await getCustomBackgroundMap()
  return Object.values(map).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getCustomBackground(id: string): Promise<CustomBackground | null> {
  const map = await getCustomBackgroundMap()
  return map[id] ?? null
}

export async function upsertCustomBackground(bg: CustomBackground): Promise<void> {
  const map = await getCustomBackgroundMap()
  map[bg.id] = bg
  await setCustomBackgroundMap(map)
}

export async function deleteCustomBackground(id: string): Promise<void> {
  const map = await getCustomBackgroundMap()
  delete map[id]
  await setCustomBackgroundMap(map)
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

export function makePersonaId(): string {
  return `persona_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function makeWorldInfoId(): string {
  return `wi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function makeCustomBackgroundId(): string {
  return `bg_custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
