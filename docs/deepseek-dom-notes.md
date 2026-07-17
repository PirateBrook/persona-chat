# chat.deepseek.com — DOM & theming knowledge base

Collected by live CDP inspection of a real logged-in session (see `browser-cdp`
skill). Written so future background/theme work can target DeepSeek's actual
design-token system instead of guessing at hashed classnames. Re-verify before
relying on anything here after a DeepSeek redeploy — see "How to re-verify"
at the bottom.

## The one big finding

Our current approach only paints `html, body { background-image }`. That
never had a chance of fully working, because DeepSeek's own layout paints
**opaque** backgrounds on top via CSS custom properties
(`--dsw-alias-bg-layer-1/2/3`) — not via a color baked into a hashed class.
The fix is to override those custom properties on `body`, not to fight
individual hashed classnames. See "Retheme recipe" below.

## Class naming: two systems, very different stability

DeepSeek ships **two** kinds of class names and they must be treated
differently:

1. **`ds-*` prefixed classes — stable.** These come from DeepSeek's own shared
   design-system component library (their internal "DS" — likely "DeepSeek
   System"). Observed so far: `ds-button`, `ds-button--*`, `ds-icon`,
   `ds-scroll-area` (+ `__gutters`, `__horizontal-bar`, `__vertical-bar`),
   `ds-message`, `ds-markdown`, `ds-markdown-paragraph`,
   `ds-assistant-message-main-content`, `ds-think-content`,
   `ds-virtual-list` (+ `-items`, `-visible-items`), `ds-toggle-button`,
   `ds-focus-ring`, `ds-tooltip`, `ds-notification-container`,
   `ds-floating-container`, `ds-floating-position-wrapper`, `ds-theme`,
   `ds-modal-overlay`, `ds-skeleton`, `ds-radio-button(-group)`. Safe to hook
   selectors on. Not guaranteed exhaustive — re-scan (see bottom) to extend.

2. **Hashed classes — unstable, regenerate every deploy.** e.g. `cb86951c`,
   `_81e7b5e`, `_4f9bf79`, `_72b6158`, `ef46fbc6`. These are CSS-modules
   build-hash classnames. **Never hardcode one of these in our extension.**
   They're only useful transiently, during one live debugging session, to
   understand structure — not as a selector that ships.

## Theme switch mechanism (confirmed via live DOM + fetched CSS)

- `<body>` carries a plain class list, observed: `apple zh_CN dark` (platform,
  locale, and a `dark`/absent modifier).
- The real signal is the **attribute** `data-ds-dark-theme="dark"` on
  `<body>`, present only in dark mode. `getComputedStyle(body).colorScheme`
  ("dark"/"light") also reliably reflects this — that's what
  `src/lib/backgrounds.ts`'s `detectTheme()` already reads, and it is
  correct; keep doing that.
- The stylesheet defines **the entire palette twice**, once as a plain
  `body { --token: light-value; ... }` block and once as
  `body[data-ds-dark-theme] { --token: dark-value; ... }`. Attribute-selector
  specificity ties with the plain-class rule, so normal cascade order (the
  `[data-ds-dark-theme]` block is emitted later in the file) makes dark mode
  win when the attribute is present. This is a real, intentional mechanism —
  not a hack — so it's safe to mirror the same pattern in our own injected
  CSS (`body[data-ds-dark-theme] { --our-override: x } body:not([data-ds-dark-theme]) { --our-override: y }`).

### Correction to a previous assumption

We previously logged (in project memory) that `getComputedStyle(body).color`
returning `rgb(128, 0, 128)` (`purple`) was a meaningless/unreliable
artifact. **That was wrong — it's real, intentional DeepSeek CSS.** Their own
stylesheet literally sets `body { ...; color: purple; ... }` as a base/reset
value. Nothing renders with that color because every actual visible text
node lives inside a component that explicitly sets
`color: var(--dsw-alias-label-primary)` (or `-secondary`/`-tertiary`) itself.
Takeaway stands (`body`'s computed `color` is not a usable signal for
anything), but the reason is "DeepSeek deliberately never lets body's own
color be inherited," not "the value is meaningless noise." Don't waste time
re-investigating this if it comes up again.

## The design-token system (this is the actual theming API)

DeepSeek's CSS is **not** introspectable via `document.styleSheets` —
`main.<hash>.css` is served from a different origin
(`fe-static.deepseek.com` vs `chat.deepseek.com`), so `sheet.cssRules` throws
a `SecurityError` for it (only the few inline `<style>` tags are readable
that way). It **is** fetchable as raw text — the CDN sends permissive CORS
headers, so `fetch(cssHref).then(r => r.text())` works fine from page/content-
script context. That's how all of the below was extracted; see "How to
re-verify."

Two token tiers, roughly 330+ `--dsw-*` custom properties total:

- **`--dsw-static-*`** — raw palette scale (e.g. `--dsw-static-neutral-bluish-00`
  through `-1000`, `--dsw-static-deepseek-*` brand scale, `--dsw-static-amber-*`,
  `-blue-*`, etc). Not meant to be consumed directly by components; only
  referenced by the alias tier below. Values for the neutral-bluish scale
  don't actually change between light/dark blocks (both blocks define the
  full ramp identically) — only *which* alias points at which rung changes.
- **`--dsw-alias-*`** — semantic tokens components actually read via `var()`.
  **These are the override targets.** Confirmed values (light → dark):

  | token | light | dark |
  |---|---|---|
  | `--dsw-alias-bg-base` | `#fff` | `#151517` |
  | `--dsw-alias-bg-layer-1` | `#fff` | `#232324` |
  | `--dsw-alias-bg-layer-2` | `#fff` | `#2c2c2e` |
  | `--dsw-alias-bg-layer-3` | `#fff` | `var(--dsw-static-neutral-bluish-800)` |
  | `--dsw-alias-label-primary` | `neutral-bluish-1000` | `neutral-bluish-50` |
  | `--dsw-alias-label-secondary` | `neutral-bluish-700` | `neutral-bluish-300` |
  | `--dsw-alias-label-tertiary` | `neutral-bluish-600` | `neutral-bluish-400` |
  | `--dsw-alias-label-caption` | `neutral-bluish-400` | `neutral-bluish-600` |
  | `--dsw-alias-markdown-code-block` | `neutral-bluish-50` | `neutral-bluish-900` |
  | `--dsw-alias-markdown-code-block-banner` | `neutral-bluish-50` | `neutral-bluish-850` |
  | `--dsw-alias-markdown-inline-code` | `neutral-bluish-100` | `neutral-bluish-850` |
  | `--dsw-alias-border-l1` | `rgba(0,0,0,.04)` | `rgba(255,255,255,.06)` |
  | `--dsw-alias-border-l2` | `rgba(0,0,0,.1)` | `rgba(255,255,255,.12)` |

  Other confirmed alias tokens worth knowing exist (not yet fully
  cataloged): `bg-mask-1/2/3`, `bg-mask-photo`, `bg-overlay`, `bg-skeleton`,
  `bg-multi-select`, `border-l3`, `border-l4`, `border-inverted(2)`,
  `brand-primary(-invert)`, `brand-text`, `button-*` (contrast-fill,
  elevated-fill, floating-fill/-hover, ghost-active-*, link-fill/-hover,
  primary-dimmed/-fill/-hover, tool-bar-fill/-hover), `interactive-bg-active`,
  `interactive-bg-hover(-accent/-danger/-solid)`, `label-dimmed`,
  `label-primary-dimmed/-foreground/-inverted`, `markdown-citation`,
  `markdown-placeholder`, `markdown-tag`, `scrollbar-bg-l1/l2`,
  `scrollbar-hover-l1/l2`.
- **`--ds-*`** (no `w`) — a separate, non-color tier: easing/timing
  (`--ds-ease-in-out`, `--ds-transition-duration(-fast/-slow)`), typography
  scale (`--ds-font-size-{xs,s,m,l}`, `--ds-line-height-*`),
  `--ds-control-height-{xs,s,m,l,xl}`, `--ds-font-family-code`,
  `--ds-font-weight-strong`. Irrelevant to retheming; noted so it isn't
  confused with `--dsw-*`.

### What consumes `bg-layer-1` vs `-2` vs `-3`

From live rule extraction:
- `bg-layer-1`: the main chat scroll-area wrapper (the element with classes
  `ds-scroll-area` + hashes matching the message-list container) and the
  floating side-panel background.
- `bg-layer-2`: modal/dialog surfaces, the composer's outer panel, the
  cookie-consent banner — "elevated card" surfaces.
- `bg-layer-3`: a further-elevated surface (e.g. a toggle/segmented-control
  pill background) — least commonly used of the three.

## Retheme recipe (the actual fix for "background not covering / text
turned white")

Instead of (or in addition to) painting `html, body { background-image }`,
inject a rule that overrides the alias tokens so DeepSeek's own components
stop painting opaque fills on top of our image:

```css
body[data-ds-dark-theme], body:not([data-ds-dark-theme]) {
  --dsw-alias-bg-base: transparent !important;
  --dsw-alias-bg-layer-1: transparent !important;
  /* bg-layer-2/3 back dialogs & the composer card — going fully transparent
     there will make modals/the input box unreadable against the background
     image. Prefer a translucent value (e.g. rgba(0,0,0,.35) in dark mode,
     rgba(255,255,255,.55) in light) rather than transparent for those two. */
}
```

Because these are custom properties, not colors baked into a hashed class,
this survives DeepSeek deploys as long as the **token names** stay stable —
which is far more likely than any given hashed classname surviving, since
the alias names are DeepSeek's own internal design-system contract consumed
by dozens of components.

Still keep the existing `html, body { background-image }` rule for the
literal page canvas — the token override handles DeepSeek's own internal
opaque layers stacked on top of that canvas, which is what a plain
`background-image` on `html`/`body` can never reach.

## Structural map (React SPA, single root)

```
body.apple.zh_CN.dark[data-ds-dark-theme=dark]
└─ #root
   └─ div (app shell, hashed)
      └─ div (hashed) — main flex row
         ├─ sidebar: div (hashed) — conversation history list (plain <a> links)
         ├─ div (hashed) — chat-pane header
         ├─ div._4ce999d..., class ds-scroll-area — MESSAGE LIST WRAPPER
         │   └─ div.ds-scroll-area__gutters (scrollbar chrome)
         │   └─ div.ds-virtual-list
         │       └─ div.ds-virtual-list-items
         │           └─ div.ds-virtual-list-visible-items  ← only *visible*
         │                                                     rows exist in
         │                                                     the DOM (see
         │                                                     "Virtualized
         │                                                     list" below)
         │               ├─ (assistant row, hashed) [data-virtual-list-item-key]
         │               │   └─ div.ds-message
         │               │       └─ div (hashed)
         │               │           ├─ div.ds-think-content   ← collapsible
         │               │           │     "已思考" block; contains its own
         │               │           │     nested div.ds-markdown
         │               │           └─ div.ds-markdown.ds-assistant-message-main-content
         │               │                 ← the actual rendered answer
         │               └─ (user row, hashed, e.g. `_81e7b5e`)
         │                   ├─ div (hashed) — raw user text, NO ds-* class
         │                   └─ div (hashed) — hover actions (copy/edit),
         │                         empty until hover
         └─ div (hashed) — composer/input panel
             └─ textarea (only `<textarea>` on the page — current adapter's
                   selector strategy of "the textarea" remains correct)
├─ div.ds-notification-container.ds-theme (toast host, sibling of #root)
└─ div.ds-floating-container
    └─ div.ds-floating-position-wrapper.ds-theme
        └─ div.ds-tooltip... (tooltips render here, not inline)
```

### Markdown rendering (assistant messages)

`div.ds-markdown.ds-assistant-message-main-content` contains plain semantic
HTML: `p.ds-markdown-paragraph`, `h1`–`h4`, `ul`/`li`, `table`/`thead`/`tbody`/
`tr`, `blockquote`, `hr`, `strong`, inline `code`. **No `<pre>` wrapper was
observed** — code blocks are not the classic `<pre><code>` shape; they use a
custom component pair styled by `--dsw-alias-markdown-code-block` (body) and
`--dsw-alias-markdown-code-block-banner` (the little language/copy-button
strip on top). Inline code uses `--dsw-alias-markdown-inline-code`.

### User message bubble has no stable hook

Unlike assistant messages (`ds-message`, `ds-markdown`,
`ds-assistant-message-main-content` are all stable), the user's own bubble
renders with **only hashed classnames** — no `ds-*` class was found on it or
its row. If we ever need to target "user bubble only" styling, prefer a
structural rule (the sibling row that has no `.ds-markdown` descendant, i.e.
"a `.ds-virtual-list-visible-items` child that doesn't contain
`.ds-message`") over hardcoding today's hash — the hash will not survive the
next deploy, and there is no semantic alternative to fall back to yet.

### Virtualized list — don't assume all messages are in the DOM

The message list is `ds-virtual-list` (a react-window-style virtualizer).
Only currently-visible rows exist under `.ds-virtual-list-visible-items` at
any moment; scrolled-away messages are unmounted. Any future feature that
wants to scan message *content* (not just apply CSS) must account for this —
e.g. don't assume `document.querySelectorAll('.ds-message')` returns the
whole conversation, and don't rely on message DOM nodes staying mounted
across a scroll.

## How to re-verify this document

Class hashes and even which alias token a given component reads **will**
drift across DeepSeek deploys; the `ds-*` names and the theme-switch
mechanism (`body[data-ds-dark-theme]`) are the durable part. To refresh:

1. Use the `browser-cdp` skill to open a real logged-in `chat.deepseek.com`
   session (chain every step into one shell call — the CDP daemon wedges
   between separate calls; see the `browser-cdp-agent-browser-daemon-instability`
   memory note).
2. Get the current stylesheet hrefs:
   `Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href)`
   — don't hardcode `main.453dd6bda4.css`, the hash changes every deploy.
3. Fetch each href's text (`fetch(href).then(r => r.text())`) — this is the
   only way to see the real rules; `document.styleSheets` throws for
   cross-origin sheets.
4. Regex-extract `--dsw-alias-[a-z0-9-]+\s*:\s*[^;]+;` pairs, or grep for a
   known class substring (`ds-message`, `ds-markdown`, etc.) to find which
   selectors still use it and which token they read.
5. Cross-check computed values live via `getComputedStyle(el)` on real
   elements (not just the raw CSS text) to catch anything resolved through
   inline `style="--x: y"` attributes, which several DeepSeek components use
   per-instance (observed: `--panel-width`, `--assistant-last-padding-bottom`,
   `--app-height`).
