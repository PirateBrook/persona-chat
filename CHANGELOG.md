# 更新日志

## [未发布]

（下一次提交前，新的改动记在这里）

## [0.0.1] - 2026-07-22 - 首次提交 Chrome Web Store 审核

### 核心角色扮演功能
- 人设卡：性格、场景（scenario）、示例对话、开场白；可视化面板一键应用到 chat.deepseek.com 输入框
- 世界设定（World Info）：关键词触发的背景知识，"✨ 增强"按钮匹配草稿内容后织入消息
- 防跑偏提醒：长对话中每隔几条消息重新插入一次角色提醒
- 背景系统：12 款手工调校的 CSS 背景（渐变 + SVG 噪点 + 点缀元素），支持上传自定义图片
- DeepSeek 页面定制：隐藏"已思考"折叠块等开关（可扩展的"定制" tab）

### 内容与生态
- 内置人设从 15 个扩充到 100 个（陪伴/角色扮演/工作/娱乐/哲学五大类），中英文均为人工撰写/文化重设计，非机翻
- 支持导入 SillyTavern/chub.ai 角色卡（PNG tEXt chunk 或 JSON，V2/V3 格式）
- 用户可打点📌记忆便签，自动转为常驻世界设定条目
- TTS 朗读回复（chrome.tts，本地语音引擎，含音色选择）

### 平台与本地化
- 中英双语 UI 与内容，根据浏览器语言自动检测（`AppState.language: auto/en/zh`）
- 全程零服务器架构：所有数据存在 `chrome.storage.local`，无网络请求、无遥测、无第三方 SDK

### 上架准备（本次会话）
- 修复依赖漏洞：`pnpm.overrides` 修复 msgpackr/content-security-policy-parser 两个 High 漏洞，postcss 直接升级；`@parcel/reporter-dev-server` 因会破坏 Parcel 兼容性检查，评估后有意保留不动（仅影响 `pnpm dev`，不进最终包）
- 完善 `PRIVACY.md` 联系邮箱（改为可实际收信的 `punkscosmos@gmail.com`）
- 补充 `tts` 权限的 CWS 提交理由说明（`docs/chrome-web-store-listing.md`）
- 通过 `extension-review`/`extension-analyze` 两轮 CWS 合规与安全审计，0 个 Critical/High/Medium 发现
- 完成 Chrome Web Store 开发者账号注册、非交易者身份声明、联系邮箱验证
- 提交审核：分类 Fun，中文列表优先上线，英文列表计划审核通过后补充

---

*格式参考 [Keep a Changelog](https://keepachangelog.com/)，版本号暂未启用严格语义化（发布审核通过后再考虑升到 0.1.0）。*
