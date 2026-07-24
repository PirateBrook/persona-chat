# Chrome Web Store listing — draft copy

Ready to paste into the developer dashboard when we submit. Screenshots are
in `docs/store-assets/` — real captures via browser-cdp against a live
chat.deepseek.com session, 1280×800 (CWS's required screenshot size), not
mockups.

## Category

**Fun** (formerly "Just for Fun"). The core hook is roleplay/companion chat,
not task productivity — several built-in personas lean career/work, but
that's flavor within a fun/entertainment product, not the primary pitch.
Alternative if "Fun" underperforms after launch: **Social & Communication**.

## Short description (≤132 characters)

Revised after a persona-driven install-decision review (non-technical user,
first time seeing the listing): lead with a concrete, evocative character
name instead of jargon ("character cards"/"world info" read as unfamiliar
terms to someone who's never used a roleplay tool), and move the privacy
reassurance up from the bottom of the long description — "will this leak my
chat history" was the reviewer's first unspoken worry, and it shouldn't wait
until paragraph 6 to get answered.

**English:**
> Give DeepSeek or Claude a roleplay persona — a bar owner, a talking cat & more. 100% free, no chat data uploaded, no API key.

**中文:**
> 给 DeepSeek 或 Claude 装上「深夜小酒馆的老板」「不讲逻辑的猫」等角色扮演人设——完全免费、不上传聊天记录、无需 API Key。

## Detailed description

**English:**

> Persona.chat turns your free DeepSeek or Claude.ai session into a roleplay
> and companion chat platform — no API key, no subscription, no server of
> ours in the middle. It rides your own login on either site the same way you
> already use it; we just help you set the scene.
>
> Nothing you type ever leaves your browser. Every persona, world info
> entry, and background image lives only in your own local storage — we
> don't have a server, so there's nowhere for it to go. See our privacy
> policy for specifics.
>
> Character cards — basically "a character with its personality and
> opening line pre-written." 100+ built-in personas spanning work, roleplay,
> philosophy, and companion moods (a late-night bar owner, an illogical
> talking cat) — or write your own with a personality, scenario, example
> dialogue, and greeting. Already have cards from chub.ai or SillyTavern?
> Import them directly (PNG or JSON) instead of starting from scratch.
>
> World info — basically "a cheat sheet the character can glance at" —
> attach keyword-triggered lore (a backstory detail, a running joke, a plot
> fact). Tap "✨ Enrich" before sending and matching lore gets woven into
> your message automatically.
>
> Stay in character — an optional in-character reminder resurfaces every
> few messages to fight the model drifting out of persona over a long chat.
>
> Scenes — 12 hand-tuned CSS backgrounds across five moods, or upload
> your own photos — swap the whole atmosphere behind the chat in one click.
>
> Page tweaks — on DeepSeek, hide its "reasoning trace" block if you just
> want the answer.
>
> Bilingual — full English/Chinese UI and content, auto-detected from
> your browser language.
>
> Everything you type is still sent the normal way, by you, pressing Enter —
> Persona.chat only ever prepares the message; it never sends anything on
> its own. Add it free, pick a persona, and turn your next DeepSeek or
> Claude chat into a scene.

**中文:**

> Persona.chat 让你免费的 DeepSeek 或 Claude.ai 会话变成一个角色扮演/陪伴
> 聊天平台——不需要 API Key,不需要订阅,中间也没有我们自己的服务器。它就是
> 骑在你本来就在用的登录会话上(两个站点都行),我们只是帮你把场景搭好。
>
> 不上传你的任何聊天内容。角色、世界设定、背景图片全部只存在你自己的
> 浏览器本地——我们没有服务器,也没有地方可以接收你的数据。具体细节见我们的
> 隐私政策。
>
> 角色卡——说白了就是"提前写好性格和开场白的一个角色"。100+ 个内置人设,
> 覆盖职场、角色扮演、哲学思辨、陪伴等不同调性(比如"深夜小酒馆的老板"、
> "不讲逻辑的猫"),也可以自己写:性格设定、场景、示例对话、开场白一应俱全。
> 已经有 chub.ai 或 SillyTavern 的角色卡?直接导入(PNG 或 JSON),不用从头写。
>
> 世界设定——说白了就是"给角色配一本小抄"——绑定几个关键词,聊到相关话题
> 时自动把设定好的背景信息(身世细节、梗、剧情事实)带出来。发送前点一下
> "✨ 增强",匹配到的设定会自动织入你的消息里。
>
> 防止跑偏——可选的角色提醒会每隔几条消息重新出现一次,防止长对话里模型
> 慢慢演成另一个人。
>
> 场景——12 款手工调校的 CSS 背景,覆盖五种氛围,也可以直接上传自己的
> 照片——一键切换聊天背后的整个氛围。
>
> 页面定制——在 DeepSeek 上,想直接看答案可以隐藏它的"已思考"过程展示。
>
> 中英双语——界面和内容全面支持中英文,根据浏览器语言自动检测。
>
> 你发送的每一条消息,依然是你自己按回车发出去的——Persona.chat 只负责把
> 消息准备好,绝不会替你自动发送任何内容。免费装上,选一个角色,下一次打开
> DeepSeek 或 Claude 就能开始。

## ASO audit notes (marketing-skills:aso, this pass)

Independently confirmed and fixed: stale "15 personas" copy (now 100+),
missing chub.ai/SillyTavern card-import mention, unrendered `**bold**`
markdown (CWS's detailed-description field is plain text — the asterisks
above are gone, replaced with em-dash lead-ins), and no closing CTA (added
to the end of both long descriptions). Screenshot 1 also leaked real
personal DeepSeek chat history via the sidebar — see the Assets checklist
below for status.

## Permission justifications (for the CWS submission form)

- **`storage` / `unlimitedStorage`** — Stores the user's personas, world
  info, background preferences, and uploaded background images locally via
  chrome.storage.local. `unlimitedStorage` lifts the default ~10MB cap
  specifically because uploaded background photos (even downscaled and
  compressed client-side) can approach or exceed it with a handful of
  images saved.
- **Host permissions: `https://chat.deepseek.com/*` and `https://claude.ai/*`**
  — The extension's entire function is a content-script UI on these official
  free LLM web-chat pages: showing the persona panel, reading the chat input
  box's current draft, and writing a composed message into it. Both hosts
  serve the same single purpose (a roleplay/persona layer for a free web
  chat); each host is the minimum needed to inject on that site. No other host
  is accessed; no `<all_urls>` or broad permissions are requested.
- **`tts`** — Powers the optional "read the reply aloud" feature (voice
  picker + playback in the Persona panel). Uses Chrome's own on-device
  `chrome.tts` engine only; no audio or text is sent to any third-party or
  first-party server.

## Developer account contact

Support email for the CWS developer dashboard: punkscosmos@gmail.com
(personal address — there's no company mailbox).

## Assets checklist

- [x] Icon (128px+, via Plasmo's generated set from `assets/icon.png`)
- [x] Screenshots, 1280×800, in `docs/store-assets/`:
      `screenshot-1-personas.png` (character list + tag filters),
      `screenshot-2-scenes.png` (background gallery),
      `screenshot-3-fullpage-background.png` (full-page atmosphere, no panel open),
      `screenshot-4-persona-injected.png` (a persona's composed opening message
      actually sitting in the real DeepSeek chat input — added after a
      persona-driven install-decision review flagged that prospective users
      want to see "what does talking to it actually look like," not just the
      picker UI)
- [ ] Optional: small promo tile 440×280, large tile 920×680, marquee 1400×560
- [x] Privacy policy — hosted at
      https://github.com/PirateBrook/persona-chat/blob/main/PRIVACY.md
      (GitHub renders the markdown directly; use this URL in the CWS
      submission form's privacy policy field)
- [ ] CWS developer dashboard "Privacy practices" disclosure tab — a separate
      form from the hosted privacy policy link above; must be filled in at
      submission time (data usage categories, purpose, no third-party sale).
- [x] Screenshot 1 retaken with sidebar collapsed — no longer leaks real
      personal DeepSeek chat history (verified 2026-07-21).
- [x] Claude.ai screenshots added (1280×800, browser-cdp on a live logged-in
      session; sidebar collapsed + org badge hidden so no private chat history
      or account/org data shows):
      `screenshot-5-claude-personas.png` (persona panel/list on claude.ai),
      `screenshot-6-claude-injected.png` (a persona's opening message injected
      into Claude's composer, over a scene background).
      Give them a final eyeball before submitting. Minor known cosmetic: some
      persona tags render in English on a zh UI (a few tags lack zh
      translations) — separate i18n gap, not a screenshot blocker.
