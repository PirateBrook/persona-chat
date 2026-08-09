/**
 * Service worker entry. No cross-origin fetches, no license verification, no
 * scheduled jobs — setUninstallURL is a browser-initiated redirect on
 * uninstall, not an extension network call, so it doesn't touch that rule.
 * Add more here when we need badge counts, context-menu items, or extension
 * messaging.
 */
import { feedbackUrl } from "./lib/feedback"

chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.setUninstallURL(feedbackUrl("uninstall"))
})

