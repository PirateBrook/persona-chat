/**
 * Deployed 2026-08-09 (`wrangler pages deploy`, project
 * "persona-chat-feedback", account punkscosmos@gmail.com). Swap for
 * https://feedback.punkscosmos.com if/when a custom domain is attached to
 * the Pages project in the Cloudflare dashboard (no CLI command for Pages
 * custom domains — that step is dashboard-only) — this is the only line
 * that needs to change; both the uninstall redirect and the in-app link
 * read from here.
 */
export const FEEDBACK_BASE_URL = "https://persona-chat-feedback.pages.dev"

export type FeedbackSource = "uninstall" | "inapp"

export function feedbackUrl(source: FeedbackSource): string {
  return `${FEEDBACK_BASE_URL}/?source=${source}`
}
