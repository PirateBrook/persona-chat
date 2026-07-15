/**
 * Extension context guard.
 *
 * "Extension context invalidated" happens when the user reloads / updates
 * the extension while a content script is still mounted on a tab. Every
 * chrome.* call from that stale content script throws. We can't
 * un-invalidate — the only fix is a page reload — but we can catch the
 * error once, mark the state, and let the UI show a "please refresh"
 * banner instead of silently failing.
 *
 * This module is the single source of truth for that state.
 */

type Listener = (invalidated: boolean) => void

class ExtensionContextGuard {
  private invalidated = false
  private listeners = new Set<Listener>()

  isInvalidated(): boolean {
    return this.invalidated
  }

  /**
   * Proactive check before an API call. chrome.runtime.id becomes
   * undefined the moment the context dies, without waiting for an API
   * call to throw. Cheap enough to run on every storage read.
   */
  probe(): boolean {
    try {
      const alive =
        typeof chrome !== "undefined" &&
        typeof chrome.runtime !== "undefined" &&
        !!chrome.runtime.id
      if (!alive && !this.invalidated) {
        this.markInvalidated()
      }
      return alive
    } catch {
      if (!this.invalidated) this.markInvalidated()
      return false
    }
  }

  markInvalidated(): void {
    if (this.invalidated) return
    this.invalidated = true
    console.warn(
      "[persona.chat] extension context invalidated — user needs to refresh this page"
    )
    for (const l of Array.from(this.listeners)) {
      try {
        l(true)
      } catch (err) {
        console.error("[persona.chat] context listener threw", err)
      }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    // Immediately notify current state so subscribers don't have to
    // seed their own initial value.
    listener(this.invalidated)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export const extensionContext = new ExtensionContextGuard()

export function isContextInvalidationError(err: unknown): boolean {
  if (!err) return false
  const msg = err instanceof Error ? err.message : String(err)
  // Chrome phrases it slightly differently across versions.
  return (
    msg.includes("Extension context invalidated") ||
    msg.includes("extension context invalidated") ||
    msg.includes("context invalidated")
  )
}

/**
 * Wrap a chrome.* API call. If the context is (or becomes) invalidated,
 * mark the guard, return the fallback, and let subscribers show a
 * "please refresh" banner. Other errors bubble as normal.
 */
export async function safeChromeCall<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (extensionContext.isInvalidated() || !extensionContext.probe()) {
    return fallback
  }
  try {
    return await fn()
  } catch (err) {
    if (isContextInvalidationError(err)) {
      extensionContext.markInvalidated()
      return fallback
    }
    throw err
  }
}
