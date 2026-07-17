# Privacy Policy — Persona.chat

_Last updated: 2026-07-17_

## English

Persona.chat is a browser extension that lets you apply character personas,
world info, and decorative backgrounds while you use chat.deepseek.com. It
does not talk to any server of its own.

**What the extension stores, and where.** Every persona you create or edit,
your world info entries, your background/theme preferences, and any custom
background images you upload are stored using the browser's built-in
`chrome.storage.local` API — on your own device only. Nothing is uploaded to
us, because we don't run a server for this extension to upload to.

**What the extension reads or changes on the page.** On chat.deepseek.com,
the extension reads the chat input box's current text and writes a composed
message into it (your persona's introduction, or world-info lore matched
against your draft) so you can review it and press Enter yourself. It never
reads your conversation history, never sends anything on your behalf without
you pressing Enter, and never modifies any other website.

**What we don't do.** No account or sign-up. No analytics, tracking, or
telemetry of any kind. No third-party SDKs. No network requests to any
server we control — the extension's code makes zero outbound requests other
than the ones your browser already makes to load chat.deepseek.com itself.
We have no way to see your personas, your custom images, or anything else
you store in the extension, because none of it ever leaves your browser.

**Uninstalling.** Removing the extension removes all of the above data along
with it — `chrome.storage.local` is cleared by Chrome when an extension is
uninstalled.

**Permissions, and why.**
- `storage` / `unlimitedStorage`: to save your personas, world info, and
  uploaded background images locally, without a low size cap.
- Host access to `chat.deepseek.com`: to show the persona panel there and to
  read/write the chat input box, which is the extension's entire purpose.

**Changes.** If this policy changes, the date above will be updated and the
new version will describe what changed.

**Contact.** Questions about this policy: punkscosmos.com.

---

## 中文

Persona.chat 是一个浏览器扩展,让你在使用 chat.deepseek.com 时应用角色人设、
世界设定和装饰性背景。它不会跟我们自己的任何服务器通信——因为这个扩展根本
没有配套服务器。

**扩展存储了什么、存在哪里。** 你创建或编辑的每一个角色、世界设定条目、
背景/主题偏好,以及你上传的任何自定义背景图片,都只通过浏览器内置的
`chrome.storage.local` API 存在**你自己的设备上**。不会上传给我们,因为
根本没有服务器可以上传。

**扩展在页面上读取或修改了什么。** 在 chat.deepseek.com 上,扩展会读取聊天
输入框当前的文字,并把组合好的消息(角色开场白,或匹配到你草稿的世界设定)
写回输入框,让你自己确认后按回车发送。扩展不会读取你的聊天历史记录,不会
在你按回车之前替你发送任何内容,也不会修改任何其他网站。

**我们不做什么。** 不需要账号或注册。没有任何形式的数据统计、埋点或
遥测。不集成任何第三方 SDK。扩展代码不会向我们控制的任何服务器发起网络
请求——除了浏览器加载 chat.deepseek.com 页面本身产生的请求外,没有任何
额外的对外请求。你的角色、自定义图片等一切存储内容,我们都看不到,因为它们
从未离开过你的浏览器。

**卸载。** 卸载扩展会连同上述数据一起清除——Chrome 在扩展卸载时会清空对应
的 `chrome.storage.local`。

**权限说明。**
- `storage` / `unlimitedStorage`:在本地保存你的角色、世界设定和上传的
  背景图片,且不受较低的存储上限限制。
- 对 `chat.deepseek.com` 的站点访问权限:用于在该页面上显示人设面板,以及
  读写聊天输入框——这是扩展存在的全部目的。

**变更。** 如果本政策有变化,上方日期会更新,并说明具体改动内容。

**联系方式。** 关于本政策的问题:punkscosmos.com。
