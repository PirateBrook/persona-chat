import { safeChromeCall } from "./lib/extension-context"
import { expandSeed, SEED_PERSONAS } from "./seed"
import type { AppState, Locale, PersonaCard } from "./types"
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
 * Installs missing built-in personas and refreshes already-installed ones
 * that the user hasn't customized (isCustomized), expanding seed content to
 * `locale`. Called on bootstrap and again whenever the resolved locale
 * changes, so flipping the language pref re-expands non-customized seeds in
 * place — same stable ids, so activePersonaId/worldInfo enrich state/
 * backgroundId never get orphaned by the switch. Cards the user edited via
 * the options page are skipped entirely, preserving their content.
 */
export async function ensureSeeds(locale: Locale): Promise<PersonaCard[]> {
  const existing = await listPersonas()
  const existingById = new Map(existing.map((p) => [p.id, p]))
  const now = Date.now()

  const toInstall = SEED_PERSONAS.filter((seed) => {
    const current = existingById.get(seed.id)
    return !current || !current.isCustomized
  }).map((seed) => {
    const current = existingById.get(seed.id)
    const expanded = expandSeed(seed, locale, now)
    return current ? { ...expanded, createdAt: current.createdAt } : expanded
  })

  if (toInstall.length === 0) return existing

  for (const card of toInstall) {
    await upsertPersona(card)
  }
  return listPersonas()
}

export function makePersonaId(): string {
  return `persona_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function makeWorldInfoId(): string {
  return `wi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
