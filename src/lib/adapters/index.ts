import { deepseekAdapter } from "./deepseek"
import type { PlatformAdapter } from "./types"

export type { InjectMethod, InjectResult, PlatformAdapter } from "./types"

/**
 * One entry per supported host. Claude.ai lands here in the next pass, once
 * its chat input/container selectors are confirmed against a live session.
 */
const REGISTRY: Record<string, PlatformAdapter> = {
  "chat.deepseek.com": deepseekAdapter
}

export function getActiveAdapter(
  hostname: string = window.location.hostname
): PlatformAdapter | null {
  return REGISTRY[hostname] ?? null
}
