type Listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void

const listeners = new Set<Listener>()
let installed = false

function ensureInstalled(): void {
  if (installed) return
  installed = true
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      for (const listener of Array.from(listeners)) {
        try {
          listener(changes, areaName)
        } catch (err) {
          console.error("[persona.chat] storage listener threw", err)
        }
      }
    })
  } catch {
    // Extension context unavailable at install time; subscribers just won't
    // receive live updates in this realm (matches the rest of the app's
    // soft-fail posture).
  }
}

/**
 * One real chrome.storage.onChanged listener per JS realm, fanned out to any
 * number of subscribers. Several components in the same content-script page
 * (useI18n, the overlay's own appState/personas watcher, ...) each want to
 * react to storage changes — without this, every one of them installs its
 * own chrome.storage.onChanged.addListener, so a single write fires N
 * separate extension-API listener invocations instead of one dispatch to N
 * in-memory callbacks.
 */
export function subscribeStorageChanged(listener: Listener): () => void {
  ensureInstalled()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
