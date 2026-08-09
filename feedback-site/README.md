# Persona.chat feedback site

A tiny, database-free feedback form deployed to Cloudflare Pages. It backs
two things in the extension (`src/lib/feedback.ts`):

- **Uninstall survey** — `chrome.runtime.setUninstallURL()` opens this in a
  new tab when someone uninstalls. This is a browser-initiated redirect, not
  a network call made by the extension — it doesn't touch the extension's
  zero-network-requests/zero-new-permissions posture at all.
- **In-app feedback link** — a plain `target="_blank"` link in the options
  page (same pattern as the existing chub.ai link), for anyone who wants to
  say something without uninstalling.

Submissions are relayed as a single message to a Discord or Slack webhook —
**no database, nothing stored at rest.** If volume ever justifies it, add
storage (Cloudflare D1/KV) then, not preemptively.

This directory is independent of the extension's build (Plasmo never sees
it) — it's deployed separately to Cloudflare, on its own.

## One-time setup

1. **Get a webhook URL** (pick one):
   - Discord: Server Settings → Integrations → Webhooks → New Webhook → Copy
     Webhook URL.
   - Slack: create an [Incoming Webhook](https://api.slack.com/messaging/webhooks)
     for a channel, copy the URL.
2. **Log in to Cloudflare** (opens a browser window):
   ```
   cd feedback-site
   npx wrangler login
   ```
3. **Deploy:**
   ```
   npx wrangler pages deploy . --project-name=persona-chat-feedback
   ```
   Wrangler prints the live URL, something like
   `https://persona-chat-feedback.pages.dev`.
4. **Set the webhook secret** (never commit this — it's not in any file in
   this repo):
   ```
   npx wrangler pages secret put FEEDBACK_WEBHOOK_URL --project-name=persona-chat-feedback
   ```
   Paste the webhook URL from step 1 when prompted.
5. **Smoke-test:** open the deployed URL in a browser, submit the form, and
   confirm a message shows up in Discord/Slack within a few seconds.
6. **Point the extension at it** — edit `src/lib/feedback.ts` in the repo
   root and replace `FEEDBACK_BASE_URL` with the real URL from step 3, then
   rebuild the extension (`npm run build`).

## Redeploying after an edit

```
cd feedback-site
npx wrangler pages deploy . --project-name=persona-chat-feedback
```

## Local dev

```
cd feedback-site
npx wrangler pages dev .
```

## Notes

- No analytics, no cookies, no third-party scripts on the page itself —
  matches the extension's own "we don't track you" posture.
- A honeypot hidden field (`website`) is the only spam defense right now. If
  spam becomes a real problem, add [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
  before reaching for anything heavier.
- The relay payload sends both `content` (Discord) and `text` (Slack) keys —
  whichever service you pointed the webhook at reads its own key and ignores
  the other, so switching services later is a secret change, not a code
  change.
