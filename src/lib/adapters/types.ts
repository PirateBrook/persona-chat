export type InjectMethod = "dom-injection" | "clipboard-fallback"

export interface InjectResult {
  ok: boolean
  method: InjectMethod
  error?: string
}

/**
 * One implementation per official web chat (DeepSeek, Claude.ai, ...). Every
 * platform ships a different DOM/framework underneath, but the extension only
 * ever needs these three operations against it.
 */
export interface PlatformAdapter {
  id: string
  findChatInput(): HTMLElement | null
  readDraftText(): string
  injectText(text: string): Promise<InjectResult>
}
