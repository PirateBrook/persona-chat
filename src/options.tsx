import { useEffect, useMemo, useRef, useState } from "react"

import "./style.css"

import appIcon from "../assets/icon.png"
import { BACKGROUND_PRESETS } from "~lib/backgrounds"
import {
  CharacterCardImportError,
  coercePosition,
  parseCharacterCardFile
} from "~lib/character-card-import"
import { useI18n, type MessageKey } from "~lib/i18n"
import { translateTag } from "~lib/i18n/tags"
import { resizeImageFile } from "~lib/image-resize"
import { feedbackUrl } from "~lib/feedback"
import { STORE_REVIEWS_URL } from "~lib/store-listing"
import { estimateMemoryUsage, MEMORY_CHAR_BUDGET } from "~lib/memory"
import { collectPersonaTagCounts, filterPersonas } from "~lib/persona-filter"
import { subscribeStorageChanged } from "~lib/storage-events"
import { INPUT_BASE_CLS } from "~lib/styles"
import { ensureSeeds } from "~seed"
import {
  deletePersona,
  getAppState,
  getPersona,
  listPersonas,
  makePersonaId,
  makeWorldInfoId,
  setAppState,
  upsertPersona
} from "~storage"
import type {
  AppState,
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
  const [appState, setAppStateLocal] = useState<AppState | null>(null)
  const [query, setQuery] = useState("")
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [userNameDraft, setUserNameDraft] = useState<string | null>(null)
  const userNameSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 100+ built-in personas make a flat, unfiltered list unscannable — mirrors
  // the search/tag-chip filtering already proven out in PersonaList.tsx (the
  // content-script panel), applied here to the editor's own list column.
  const allTags = useMemo(() => collectPersonaTagCounts(personas), [personas])

  const visiblePersonas = useMemo(
    () => filterPersonas(personas, query, tagFilter),
    [personas, query, tagFilter]
  )

  // Saved-memory footprint of the persona being edited — surfaced as an
  // advisory usage line above the world-info list (memory entries are
  // alwaysActive, so they all re-inject every Enrich; unbounded growth slows
  // storage and dilutes context). Display + warning only; never auto-deleted.
  const memoryUsage = useMemo(
    () => (editing ? estimateMemoryUsage(editing) : { count: 0, chars: 0 }),
    [editing]
  )

  useEffect(() => {
    // Installs missing seeds and refreshes non-customized ones to the
    // current locale — same call PersonaPanel makes, so opening the options
    // page first (before ever opening the DeepSeek overlay) still seeds the
    // library, and flipping the language select below re-expands in place.
    void ensureSeeds(locale).then(setPersonas)
  }, [locale])

  useEffect(() => {
    void getAppState().then(setAppStateLocal)
    return subscribeStorageChanged((changes, area) => {
      if (area !== "local" || !changes.appState) return
      setAppStateLocal(changes.appState.newValue as AppState)
    })
  }, [])

  function handleUserNameChange(value: string) {
    // Local draft + debounce, unlike the other fields in this file (which
    // keep `editing` state and only persist on explicit Save): this is the
    // only field that persists on every keystroke, and overlapping
    // chrome.storage read-modify-write round-trips can resolve out of order,
    // letting a fast typist see the input revert to an earlier, shorter
    // value that then gets persisted. Debouncing to only the LAST value in a
    // burst avoids that race.
    setUserNameDraft(value)
    if (userNameSaveTimer.current) clearTimeout(userNameSaveTimer.current)
    userNameSaveTimer.current = setTimeout(() => {
      void setAppState({ userName: value }).then((next) => {
        setAppStateLocal(next)
        setUserNameDraft(null)
      })
    }, 400)
  }

  function dismissRatePrompt() {
    void setAppState({ hasDismissedRatePrompt: true }).then(setAppStateLocal)
  }

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

  async function handleBackgroundImageUpload(file: File) {
    let dataUrl: string
    try {
      dataUrl = await resizeImageFile(file)
    } catch {
      alert(t("bg.custom.uploadFailed"))
      return
    }
    setEditing((prev) => (prev ? { ...prev, backgroundImageDataUrl: dataUrl } : prev))
  }

  async function remove(id: string) {
    if (!confirm(t("confirm.delete"))) return
    await deletePersona(id)
    if (editing?.id === id) setEditing(null)
    await refresh()
  }

  async function duplicatePersona(p: PersonaCard) {
    const now = Date.now()
    await upsertPersona({
      ...p,
      id: makePersonaId(),
      name: t("options.copyName", { name: p.name }),
      // A fresh copy the user owns — not pinned, never used, editable.
      pinned: false,
      lastUsedAt: undefined,
      isCustomized: true,
      createdAt: now,
      updatedAt: now
    })
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
          // Carry embedded images through a backup round-trip (both were
          // previously dropped, silently losing portraits/backgrounds).
          avatarImageDataUrl:
            typeof card.avatarImageDataUrl === "string" ? card.avatarImageDataUrl : undefined,
          backgroundImageDataUrl:
            typeof card.backgroundImageDataUrl === "string"
              ? card.backgroundImageDataUrl
              : undefined,
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
    <div className="flex h-screen min-h-[1200px] flex-col bg-gray-50 font-sans text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:min-h-[820px]">
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-6 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
              <img src={appIcon} alt="" className="h-7 w-7 rounded-full" />
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

        <details
          open
          className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t("help.heading")}
          </summary>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            <p>{t("help.intro")}</p>
            <ul className="space-y-1.5">
              <li>{t("help.enrich")}</li>
              <li>{t("help.guard")}</li>
              <li>{t("help.memory")}</li>
            </ul>
            <p className="text-gray-500 dark:text-gray-400">{t("help.flow")}</p>
            <a
              href={feedbackUrl("inapp")}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-persona-600 underline decoration-persona-300 decoration-dotted underline-offset-4 transition hover:text-persona-700 dark:text-persona-400 dark:decoration-persona-700 dark:hover:text-persona-300"
            >
              {t("help.feedback")}
            </a>
          </div>
        </details>

        {appState?.activePersonaId && !appState.hasDismissedRatePrompt && (
          <section className="mb-6 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <span className="text-gray-600 dark:text-gray-300">{t("rate.prompt")}</span>
            <a
              href={STORE_REVIEWS_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-persona-600 underline decoration-persona-300 decoration-dotted underline-offset-4 transition hover:text-persona-700 dark:text-persona-400 dark:decoration-persona-700 dark:hover:text-persona-300"
            >
              {t("rate.cta")}
            </a>
            <button
              onClick={dismissRatePrompt}
              className="ml-auto rounded-lg px-2 py-1 font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              {t("rate.dismiss")}
            </button>
          </section>
        )}

        <section className="mb-6 inline-flex w-fit shrink-0 flex-col items-start gap-1.5 self-start rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2.5">
            <label className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="user-name-input">
              {t("options.userName")}
            </label>
            <input
              id="user-name-input"
              value={userNameDraft ?? appState?.userName ?? ""}
              onChange={(e) => handleUserNameChange(e.target.value)}
              placeholder={t("options.userNamePlaceholder")}
              className={`w-56 ${INPUT_CLS_SMALL}`}
            />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{t("options.userNameHint")}</p>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 md:grid-cols-2">
          <section className="flex min-h-0 flex-col">
            <h2 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("options.listHeading", { count: visiblePersonas.length })}
            </h2>
            <div className="mb-2 shrink-0 space-y-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("list.searchPlaceholder")}
                className={INPUT_CLS_SMALL}
              />
              {allTags.length > 0 && (
                // A single scrollable row, not flex-wrap: with 100+ personas
                // (and any imported cards' own tag vocabulary) the tag set
                // easily reaches 20+ unique values — wrapping would eat most
                // of this column's fixed height before the actual list gets
                // any room to breathe (confirmed via a real-machine
                // screenshot: 4 wrapped rows left only ~4 cards' worth of
                // scroll space). A fixed single line keeps the tag filter's
                // footprint constant regardless of how many tags exist.
                <div className="scrollbar-slim flex gap-1 overflow-x-auto pb-1">
                  {allTags.map((tag) => {
                    const selected = tag === tagFilter
                    return (
                      <button
                        key={tag}
                        onClick={() => setTagFilter(selected ? null : tag)}
                        className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                          selected
                            ? "bg-persona-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        {translateTag(locale, tag) ?? tag}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <ul className="scrollbar-slim min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {visiblePersonas.map((p) => {
                const isActive = p.id === appState?.activePersonaId
                return (
                  <li key={p.id}>
                    <div
                      className={`group flex items-center rounded-xl border transition ${
                        isActive
                          ? "border-persona-200 bg-persona-50/60 dark:border-persona-900/60 dark:bg-persona-950/30"
                          : "border-gray-200 bg-white hover:shadow dark:border-gray-800 dark:bg-gray-900"
                      }`}
                    >
                      <button
                        onClick={() => startEdit(p.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                      >
                        {p.avatarImageDataUrl ? (
                          <img
                            src={p.avatarImageDataUrl}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">{p.avatarEmoji}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{p.name}</span>
                            {(p.worldInfo?.length ?? 0) > 0 && (
                              <span
                                className="text-[11px] opacity-60"
                                title={tp("list.worldInfoTitle", p.worldInfo!.length)}
                              >
                                📖
                              </span>
                            )}
                            {isActive && (
                              <span className="shrink-0 rounded-full bg-persona-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                {t("common.active")}
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {p.personaPrompt}
                          </div>
                        </div>
                        <span className="ml-auto hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-persona-600 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 dark:text-persona-300 sm:block">
                          {t("common.edit")}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 pr-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          onClick={() => duplicatePersona(p)}
                          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          {t("common.duplicate")}
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
                )
              })}
              {visiblePersonas.length === 0 && (
                <li className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  {personas.length === 0
                    ? t("options.listEmpty")
                    : t("list.noMatch", { query: query || tagFilter || "" })}
                </li>
              )}
            </ul>
          </section>

          <section className="flex min-h-0 flex-col">
            <h2 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {editing ? t("options.editorHeading") : t("options.previewHeading")}
            </h2>
            <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto pr-1">
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
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-[12px] leading-relaxed text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
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
                <FormField label={t("field.backgroundImage")}>
                  <div className="flex items-center gap-2">
                    {editing.backgroundImageDataUrl && (
                      <img
                        src={editing.backgroundImageDataUrl}
                        alt=""
                        className="h-9 w-14 shrink-0 rounded object-cover"
                      />
                    )}
                    <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
                      {editing.backgroundImageDataUrl
                        ? t("field.backgroundImage.replace")
                        : t("field.backgroundImage.upload")}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleBackgroundImageUpload(file)
                          e.target.value = ""
                        }}
                      />
                    </label>
                    {editing.backgroundImageDataUrl && (
                      <button
                        onClick={() => setEditing({ ...editing, backgroundImageDataUrl: undefined })}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-gray-800"
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </div>
                  {editing.backgroundImageDataUrl && (
                    <p className="mt-1 text-[11px] text-gray-400">
                      {t("field.backgroundImage.hint")}
                    </p>
                  )}
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
                  {memoryUsage.count > 0 && (
                    <div className="mb-1.5">
                      <span
                        className={
                          memoryUsage.chars > MEMORY_CHAR_BUDGET
                            ? "text-[11px] font-medium text-amber-600 dark:text-amber-400"
                            : "text-[11px] text-gray-400 dark:text-gray-500"
                        }
                      >
                        {t("memory.usage", memoryUsage)}
                      </span>
                      {memoryUsage.chars > MEMORY_CHAR_BUDGET && (
                        <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                          {t("memory.usageWarn")}
                        </p>
                      )}
                    </div>
                  )}
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
                            <summary className="cursor-pointer select-none text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              {t("worldbook.advanced")}
                            </summary>
                            <div className="mt-2 space-y-2">
                              <label
                                className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-gray-400"
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
                                    className="block text-[11px] text-gray-500 dark:text-gray-400"
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
                                <label className="block text-[11px] text-gray-500 dark:text-gray-400">
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
                                  className="block text-[11px] text-gray-500 dark:text-gray-400"
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
            </div>
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
