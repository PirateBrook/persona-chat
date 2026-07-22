import { claudeAdapter } from "./claude"
import { deepseekAdapter } from "./deepseek"
import type { PlatformAdapter } from "./types"

export type { InjectMethod, InjectResult, PlatformAdapter } from "./types"

/**
 * One entry per supported host: hostname → adapter. Adding a new platform =
 * a new PlatformAdapter file registered here + a content script matching the
 * host + a manifest host permission.
 */
const REGISTRY: Record<string, PlatformAdapter> = {
  "chat.deepseek.com": deepseekAdapter,
  "claude.ai": claudeAdapter
}

export function getActiveAdapter(
  hostname: string = window.location.hostname
): PlatformAdapter | null {
  return REGISTRY[hostname] ?? null
}
