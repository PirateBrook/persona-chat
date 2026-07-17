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

**English:**
> Give DeepSeek a persona: character cards, world info, and custom scenes — 100% free, 100% local, no API key needed.

**中文:**
> 给 DeepSeek 装上专属人设:角色卡、世界设定、自定义背景——完全免费,数据全部本地存储,无需 API Key。

## Detailed description

**English:**

> Persona.chat turns your free chat.deepseek.com session into a roleplay and
> companion chat platform — no API key, no subscription, no server of ours
> in the middle. It rides your own DeepSeek login the same way you already
> use it; we just help you set the scene.
>
> **Character cards.** 15 built-in personas spanning work, roleplay,
> philosophy, and companion moods — or write your own with a personality,
> scenario, example dialogue, and greeting.
>
> **World info.** Attach keyword-triggered lore to a character (a backstory
> detail, a running joke, a plot fact). Tap "✨ Enrich" before sending and
> matching lore gets woven into your message automatically.
>
> **Stay in character.** An optional in-character reminder resurfaces every
> few messages to fight the model drifting out of persona over a long chat.
>
> **Scenes.** 12 hand-tuned CSS backgrounds across five moods, or upload
> your own photos — swap the whole atmosphere behind the chat in one click.
>
> **Page tweaks.** Hide DeepSeek's "reasoning trace" block if you just want
> the answer.
>
> **Bilingual.** Full English/Chinese UI and content, auto-detected from
> your browser language.
>
> **Private by design.** Every persona, world info entry, and background
> image is stored locally via chrome.storage — never uploaded anywhere,
> because there's nothing to upload it to. See our privacy policy for
> specifics.
>
> Everything you type is still sent the normal way, by you, pressing Enter —
> Persona.chat only ever prepares the message; it never sends anything on
> its own.

**中文:**

> Persona.chat 让你免费的 chat.deepseek.com 会话变成一个角色扮演/陪伴聊天
> 平台——不需要 API Key,不需要订阅,中间也没有我们自己的服务器。它就是骑在
> 你本来就在用的 DeepSeek 登录会话上,我们只是帮你把场景搭好。
>
> **角色卡。** 15 个内置人设,覆盖职场、角色扮演、哲学思辨、陪伴等不同调性,
> 也可以自己写:性格设定、场景、示例对话、开场白一应俱全。
>
> **世界设定。** 给角色绑定关键词触发的背景设定(身世细节、梗、剧情事实)。
> 发送前点一下"✨ 增强",匹配到的设定会自动织入你的消息里。
>
> **防止跑偏。** 可选的角色提醒会每隔几条消息重新出现一次,防止长对话里模型
> 慢慢演成另一个人。
>
> **场景。** 12 款手工调校的 CSS 背景,覆盖五种氛围,也可以直接上传自己的
> 照片——一键切换聊天背后的整个氛围。
>
> **页面定制。** 想直接看答案的话,可以隐藏 DeepSeek 的"已思考"过程展示。
>
> **中英双语。** 界面和内容全面支持中英文,根据浏览器语言自动检测。
>
> **设计上就保证隐私。** 每一个角色、世界设定条目、背景图片都只通过
> chrome.storage 存在本地——不会上传到任何地方,因为压根没有服务器可以上传。
> 具体细节见我们的隐私政策。
>
> 你发送的每一条消息,依然是你自己按回车发出去的——Persona.chat 只负责把
> 消息准备好,绝不会替你自动发送任何内容。

## Permission justifications (for the CWS submission form)

- **`storage` / `unlimitedStorage`** — Stores the user's personas, world
  info, background preferences, and uploaded background images locally via
  chrome.storage.local. `unlimitedStorage` lifts the default ~10MB cap
  specifically because uploaded background photos (even downscaled and
  compressed client-side) can approach or exceed it with a handful of
  images saved.
- **Host permission: `https://chat.deepseek.com/*`** — The extension's
  entire function is a content-script UI on this one page: showing the
  persona panel, reading the chat input box's current draft, and writing a
  composed message into it. No other host is accessed.

## Assets checklist

- [x] Icon (128px+, via Plasmo's generated set from `assets/icon.png`)
- [x] Screenshots, 1280×800, in `docs/store-assets/`:
      `screenshot-1-personas.png` (character list + tag filters),
      `screenshot-2-scenes.png` (background gallery),
      `screenshot-3-fullpage-background.png` (full-page atmosphere, no panel open)
- [ ] Optional: small promo tile 440×280, large tile 920×680, marquee 1400×560
- [x] Privacy policy (`PRIVACY.md` — needs to be hosted at a public URL, e.g.
      via GitHub Pages or the repo's raw GitHub URL, before submission)
