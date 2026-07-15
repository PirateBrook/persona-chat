import { useEffect, useState } from "react"

import "./style.css"

import {
  deletePersona,
  getPersona,
  listPersonas,
  makePersonaId,
  upsertPersona
} from "~src/storage"
import type { PersonaCard } from "~src/types"

/**
 * Options page is the primary create/edit surface. Content-script panel is
 * consumption-only (apply, browse); mutation flows through here. Keeps the
 * overlay lightweight and lets us reuse this page as a standalone editor
 * link ("Edit in tab") from the overlay later.
 */
export default function Options() {
  const [personas, setPersonas] = useState<PersonaCard[]>([])
  const [editing, setEditing] = useState<PersonaCard | null>(null)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    setPersonas(await listPersonas())
  }

  function startCreate() {
    setEditing({
      id: makePersonaId(),
      name: "",
      avatarEmoji: "🎭",
      personaPrompt: "",
      greeting: "",
      worldLore: "",
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }

  async function startEdit(id: string) {
    const p = await getPersona(id)
    if (p) setEditing(p)
  }

  async function save() {
    if (!editing) return
    if (!editing.name.trim() || !editing.personaPrompt.trim()) {
      alert("Name and Persona prompt are required.")
      return
    }
    await upsertPersona(editing)
    setEditing(null)
    await refresh()
  }

  async function remove(id: string) {
    if (!confirm("Delete this persona?")) return
    await deletePersona(id)
    if (editing?.id === id) setEditing(null)
    await refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Persona.chat</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your AI personas · v0 (local storage)
            </p>
          </div>
          <button
            onClick={startCreate}
            className="rounded-md bg-persona-600 px-4 py-2 text-sm font-medium text-white hover:bg-persona-700"
          >
            + New persona
          </button>
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
                  className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{p.avatarEmoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{p.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                        {p.personaPrompt}
                      </div>
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
                <li className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
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
              <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <FormField label="Name">
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </FormField>
                <FormField label="Avatar emoji">
                  <input
                    value={editing.avatarEmoji}
                    onChange={(e) =>
                      setEditing({ ...editing, avatarEmoji: e.target.value })
                    }
                    className="w-24 rounded border border-gray-300 bg-white px-2 py-1.5 text-lg dark:border-gray-700 dark:bg-gray-800"
                  />
                </FormField>
                <FormField label="Persona prompt (system prompt)">
                  <textarea
                    value={editing.personaPrompt}
                    onChange={(e) =>
                      setEditing({ ...editing, personaPrompt: e.target.value })
                    }
                    rows={6}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </FormField>
                <FormField label="Greeting (optional)">
                  <input
                    value={editing.greeting ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, greeting: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </FormField>
                <FormField label="World lore (optional)">
                  <textarea
                    value={editing.worldLore ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, worldLore: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </FormField>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={save}
                    className="rounded-md bg-persona-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-persona-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-md border border-gray-300 px-4 py-1.5 text-sm dark:border-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
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
