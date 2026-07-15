import { useEffect, useState } from "react"

import "./style.css"

import { BACKGROUND_PRESETS } from "~lib/backgrounds"
import {
  deletePersona,
  getPersona,
  listPersonas,
  makePersonaId,
  makeWorldInfoId,
  upsertPersona
} from "~storage"
import type { PersonaCard, WorldInfoEntry } from "~types"

const INPUT_CLS =
  "w-full rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-sm outline-none transition placeholder:text-gray-400 focus:border-persona-400 focus:bg-white focus:ring-2 focus:ring-persona-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:focus:border-persona-500 dark:focus:bg-gray-800"

const INPUT_CLS_SMALL =
  "w-full rounded-lg border border-gray-200 bg-gray-50/60 px-2.5 py-1.5 text-xs outline-none transition placeholder:text-gray-400 focus:border-persona-400 focus:bg-white focus:ring-2 focus:ring-persona-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:focus:border-persona-500 dark:focus:bg-gray-800"

/**
 * Options page is the primary create/edit surface. Content-script panel is
 * consumption-only (apply, browse); mutation flows through here. Keeps the
 * overlay lightweight and lets us reuse this page as a standalone editor
 * link ("Edit in tab") from the overlay later.
 *
 * World Info keys are edited as free-form comma-separated text per row.
 * Keeping a separate draft string per row (rather than deriving the input's
 * value from `keys.join(", ")` on every keystroke) avoids a controlled-input
 * round-trip bug: split→join on every render reformats spacing out from
 * under the user's cursor. The draft is only parsed into `keys: string[]`
 * at save time.
 */
export default function Options() {
  const [personas, setPersonas] = useState<PersonaCard[]>([])
  const [editing, setEditing] = useState<PersonaCard | null>(null)
  const [worldInfoKeysDraft, setWorldInfoKeysDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    setPersonas(await listPersonas())
  }

  function loadIntoEditor(persona: PersonaCard) {
    setEditing(persona)
    setWorldInfoKeysDraft(
      Object.fromEntries((persona.worldInfo ?? []).map((e) => [e.id, e.keys.join(", ")]))
    )
  }

  function startCreate() {
    loadIntoEditor({
      id: makePersonaId(),
      name: "",
      avatarEmoji: "🎭",
      personaPrompt: "",
      scenario: "",
      exampleDialogue: "",
      greeting: "",
      driftReminder: "",
      worldInfo: [],
      backgroundId: undefined,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }

  async function startEdit(id: string) {
    const p = await getPersona(id)
    if (p) loadIntoEditor(p)
  }

  async function save() {
    if (!editing) return
    if (!editing.name.trim() || !editing.personaPrompt.trim()) {
      alert("Name and Persona prompt are required.")
      return
    }

    const finalWorldInfo: WorldInfoEntry[] = (editing.worldInfo ?? []).map((entry) => ({
      ...entry,
      keys: (worldInfoKeysDraft[entry.id] ?? entry.keys.join(", "))
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    }))

    await upsertPersona({ ...editing, worldInfo: finalWorldInfo, isCustomized: true })
    setEditing(null)
    await refresh()
  }

  async function remove(id: string) {
    if (!confirm("Delete this persona?")) return
    await deletePersona(id)
    if (editing?.id === id) setEditing(null)
    await refresh()
  }

  function exportAll() {
    const blob = new Blob([JSON.stringify(personas, null, 2)], {
      type: "application/json"
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `persona-chat-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importFromFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      const cards: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
      let imported = 0
      for (const raw of cards) {
        const card = raw as Partial<PersonaCard>
        if (!card || typeof card.name !== "string" || typeof card.personaPrompt !== "string") {
          continue
        }
        await upsertPersona({
          // Fresh id on import: never silently overwrite an existing persona
          // that happens to share an id with the shared file.
          id: makePersonaId(),
          name: card.name,
          avatarEmoji: card.avatarEmoji || "🎭",
          personaPrompt: card.personaPrompt,
          scenario: card.scenario,
          exampleDialogue: card.exampleDialogue,
          greeting: card.greeting,
          driftReminder: card.driftReminder,
          worldInfo: Array.isArray(card.worldInfo)
            ? card.worldInfo
                .filter((e) => e && typeof e.content === "string")
                .map((e) => ({
                  id: makeWorldInfoId(),
                  keys: Array.isArray(e.keys) ? e.keys.filter((k) => typeof k === "string") : [],
                  content: e.content,
                  enabled: e.enabled !== false
                }))
            : undefined,
          backgroundId: typeof card.backgroundId === "string" ? card.backgroundId : undefined,
          tags: Array.isArray(card.tags) ? card.tags.filter((t) => typeof t === "string") : [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
        imported++
      }
      await refresh()
      alert(imported > 0 ? `Imported ${imported} persona(s).` : "No valid personas found in file.")
    } catch {
      alert("Couldn't parse that file — expected a persona-chat JSON export.")
    }
  }

  function addWorldInfoRow() {
    if (!editing) return
    const entry: WorldInfoEntry = { id: makeWorldInfoId(), keys: [], content: "", enabled: true }
    setEditing({ ...editing, worldInfo: [...(editing.worldInfo ?? []), entry] })
    setWorldInfoKeysDraft((prev) => ({ ...prev, [entry.id]: "" }))
  }

  function removeWorldInfoRow(id: string) {
    if (!editing) return
    setEditing({ ...editing, worldInfo: (editing.worldInfo ?? []).filter((e) => e.id !== id) })
    setWorldInfoKeysDraft((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function updateWorldInfoContent(id: string, content: string) {
    if (!editing) return
    setEditing({
      ...editing,
      worldInfo: (editing.worldInfo ?? []).map((e) => (e.id === id ? { ...e, content } : e))
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-persona-400 to-persona-600" />Persona</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your character library · stored locally
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportAll}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Export
            </button>
            <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
              Import
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void importFromFile(file)
                  e.target.value = ""
                }}
              />
            </label>
            <button
              onClick={startCreate}
              className="rounded-lg bg-persona-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-persona-700"
            >
              + New persona
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Personas ({personas.length})
            </h2>
            <ul className="space-y-2">
              {personas.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:shadow dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{p.avatarEmoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{p.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                        {p.personaPrompt}
                      </div>
                      {(p.worldInfo?.length ?? 0) > 0 && (
                        <div className="mt-1 text-[10px] text-persona-600">
                          📖 {p.worldInfo!.length} world info {p.worldInfo!.length === 1 ? "entry" : "entries"}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => startEdit(p.id)}
                        className="rounded px-2 py-1 text-xs text-persona-600 hover:bg-persona-50 dark:hover:bg-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-gray-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {personas.length === 0 && (
                <li className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  No personas yet. Click "+ New persona" to start.
                </li>
              )}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {editing ? "Editor" : "Preview"}
            </h2>
            {editing ? (
              <div className="space-y-3.5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <FormField label="Name">
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label="Avatar emoji">
                  <input
                    value={editing.avatarEmoji}
                    onChange={(e) =>
                      setEditing({ ...editing, avatarEmoji: e.target.value })
                    }
                    className="w-24 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-lg outline-none transition focus:border-persona-400 focus:bg-white focus:ring-2 focus:ring-persona-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:focus:border-persona-500 dark:focus:bg-gray-800"
                  />
                </FormField>
                <FormField label="Persona prompt (personality)">
                  <textarea
                    value={editing.personaPrompt}
                    onChange={(e) =>
                      setEditing({ ...editing, personaPrompt: e.target.value })
                    }
                    rows={6}
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label="Scenario (optional) — the setting/situation">
                  <textarea
                    value={editing.scenario ?? ""}
                    onChange={(e) => setEditing({ ...editing, scenario: e.target.value })}
                    rows={2}
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label="Example dialogue (optional) — locks voice/style">
                  <textarea
                    value={editing.exampleDialogue ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, exampleDialogue: e.target.value })
                    }
                    rows={3}
                    placeholder={"User: ...\nCharacter: ..."}
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label="Greeting (optional)">
                  <input
                    value={editing.greeting ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, greeting: e.target.value })
                    }
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label="In-character reminder (optional) — resurfaces every few enrich-taps to fight drift">
                  <input
                    value={editing.driftReminder ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, driftReminder: e.target.value })
                    }
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label="Background (optional)">
                  <select
                    value={editing.backgroundId ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, backgroundId: e.target.value || undefined })
                    }
                    className={INPUT_CLS}
                  >
                    <option value="">None</option>
                    {BACKGROUND_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label} ({preset.category})
                      </option>
                    ))}
                  </select>
                </FormField>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      World Info (optional) — keywords that surface lore on "✨ Enrich"
                    </div>
                    <button
                      onClick={addWorldInfoRow}
                      className="rounded px-2 py-0.5 text-xs text-persona-600 hover:bg-persona-50 dark:hover:bg-gray-800"
                    >
                      + Add entry
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editing.worldInfo ?? []).map((entry) => (
                      <div
                        key={entry.id}
                        className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/40 p-2.5 dark:border-gray-700 dark:bg-gray-800/40"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            value={worldInfoKeysDraft[entry.id] ?? ""}
                            onChange={(e) =>
                              setWorldInfoKeysDraft((prev) => ({
                                ...prev,
                                [entry.id]: e.target.value
                              }))
                            }
                            placeholder="keys, comma, separated"
                            className={"flex-1 " + INPUT_CLS_SMALL}
                          />
                          <button
                            onClick={() => removeWorldInfoRow(entry.id)}
                            className="rounded px-1.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-gray-800"
                            aria-label="Remove entry"
                          >
                            ✕
                          </button>
                        </div>
                        <textarea
                          value={entry.content}
                          onChange={(e) => updateWorldInfoContent(entry.id, e.target.value)}
                          rows={2}
                          placeholder="Lore to inject when a key matches the draft message"
                          className={INPUT_CLS_SMALL}
                        />
                      </div>
                    ))}
                    {(editing.worldInfo ?? []).length === 0 && (
                      <p className="text-xs text-gray-400">No entries yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={save}
                    className="rounded-lg bg-persona-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-persona-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
                Select a persona to edit, or click "+ New persona".
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function FormField({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">{label}</div>
      {children}
    </label>
  )
}
