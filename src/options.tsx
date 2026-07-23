import { useEffect, useState } from "react"

import "./style.css"

import { BACKGROUND_PRESETS } from "~lib/backgrounds"
import {
  CharacterCardImportError,
  coercePosition,
  parseCharacterCardFile
} from "~lib/character-card-import"
import { useI18n, type MessageKey } from "~lib/i18n"
import { INPUT_BASE_CLS } from "~lib/styles"
import { ensureSeeds } from "~seed"
import {
  deletePersona,
  getPersona,
  listPersonas,
  makePersonaId,
  makeWorldInfoId,
  upsertPersona
} from "~storage"
import type {
  LanguagePref,
  PersonaCard,
  WorldInfoEntry,
  WorldInfoPosition,
  WorldInfoRole
} from "~types"

const INPUT_CLS = `w-full bg-gray-50/60 px-3 py-2 text-sm ${INPUT_BASE_CLS}`
const INPUT_CLS_SMALL = `w-full bg-gray-50/60 px-2.5 py-1.5 text-xs ${INPUT_BASE_CLS}`

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
  const { t, tp, locale, pref, setPref } = useI18n()
  const [personas, setPersonas] = useState<PersonaCard[]>([])
  const [editing, setEditing] = useState<PersonaCard | null>(null)
  const [worldInfoKeysDraft, setWorldInfoKeysDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    // Installs missing seeds and refreshes non-customized ones to the
    // current locale — same call PersonaPanel makes, so opening the options
    // page first (before ever opening the DeepSeek overlay) still seeds the
    // library, and flipping the language select below re-expands in place.
    void ensureSeeds(locale).then(setPersonas)
  }, [locale])

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
      alert(t("alert.nameRequired"))
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
    if (!confirm(t("confirm.delete"))) return
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
                .map((e) => {
                  const wi: WorldInfoEntry = {
                    id: makeWorldInfoId(),
                    keys: Array.isArray(e.keys) ? e.keys.filter((k) => typeof k === "string") : [],
                    content: e.content,
                    enabled: e.enabled !== false
                  }
                  // Pass through optional flags/decorators so an export→import
                  // round-trip keeps them — but normalize the same way the
                  // character-card path does, so a hand-edited / corrupt backup
                  // can't smuggle in an invalid position or a negative depth.
                  if (e.alwaysActive) wi.alwaysActive = true
                  if (e.source) wi.source = e.source
                  const position = coercePosition(e.position)
                  if (position) wi.position = position
                  if (typeof e.depth === "number" && e.depth >= 0) wi.depth = Math.floor(e.depth)
                  if (e.role === "system" || e.role === "user" || e.role === "assistant")
                    wi.role = e.role
                  if (typeof e.order === "number") wi.order = e.order
                  return wi
                })
            : undefined,
          backgroundId: typeof card.backgroundId === "string" ? card.backgroundId : undefined,
          tags: Array.isArray(card.tags) ? card.tags.filter((tag) => typeof tag === "string") : [],
          isCustomized: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
        imported++
      }
      await refresh()
      alert(imported > 0 ? tp("alert.imported", imported) : t("alert.importNone"))
    } catch {
      alert(t("alert.importParseError"))
    }
  }

  async function importCharacterCard(file: File) {
    try {
      const card = await parseCharacterCardFile(file)
      await upsertPersona(card)
      await refresh()
      alert(t("cardImport.success", { name: card.name }))
    } catch (err) {
      const reason = err instanceof CharacterCardImportError ? err.reason : "unknown"
      alert(t(`cardImport.error.${reason}` as MessageKey))
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

  function updateWorldInfoField(id: string, patch: Partial<WorldInfoEntry>) {
    if (!editing) return
    setEditing({
      ...editing,
      worldInfo: (editing.worldInfo ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e))
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
              <span className="h-3 w-3 rounded-full bg-gradient-to-br from-persona-400 to-persona-600" />
              Persona
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("options.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="language-select">
              {t("options.language")}
            </label>
            <select
              id="language-select"
              value={pref}
              onChange={(e) => void setPref(e.target.value as LanguagePref)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              title={t("options.language")}
            >
              <option value="auto">{t("lang.auto")}</option>
              <option value="en">{t("lang.en")}</option>
              <option value="zh">{t("lang.zh")}</option>
            </select>
            <button
              onClick={exportAll}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t("options.export")}
            </button>
            <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
              {t("options.import")}
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
            <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
              {t("cardImport.button")}
              <input
                type="file"
                accept=".png,.json,image/png,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void importCharacterCard(file)
                  e.target.value = ""
                }}
              />
            </label>
            <a
              href="https://chub.ai/"
              target="_blank"
              rel="noreferrer"
              title={t("cardImport.findMoreHint")}
              className="rounded-lg px-3 py-2 text-xs font-medium text-persona-600 underline decoration-persona-300 decoration-dotted underline-offset-4 transition hover:text-persona-700 dark:text-persona-400 dark:decoration-persona-700 dark:hover:text-persona-300"
            >
              {t("cardImport.findMore")}
            </a>
            <button
              onClick={startCreate}
              className="rounded-lg bg-persona-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-persona-700"
            >
              {t("options.new")}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("options.listHeading", { count: personas.length })}
            </h2>
            <ul className="space-y-2">
              {personas.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:shadow dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start gap-3">
                    {p.avatarImageDataUrl ? (
                      <img
                        src={p.avatarImageDataUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{p.avatarEmoji}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{p.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                        {p.personaPrompt}
                      </div>
                      {(p.worldInfo?.length ?? 0) > 0 && (
                        <div className="mt-1 text-[10px] text-persona-600">
                          {tp("options.worldInfoCount", p.worldInfo!.length)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => startEdit(p.id)}
                        className="rounded px-2 py-1 text-xs text-persona-600 hover:bg-persona-50 dark:hover:bg-gray-800"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-gray-800"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {personas.length === 0 && (
                <li className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  {t("options.listEmpty")}
                </li>
              )}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {editing ? t("options.editorHeading") : t("options.previewHeading")}
            </h2>
            {editing ? (
              <div className="space-y-3.5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <FormField label={t("field.name")}>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label={t("field.avatar")}>
                  <div className="flex items-center gap-2">
                    {editing.avatarImageDataUrl && (
                      <img
                        src={editing.avatarImageDataUrl}
                        alt=""
                        title={t("cardImport.portraitHint")}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <input
                      value={editing.avatarEmoji}
                      onChange={(e) =>
                        setEditing({ ...editing, avatarEmoji: e.target.value })
                      }
                      className={`w-24 bg-gray-50/60 px-3 py-2 text-lg ${INPUT_BASE_CLS}`}
                    />
                  </div>
                </FormField>
                {(editing.creator || editing.creatorNotes) && (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                    {editing.creator && (
                      <span className="block font-medium text-gray-600 dark:text-gray-300">
                        {t("cardImport.creatorLabel", { name: editing.creator })}
                      </span>
                    )}
                    {editing.creatorNotes && <span className="block">{editing.creatorNotes}</span>}
                  </p>
                )}
                <FormField label={t("field.personaPrompt")}>
                  <textarea
                    value={editing.personaPrompt}
                    onChange={(e) =>
                      setEditing({ ...editing, personaPrompt: e.target.value })
                    }
                    rows={6}
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label={t("field.scenario")}>
                  <textarea
                    value={editing.scenario ?? ""}
                    onChange={(e) => setEditing({ ...editing, scenario: e.target.value })}
                    rows={2}
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label={t("field.exampleDialogue")}>
                  <textarea
                    value={editing.exampleDialogue ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, exampleDialogue: e.target.value })
                    }
                    rows={3}
                    placeholder={t("placeholder.exampleDialogue")}
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label={t("field.greeting")}>
                  <input
                    value={editing.greeting ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, greeting: e.target.value })
                    }
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label={t("field.driftReminder")}>
                  <input
                    value={editing.driftReminder ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, driftReminder: e.target.value })
                    }
                    className={INPUT_CLS}
                  />
                </FormField>
                <FormField label={t("field.background")}>
                  <select
                    value={editing.backgroundId ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, backgroundId: e.target.value || undefined })
                    }
                    className={INPUT_CLS}
                  >
                    <option value="">{t("select.none")}</option>
                    {BACKGROUND_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {t("options.backgroundOption", {
                          label: t(`bg.${preset.id}` as MessageKey),
                          category: t(`bgCategory.${preset.category}` as MessageKey)
                        })}
                      </option>
                    ))}
                  </select>
                </FormField>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {t("options.worldInfoLabel")}
                    </div>
                    <button
                      onClick={addWorldInfoRow}
                      className="rounded px-2 py-0.5 text-xs text-persona-600 hover:bg-persona-50 dark:hover:bg-gray-800"
                    >
                      {t("options.addEntry")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editing.worldInfo ?? []).map((entry) => (
                      <div
                        key={entry.id}
                        className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/40 p-2.5 dark:border-gray-700 dark:bg-gray-800/40"
                      >
                        <div className="flex items-center gap-2">
                          {entry.source === "memory" ? (
                            <span
                              title={t("memory.badgeHint")}
                              className="flex-1 rounded-lg bg-persona-50 px-2.5 py-1.5 text-xs font-medium text-persona-600 dark:bg-persona-900/30 dark:text-persona-300"
                            >
                              {t("memory.badge")}
                            </span>
                          ) : (
                            <input
                              value={worldInfoKeysDraft[entry.id] ?? ""}
                              onChange={(e) =>
                                setWorldInfoKeysDraft((prev) => ({
                                  ...prev,
                                  [entry.id]: e.target.value
                                }))
                              }
                              placeholder={t("placeholder.keys")}
                              className={"flex-1 " + INPUT_CLS_SMALL}
                            />
                          )}
                          <button
                            onClick={() => removeWorldInfoRow(entry.id)}
                            className="rounded px-1.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-gray-800"
                            aria-label={t("common.delete")}
                          >
                            ✕
                          </button>
                        </div>
                        <textarea
                          value={entry.content}
                          onChange={(e) => updateWorldInfoContent(entry.id, e.target.value)}
                          rows={2}
                          placeholder={t("placeholder.loreContent")}
                          className={INPUT_CLS_SMALL}
                        />
                        {entry.source !== "memory" && (
                          <details className="mt-0.5">
                            <summary className="cursor-pointer select-none text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              {t("worldbook.advanced")}
                            </summary>
                            <div className="mt-2 space-y-2">
                              <label
                                className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400"
                                title={t("worldbook.constantHint")}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!entry.alwaysActive}
                                  onChange={(e) =>
                                    updateWorldInfoField(entry.id, {
                                      alwaysActive: e.target.checked || undefined
                                    })
                                  }
                                />
                                {t("worldbook.constant")}
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {entry.alwaysActive && (
                                  <label
                                    className="block text-[10px] text-gray-500 dark:text-gray-400"
                                    title={t("worldbook.positionHint")}
                                  >
                                    <span className="mb-0.5 block">{t("worldbook.position")}</span>
                                    <select
                                      value={entry.position ?? ""}
                                      onChange={(e) =>
                                        updateWorldInfoField(entry.id, {
                                          position: (e.target.value || undefined) as
                                            | WorldInfoPosition
                                            | undefined
                                        })
                                      }
                                      className={INPUT_CLS_SMALL}
                                    >
                                      <option value="">{t("worldbook.position.none")}</option>
                                      <option value="before_desc">
                                        {t("worldbook.position.before_desc")}
                                      </option>
                                      <option value="after_desc">
                                        {t("worldbook.position.after_desc")}
                                      </option>
                                      <option value="personality">
                                        {t("worldbook.position.personality")}
                                      </option>
                                      <option value="scenario">
                                        {t("worldbook.position.scenario")}
                                      </option>
                                      <option value="at_depth">
                                        {t("worldbook.position.at_depth")}
                                      </option>
                                    </select>
                                  </label>
                                )}
                                <label className="block text-[10px] text-gray-500 dark:text-gray-400">
                                  <span className="mb-0.5 block">{t("worldbook.role")}</span>
                                  <select
                                    value={entry.role ?? ""}
                                    onChange={(e) =>
                                      updateWorldInfoField(entry.id, {
                                        role: (e.target.value || undefined) as
                                          | WorldInfoRole
                                          | undefined
                                      })
                                    }
                                    className={INPUT_CLS_SMALL}
                                  >
                                    <option value="">{t("worldbook.role.default")}</option>
                                    <option value="system">{t("worldbook.role.system")}</option>
                                    <option value="user">{t("worldbook.role.user")}</option>
                                    <option value="assistant">
                                      {t("worldbook.role.assistant")}
                                    </option>
                                  </select>
                                </label>
                                <label
                                  className="block text-[10px] text-gray-500 dark:text-gray-400"
                                  title={t("worldbook.depthHint")}
                                >
                                  <span className="mb-0.5 block">{t("worldbook.depth")}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={entry.depth ?? ""}
                                    onChange={(e) =>
                                      updateWorldInfoField(entry.id, {
                                        depth:
                                          e.target.value === ""
                                            ? undefined
                                            : Math.max(0, Math.floor(Number(e.target.value) || 0))
                                      })
                                    }
                                    className={INPUT_CLS_SMALL}
                                  />
                                </label>
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                    {(editing.worldInfo ?? []).length === 0 && (
                      <p className="text-xs text-gray-400">{t("options.noEntries")}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={save}
                    className="rounded-lg bg-persona-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-persona-700"
                  >
                    {t("common.save")}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
                {t("options.previewEmpty")}
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
