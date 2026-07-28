# Chrome Web Store Pre-Submission Review — persona-chat v0.2.0 (pending)

**Scan date**: 2026-07-28
**Scope**: Full rescan against the 0.1.0 baseline (0 CRITICAL/HIGH/MEDIUM), specifically checking whether the new `https://chatgpt.com/*` host permission (third-platform ChatGPT adapter) changes the verdict.

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 0     |
| MEDIUM   | 1     |
| PASS     | 14    |

**Verdict: LIKELY APPROVED** (after the one MEDIUM item below is fixed — trivial, already in progress).

## Checks

### 1. Remote code execution (Blue Argon) — CRITICAL — PASS
No `eval`, `new Function`, remote `<script src="http...">`, dynamic `import(http...)`, or fetch→eval patterns anywhere in `src/`.

### 2. Code obfuscation (Red Titanium) — CRITICAL — PASS (justified usage noted)
One `atob()` call in `src/lib/character-card-import.ts:85` — decodes the base64-encoded JSON payload embedded in a SillyTavern/chub.ai character-card PNG's `tEXt` chunk (the card format's own standard encoding, not code obfuscation). Already clarified in a prior submission round. No `String.fromCharCode` reconstruction of executable code (the one comment hit is just a doc comment explaining why that pattern was *avoided* for a different reason — call-stack safety on large blobs — not actual usage).

### 3. Excessive/unused permissions (Purple Potassium) — HIGH — PASS
- `permissions`: `storage`, `unlimitedStorage`, `tts` — unchanged from 0.1.0, all three still actively used (`chrome.storage.local` throughout, `unlimitedStorage` for uploaded background images, `chrome.tts` for the read-aloud feature).
- `host_permissions`: `https://chat.deepseek.com/*`, `https://claude.ai/*`, **`https://chatgpt.com/*`** (new this release) — three explicit hosts, no `<all_urls>`, no broad wildcard. The new host follows the exact same pattern as the other two (a content-script UI reading/writing the page's own chat-input DOM) — same single purpose, same minimization argument.
- Zero network-related permissions (`webRequest`, `tabs`, `cookies`, `history`, `bookmarks`, `downloads`, `identity`) — none requested, none needed.

### 4. Missing privacy policy (Purple Lithium) — HIGH — PASS
`PRIVACY.md` exists at repo root, hosted and linked per `docs/chrome-web-store-listing.md`. All user data (personas, world info, background images) stays in `chrome.storage.local` — confirmed zero `fetch`/`XMLHttpRequest`/`axios` calls anywhere in `src/` (the new ChatGPT adapter doesn't change this).

### 5. Missing metadata (Yellow Zinc) — HIGH — MEDIUM (see finding below)
Icons present at all required sizes (16/32/48/64/128, non-placeholder panda mascot). `name`/`version` fields fine. **`description` is stale** — see finding.

### 6. Single purpose (Red Magnesium) — HIGH — PASS
Three content scripts (`deepseek.tsx`/`claude.tsx`/`chatgpt.tsx`), all doing the exact same thing (persona/world-info/background injection UI) on three different official free LLM web-chat hosts. This is the textbook "same single purpose, multiple equivalent hosts" case, not a purpose violation — same reasoning that passed for the Claude.ai addition in 0.1.0.

### 7. Deceptive behavior (Red Nickel) — HIGH — PASS (contingent on fixing the finding below)
Functionality matches the description's *intent* (persona/roleplay layer for free AI web chat) — the only gap is the description text not yet naming the third platform, which is a staleness issue (#5/#9), not a deception issue, once fixed.

### 8. Insecure data transmission (Purple Copper) — HIGH — PASS
No `http://` URLs in source; zero network calls at all.

### 9. Keyword stuffing (Yellow Argon) — MEDIUM — PASS
`description` is a plain, non-repetitive sentence; no competitor names or buzzword stuffing.

### 10. Minimum functionality (Yellow Potassium) — MEDIUM — PASS
Substantial real functionality (100+ personas, world-info system, backgrounds, TTS, character-card import, three platform adapters) — not a link-wrapper or placeholder extension.

### 11. Undisclosed affiliate links (Grey Titanium) — MEDIUM — PASS
The one outbound link (chub.ai, "find more personas") is clearly labeled as a third-party community site in the UI copy, not an affiliate/monetized link.

### 12. Cryptocurrency mining (Grey Silicon) — CRITICAL — PASS
No matches for any mining-related patterns.

### 13. Copyright circumvention (Blue Zinc) — CRITICAL — PASS
No video/audio download or paywall-bypass patterns.

### 14. Notification spam (Yellow Nickel) — MEDIUM — PASS
No `chrome.notifications` usage at all.

### 15. Data collection without consent (Purple Nickel) — HIGH — PASS
No `chrome.history`, `chrome.webNavigation`, or `chrome.tabs.onUpdated`/URL-tracking usage anywhere in `src/`.

## Finding

**Manifest `description` is stale for a 3-platform release (MEDIUM, Yellow Zinc / borderline Red Nickel)**
- **File**: `package.json:5` → compiled into `build/chrome-mv3-prod/manifest.json`
- **Current text**: `"Give your AI a persona. One-click persona switching, world info, and scene backgrounds for DeepSeek and Claude."`
- **Root cause**: written when only DeepSeek + Claude.ai were supported; never updated when ChatGPT adapter landed.
- **Why it matters**: CWS reviewers (and users) read the manifest description as the ground truth for what the extension does — omitting a fully-shipped third platform is stale metadata at best, and could read as the description not matching actual functionality (Red Nickel territory) if a reviewer tests it on chatgpt.com and finds it working despite the description not mentioning that host.
- **Solution**: update to mention all three platforms. Also update the CWS store listing long-form copy (`docs/chrome-web-store-listing.md`) the same way — it currently only names "DeepSeek or Claude.ai" throughout the short/long descriptions and the host-permission justification section.
- **Status**: ✅ fixed — `package.json` description and `docs/chrome-web-store-listing.md` both now name all three platforms; rebuilt and confirmed in `build/chrome-mv3-prod/manifest.json`.

## Deeper security/compliance audit (extension-analyze)

Same scope, deeper pass focused on whether the new `src/lib/adapters/chatgpt.ts` / `src/contents/chatgpt.tsx` introduce any new attack surface.

| Check | Result |
|---|---|
| CSP | No explicit `content_security_policy` in manifest → MV3 default (`script-src 'self'; object-src 'self'`) applies, no `unsafe-inline`/`unsafe-eval` |
| XSS vectors (`innerHTML`/`outerHTML`/`document.write`/`insertAdjacentHTML`) | **Zero occurrences anywhere in `src/`** — all DOM writes go through the shared, already-audited `dom-inject.ts` primitives (native value setter / `execCommand`), never raw HTML injection |
| `eval`/`new Function`/string-based `setTimeout` | Zero occurrences |
| Hardcoded secrets/API keys | Zero real matches — the only grep hits are the English word "secret" inside roleplay persona flavor text (`seed.ts`, e.g. a speakeasy-informant persona's prompt), not credentials |
| Message-handler sender validation | N/A — this codebase has no `chrome.runtime.onMessage` messaging layer at all; cross-realm sync is entirely `chrome.storage.onChanged`-based (`storage-events.ts`), which has no sender-spoofing surface the way `runtime.onMessage` does |
| Remote code loading (`importScripts`, `chrome.scripting.executeScript`) | Zero occurrences |
| `web_accessible_resources` | Now three scoped match blocks (one per platform host), each exposing only the icon + one CSS file — no wildcard, no cross-host leakage |
| Dependency audit (`pnpm audit`) | Zero vulnerabilities reported |

**Verdict: no new attack surface from the ChatGPT adapter.** It's a thin selector list reusing the same shared, already-reviewed injection primitives — structurally identical to the Claude.ai adapter that passed the same audit in 0.1.0.
