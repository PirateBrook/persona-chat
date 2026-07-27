# 第三个平台选型调研：ChatGPT vs. Grok

- **调研日期**：2026-07-27
- **背景**：既定路线是 DeepSeek（已完成）→ Claude.ai（已完成）→ ChatGPT（原计划）。用户提出这一轮想改道先做 Grok，本调研用于确认该按原计划做 ChatGPT，还是改道 Grok。
- **方法**：deep-research 多源 fan-out（103 个 agent，821 次工具调用）+ 对抗式核实。

## 结论：这一轮做 ChatGPT，不改道 Grok

## 1. 体量对比：差距在一个数量级以上，且还在扩大

- ChatGPT 2026 年 4 月全球移动端日活 **2.449 亿**，是 Claude（2300 万）的 10 倍以上；Grok 移动端日活 3 月→4 月从 1390 万降到 **1220 万**（-12.5%），网页日均访问量同期从 1050 万降到 930 万（-11.6%）。两条数字都独立核实通过，交叉换算 ChatGPT 移动日活约为 Grok 的 **~20 倍**。（[Forbes](https://www.forbes.com/sites/conormurray/2026/05/05/elon-musks-grok-loses-users-throughout-2026-as-rivals-rise/)，多家媒体转载确认一致）
- chatgpt.com 全球网站排名第 7，美国 "AI Chatbots and Tools" 类目第 1。（[Similarweb](https://www.similarweb.com/website/chatgpt.com/)）
- Grok 确实在 2026 年 1 月一度反超 DeepSeek 成为访问量第三大 AI 聊天网站（314M vs 298.3M 月访问，Similarweb 官方数据自证），但这个上升势头到 3-4 月已经**逆转为持续下滑**——不是"体量小但在追赶"，而是"体量小且势头已经掉头"。
- ⚠️ 调研过程中的一个真实教训：一开始抓到的"ChatGPT 网页流量是 Grok 18 倍"这个数字，源头是**误抓了一个仿冒域名 `chat-gpt.com`**（而非真正的 `chatgpt.com`，两者访问量差 18.6 万倍）——这条已被对抗式核实推翻。上面 ~20 倍的结论改用两条独立核实过的移动日活数字重新换算，不是同一条被推翻的声明。
- Grok 的 Similarweb 数据**不包含** X 平台内嵌的 `x.com/i/grok` 使用量，如果这部分占比很高，可能低估 Grok 真实覆盖——但即便如此，独立站体量差距也是数量级级别，方向性结论不太可能被推翻。

## 2. 技术风险：ChatGPT 的坑是已知且有解法的，Grok 的坑现在还没查清楚

**ChatGPT**：
- 输入框是 **ProseMirror 驱动的 contenteditable div**（`#prompt-textarea`），不是 textarea。ProseMirror 维护一份独立于可见 DOM 的内部编辑器状态树，直接改 `innerHTML` 只会让文字"看起来"出现，下次渲染就被吃掉——必须用携带正确 `inputType` 的 `beforeinput`/`input` 事件或 `document.execCommand("insertText")` 才能被真正识别。（[GitHub issue](https://github.com/srbhptl39/MCP-SuperAssistant/issues/195)，[技术文章](https://performance.dev/chatgpt) 交叉确认，本项目 Claude.ai adapter 已经用 `execCommand("insertText")` 踩过同一类坑并验证过可行）
- 已有先例（editGPT 插件）在 2024-2025 年间**至少 3 个独立时间段**（2024年中/2025年初/2025年中）因 ChatGPT 前端改动反复失效，CWS 评论里能查到直接归因于某次 ChatGPT 更新的用户反馈。（[CWS 评论页](https://chromewebstore.google.com/detail/editgpt/mognjodfeldknhobgbnkoomipkmlnnhk/reviews)）——这是要接受的长期维护成本，不是能一次性解决的坑，但本项目的 `findFirstUsable`（selector 列表按"具体→通用"排列、加新 selector 不改算法）这套模式已经是为这类问题设计的。
- **没有找到**任何证据表明 ChatGPT 有专门针对浏览器扩展/自动化脚本的反制机制（Cloudflare 挑战、专有指纹识别等相关声明均被推翻）——技术路径明确，没有"不可逾越"的反自动化壁垒。

**Grok**：
- 输入框的真实 DOM 结构（contenteditable？textarea？用什么前端框架）**本轮没能拿到可靠证据**——相关具体声明（称其为 textarea 且带 Lexical 兜底）已被推翻。
- 免费版和 X Premium/SuperGrok 之间的能力边界、免费版限流数字，本轮所有具体声明也**都没通过核实**（博客来源冲突、过时）。

也就是说：Grok 不仅体量小一个数量级，工程上到底有多难做，现在**完全是黑箱**——它不是"更小但更容易"的备选，而是"更小且还需要专项调研才知道难不难"。

## 3. 开放问题（若以后要重新评估 Grok，先查这些）

1. `grok.com` 输入框真实 DOM 结构——需要 browser-cdp 直接现场检查。
2. ChatGPT / Grok 当前真实免费额度限流——需要新注册账号直接实测，别信二手博客数字。
3. `x.com/i/grok` 内嵌使用量级，是否显著影响 Grok 真实覆盖面的结论。
4. 除 editGPT 外是否有更成熟的 ChatGPT 注入类扩展方案可参考其 ProseMirror 事件序列实现。

## 推荐

**这一轮做 ChatGPT**，原因是体量差距（~20 倍且仍在扩大）+ ChatGPT 技术风险已知且有解法（本项目 Claude.ai 的 adapter 经验直接复用）。Grok 可以作为体量企稳后的下一候选，但在那之前需要先补一次 Grok 专项技术调研（DOM 勘察 + 真实免费限流实测），而不是现在就凭现有信息立项。

落地前置（沿用 Claude.ai adapter 的既定路线）：正式写 PRD 前，先用 browser-cdp 对真实登录的 chatgpt.com 会话做一次 DOM 勘察，验证 `#prompt-textarea` 选择器和 `execCommand("insertText")` 注入路径在当前版本上确实可行。
