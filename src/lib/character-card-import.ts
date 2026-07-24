import { makePersonaId, makeWorldInfoId } from "../storage"
import type { PersonaCard, WorldInfoEntry, WorldInfoPosition, WorldInfoRole } from "../types"
import { resizeImageFile } from "./image-resize"

/**
 * Imports a single SillyTavern-style Character Card (V2/V3) into our
 * PersonaCard shape. Two input forms are supported, matching how these cards
 * are actually distributed in the wild:
 * - A PNG portrait with the card JSON embedded, base64-encoded, inside a
 *   `tEXt` chunk (keyword "chara" for V2, "ccv3" for V3 — we prefer ccv3 when
 *   both are present since it supersedes the V2 payload).
 * - A plain `.json` file holding the same card data directly (some cards are
 *   shared this way instead of/alongside the PNG).
 *
 * `parseCharacterCardFile` throws `CharacterCardImportError` on any failure
 * (unrecognized file, missing/undecodable embedded data, malformed JSON, no
 * `name` field) rather than returning a result union — callers should wrap
 * the call in try/catch and use `.reason` to pick a user-facing message.
 */
export type CharacterCardImportErrorReason =
  | "unsupported_file"
  | "no_embedded_data"
  | "invalid_json"
  | "missing_name"

export class CharacterCardImportError extends Error {
  reason: CharacterCardImportErrorReason

  constructor(reason: CharacterCardImportErrorReason, message: string) {
    super(message)
    this.name = "CharacterCardImportError"
    this.reason = reason
  }
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

function bytesToLatin1(bytes: Uint8Array): string {
  // Chunk keywords and base64 payloads are both pure ASCII, so latin1 is a
  // safe, allocation-cheap decode that avoids the call-stack blowup a
  // `String.fromCharCode(...bytes)` spread risks on a large world-info blob.
  return new TextDecoder("latin1").decode(bytes)
}

/**
 * Walks the raw PNG chunk stream (8-byte signature, then repeating
 * `[u32 length][4-byte type][data][u32 crc]`) and returns every `tEXt`
 * chunk's keyword -> decoded (still-base64) text. Throws if the file doesn't
 * even start with a valid PNG signature.
 */
function extractPngTextChunks(buf: ArrayBuffer): Map<string, string> {
  const bytes = new Uint8Array(buf)
  const view = new DataView(buf)

  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new CharacterCardImportError("unsupported_file", "Not a valid PNG file")
    }
  }

  const chunks = new Map<string, string>()
  let offset = 8
  while (offset + 8 <= buf.byteLength) {
    const length = view.getUint32(offset)
    const type = bytesToLatin1(bytes.subarray(offset + 4, offset + 8))
    const dataStart = offset + 8

    if (type === "tEXt") {
      const chunkData = bytes.subarray(dataStart, dataStart + length)
      const nullIdx = chunkData.indexOf(0)
      if (nullIdx !== -1) {
        const keyword = bytesToLatin1(chunkData.subarray(0, nullIdx))
        const text = bytesToLatin1(chunkData.subarray(nullIdx + 1))
        chunks.set(keyword, text)
      }
    }

    offset = dataStart + length + 4 // skip the trailing 4-byte CRC
    if (type === "IEND") break
  }
  return chunks
}

function decodeBase64Json(b64: string): unknown {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const json = new TextDecoder("utf-8").decode(bytes)
  return JSON.parse(json)
}

interface RawCharacterBookEntry {
  keys?: unknown
  key?: unknown
  content?: unknown
  enabled?: unknown
  constant?: unknown
  insertion_order?: unknown
  position?: unknown
}

interface RawCharacterData {
  name?: unknown
  description?: unknown
  personality?: unknown
  scenario?: unknown
  first_mes?: unknown
  mes_example?: unknown
  alternate_greetings?: unknown
  creator?: unknown
  creator_notes?: unknown
  tags?: unknown
  character_book?: { entries?: unknown }
}

/** V2/V3 wrap fields in a `data` object; some V1-style raw exports don't. */
function unwrapCardData(parsed: unknown): RawCharacterData {
  if (
    parsed &&
    typeof parsed === "object" &&
    "data" in parsed &&
    (parsed as { data?: unknown }).data &&
    typeof (parsed as { data?: unknown }).data === "object"
  ) {
    return (parsed as { data: RawCharacterData }).data
  }
  return (parsed ?? {}) as RawCharacterData
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback
}

/**
 * `mes_example` uses SillyTavern's `<START>`-delimited convention to hold
 * several alternative example blocks. We don't model multiple example sets
 * (`exampleDialogue` is a single field), so we drop the bare markers and
 * keep everything else as one block rather than only importing the first
 * segment — losing formatting is preferable to silently losing content.
 */
function simplifyExampleDialogue(raw: unknown): string | undefined {
  const text = stringOr(raw)
  if (!text) return undefined
  return text.replace(/<START>/g, "").trim() || undefined
}

const VALID_POSITIONS: readonly WorldInfoPosition[] = [
  "before_desc",
  "after_desc",
  "personality",
  "scenario",
  "at_depth"
]

/**
 * Normalizes a character-book `position` to our WorldInfoPosition. V3 uses the
 * string names directly; V2 uses a numeric enum (0=before_char, 1=after_char,
 * 4=at_depth — the author's-note slots 2/3 we don't model are dropped).
 */
export function coercePosition(raw: unknown): WorldInfoPosition | undefined {
  if (typeof raw === "string") {
    const s = raw.trim()
    if (VALID_POSITIONS.includes(s as WorldInfoPosition)) return s as WorldInfoPosition
    // V2 enum is sometimes serialized as a numeric string ("0"/"1"/"4").
    if (/^\d+$/.test(s)) return coercePosition(Number(s))
    return undefined
  }
  if (typeof raw === "number") {
    if (raw === 0) return "before_desc"
    if (raw === 1) return "after_desc"
    if (raw === 4) return "at_depth"
  }
  return undefined
}

/**
 * Character Card V3 lore entries may prefix `content` with `@@` decorator
 * lines (`@@depth 4`, `@@position after_desc`, `@@role system`). Pulls the
 * recognized decorators off the top and returns the cleaned content; every
 * `@@`-prefixed leading line is stripped (it's metadata, not prose) even if
 * unrecognized. Stops at the first non-decorator line, so a stray "@@" inside
 * body text is left untouched.
 */
function parseDecorators(content: string): {
  position?: WorldInfoPosition
  depth?: number
  role?: WorldInfoRole
  cleaned: string
} {
  const lines = content.split("\n")
  let i = 0
  let position: WorldInfoPosition | undefined
  let depth: number | undefined
  let role: WorldInfoRole | undefined

  for (; i < lines.length; i++) {
    const m = /^(@@@?)(\w+)[ \t]*(.*)$/.exec(lines[i].trim())
    if (!m) break
    // V3: `@@@` is a fallback — only applied when the `@@` primary didn't set
    // that field, so a fallback never overrides an explicit primary value.
    const isFallback = m[1] === "@@@"
    const name = m[2].toLowerCase()
    const arg = m[3].trim()
    if (name === "depth") {
      const n = parseInt(arg, 10)
      if (!Number.isNaN(n) && (!isFallback || depth === undefined)) depth = n
    } else if (name === "position") {
      const p = coercePosition(arg)
      if (p && (!isFallback || position === undefined)) position = p
    } else if (name === "role") {
      if (
        (arg === "system" || arg === "user" || arg === "assistant") &&
        (!isFallback || role === undefined)
      )
        role = arg
    } else {
      // Not a recognized decorator — stop and keep this line (and everything
      // after) as literal lore content, rather than swallowing an
      // author-written line that merely happens to start with "@@".
      break
    }
  }

  return { position, depth, role, cleaned: lines.slice(i).join("\n").trim() }
}

function mapWorldInfo(raw: RawCharacterData): WorldInfoEntry[] | undefined {
  const entries = raw.character_book?.entries
  if (!Array.isArray(entries)) return undefined

  const mapped: WorldInfoEntry[] = []
  for (const e of entries) {
    if (!e || typeof e !== "object") continue
    const entry = e as RawCharacterBookEntry
    const rawContent = stringOr(entry.content)
    if (!rawContent) continue

    const keys = Array.isArray(entry.keys)
      ? entry.keys.filter((k): k is string => typeof k === "string")
      : typeof entry.key === "string"
        ? [entry.key]
        : []

    // Pull recognized V3 `@@` decorators off the top; a `@@position`
    // decorator wins over the structured `position` field when both present.
    const decor = parseDecorators(rawContent)
    // An entry that was nothing but decorator lines has no real lore to inject
    // — skip it rather than storing the raw "@@…" text as visible content.
    const content = decor.cleaned
    if (!content) continue

    const position = decor.position ?? coercePosition(entry.position)

    const wi: WorldInfoEntry = {
      id: makeWorldInfoId(),
      keys,
      content,
      // Default to on per the mapping spec; only an explicit `enabled: false`
      // from the source card keeps an entry off.
      enabled: entry.enabled !== false,
      // V2/V3's `constant: true` means the same thing our own `alwaysActive`
      // does (bypass keyword matching, always inject) — without this an
      // imported always-on lorebook entry would silently become an ordinary
      // keyword-gated one.
      alwaysActive: entry.constant === true
    }
    // Attach V3 decorator fields only when present, to keep stored entries lean.
    if (position) wi.position = position
    if (typeof decor.depth === "number") wi.depth = decor.depth
    if (decor.role) wi.role = decor.role
    if (typeof entry.insertion_order === "number") wi.order = entry.insertion_order

    mapped.push(wi)
  }
  return mapped.length > 0 ? mapped : undefined
}

export async function parseCharacterCardFile(file: File): Promise<PersonaCard> {
  const lowerName = file.name.toLowerCase()
  const isPng = file.type === "image/png" || lowerName.endsWith(".png")
  const isJson = file.type === "application/json" || lowerName.endsWith(".json")

  let parsed: unknown
  let avatarImageDataUrl: string | undefined

  if (isPng) {
    const buf = await file.arrayBuffer()
    const textChunks = extractPngTextChunks(buf)
    const b64 = textChunks.get("ccv3") ?? textChunks.get("chara")
    if (!b64) {
      throw new CharacterCardImportError(
        "no_embedded_data",
        "No chara/ccv3 tEXt chunk found in PNG"
      )
    }
    try {
      parsed = decodeBase64Json(b64)
    } catch {
      throw new CharacterCardImportError("invalid_json", "Embedded card data isn't valid JSON")
    }
    // The uploaded PNG *is* the character portrait — reuse the same
    // downscale-to-JPEG path as background uploads instead of re-deriving
    // pixels from the decoded JSON. Best-effort: a decode failure here just
    // means no portrait, not a failed import.
    try {
      avatarImageDataUrl = await resizeImageFile(file)
    } catch {
      avatarImageDataUrl = undefined
    }
  } else if (isJson) {
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      throw new CharacterCardImportError("invalid_json", "File isn't valid JSON")
    }
  } else {
    throw new CharacterCardImportError(
      "unsupported_file",
      "Only .png and .json character cards are supported"
    )
  }

  const raw = unwrapCardData(parsed)
  const name = stringOr(raw.name)
  if (!name) {
    throw new CharacterCardImportError("missing_name", "Card has no name field")
  }

  // Real-world V2/V3 cards put the actual character sheet in `description`;
  // `personality` is a mostly-legacy field many cards leave blank. If both
  // are empty we fall back to the name so `personaPrompt` (required, drives
  // every persona's behavior) is never blank.
  const personaPrompt = stringOr(raw.description) || stringOr(raw.personality) || name
  const now = Date.now()

  return {
    id: makePersonaId(),
    name,
    avatarEmoji: "🎭",
    avatarImageDataUrl,
    personaPrompt,
    scenario: stringOr(raw.scenario) || undefined,
    exampleDialogue: simplifyExampleDialogue(raw.mes_example),
    greeting: stringOr(raw.first_mes) || undefined,
    alternateGreetings: Array.isArray(raw.alternate_greetings)
      ? raw.alternate_greetings.filter(
          (g): g is string => typeof g === "string" && g.trim().length > 0
        )
      : undefined,
    worldInfo: mapWorldInfo(raw),
    creator: stringOr(raw.creator) || undefined,
    creatorNotes: stringOr(raw.creator_notes) || undefined,
    isCustomized: true,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : [],
    createdAt: now,
    updatedAt: now
  }
}
