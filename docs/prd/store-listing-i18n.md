# PRD: Chrome Web Store 商店列表国际化（0.3.0）

## 背景

0.2.0 提审时发现：Developer Dashboard 的"语言"下拉框只是单一语言的声明性元数据，不是多语言内容编辑器。切换语言不会给出一份独立的可编辑内容区。经核实官方文档（见"调研依据"），根本原因是：**这个扩展包从未做过 `chrome.i18n` 国际化**（没有 `_locales` 目录），所以 Dashboard 检测不到这个扩展"支持多语言"，语言下拉框自然锁死在单一语言。

## 一句话

给扩展包加上标准的 Chrome `chrome.i18n` 国际化支持（`_locales/en`、`_locales/zh_CN`），让 Developer Dashboard 的语言下拉框真正解锁"中文"选项，之后才能在 Dashboard 里为中文单独填一份完整的商店列表内容（标题摘要/详细描述/截图）。

## 调研依据（已用 WebFetch 核实官方文档，不是凭空写的）

- Chrome 官方文档（`developer.chrome.com/docs/webstore/cws-dashboard-listing`）：「If you have localized your extension, you will be able to provide a description, screenshots, and promotional video in the locales your extension supports」——多语言 store listing 的前提是扩展本身已经 i18n 化。
- Chrome 官方 i18n 参考（`developer.chrome.com/docs/extensions/reference/i18n`）：
  - 扩展包一旦有 `/_locales` 目录，manifest 就**必须**声明 `default_locale`。
  - `_locales/<lang>/messages.json` 格式：`{"key": {"message": "...", "description": "..."}}`。
  - manifest 里用 `__MSG_key__` 占位符引用，Chrome 在加载时解析替换——**仅加 messages.json 文件不够**，manifest 的 `name`/`description` 必须改成 `__MSG_*__` 占位符形式，Dashboard 才会认为这个扩展真正支持了该语言。
- Plasmo 框架文档（`docs.plasmo.com/framework/locales`）确认了本项目具体落地方式：
  - locale 文件放 `/locales/{lang}/messages.json`（项目根目录，Plasmo 自动打包进构建产物的 `_locales/`）。
  - `package.json` 顶层 `displayName`/`description` 改成 `"__MSG_extensionName__"`/`"__MSG_extensionDescription__"`。
  - `default_locale` 配置在 `package.json` 的 `manifest` 对象里：`"manifest": { "default_locale": "en" }`。
  - Chrome 简体中文的标准 locale code 是 `zh_CN`（不是 `zh`）——用错会导致 Dashboard/Chrome 都识别不到这个语言。

## Compatibility Checklist（四条硬约束）

- **零成本**：纯打包元数据变更，不涉及任何网络请求/API。✅
- **可见注入兼容**：不涉及注入机制，零改动。✅
- **CWS 过审安全**：不新增权限、不新增 host、不改变功能行为，只影响 manifest 里 name/description 的解析方式。✅
- **适配层隔离**：不涉及 PlatformAdapter。✅

无红线，直接过。

## 范围（明确排除的部分，避免和现有架构冲突）

**这个改动只影响扩展包的 manifest 层级 i18n（`chrome.i18n`），不改动应用内 UI 的现有 i18n 方案**（现有 `src/lib/i18n/{en,zh}.ts` + `useI18n()` 纯 TS 字典机制保持不变，这是已确认的产品决策，二者是完全独立的两层：manifest 层影响的是 `chrome://extensions` 页面显示的扩展名/描述、以及 CWS 商店列表能否解锁多语言；应用内 UI 层影响的是面板/选项页里用户看到的文案）。

## 落地内容

1. 新增 `locales/en/messages.json`：
   ```json
   {
     "extensionName": { "message": "Persona.chat", "description": "Extension display name." },
     "extensionDescription": { "message": "Give DeepSeek, Claude, or ChatGPT a roleplay persona — a bar owner, a talking cat & more. 100% free, no chat data uploaded, no API key.", "description": "Short store listing description (EN)." }
   }
   ```
2. 新增 `locales/zh_CN/messages.json`：
   ```json
   {
     "extensionName": { "message": "Persona.chat", "description": "扩展显示名称。" },
     "extensionDescription": { "message": "给 DeepSeek、Claude 或 ChatGPT 装上「深夜小酒馆的老板」「不讲逻辑的猫」等角色扮演人设——完全免费、不上传聊天记录、无需 API Key。", "description": "商店简短描述（中文）。" }
   }
   ```
   （两个文件里的 `extensionDescription` 文案直接取自 `docs/chrome-web-store-listing.md` 里已经写好的英文/中文 Short description 段落，不要重新措辞。）
3. `package.json` 改动：
   - 顶层 `displayName` → `"__MSG_extensionName__"`
   - 顶层 `description` → `"__MSG_extensionDescription__"`
   - `manifest` 对象加一个字段 `"default_locale": "en"`
   - （如果实测发现 Plasmo 需要 `manifest.name` 也显式设成 `"__MSG_extensionName__"` 才能正确生成 manifest.json，一并加上——用实际构建结果验证，不要只凭文档假设。）

## 验收标准（可测，对应 pc-test 的验证手段）

1. `npx tsc --noEmit` + `pnpm build` 干净。
2. `pnpm package` 产出的 `build/chrome-mv3-prod.zip` 解压后：
   - 存在 `_locales/en/messages.json` 和 `_locales/zh_CN/messages.json`，内容与上面一致。
   - `manifest.json` 里 `default_locale` 是 `"en"`；`name`/`description` 字段是**字面量** `"__MSG_extensionName__"`/`"__MSG_extensionDescription__"`（这是预期行为——Chrome 在加载时才解析替换，不是构建时替换，打包产物里看到占位符字符串本身就是正确的）。
3. 真机验证（必须做，光看 zip 里的占位符不够，要证明 Chrome 真的能正确解析）：把构建产物作为"已解压的扩展程序"加载进真实 Chrome，打开 `chrome://extensions`，确认显示的名称是 **"Persona.chat"**（不是字面量 `__MSG_extensionName__`）——这是证明 `__MSG_*__` 解析链路真的工作的唯一方式。
4. 确认 `.claude/skills/pc-publish/scripts/package-and-verify.sh` 里"packaged manifest disagrees with package.json"这条交叉核对逻辑改动后依然成立（package.json 的 `description` 字段现在也是字面量 `"__MSG_extensionDescription__"`，跟打包产物里的 manifest.description 应该还是字符串相等，理论上不用改这个脚本，但要跑一遍确认真的过）。
5. 版本号升到 `0.3.0`，`CHANGELOG.md` 补一条记录这次改动。

## 后续（不在这个 PRD 范围内，验收过了之后单独做）

验收通过、打包验证过之后，去 Developer Dashboard 手动操作（`pc-publish` §4 的手动步骤）：语言下拉框应该能选出"中文"，切过去后针对中文单独填一份完整的详细描述（内容已经在 `docs/chrome-web-store-listing.md` 里准备好），这部分是人工 Dashboard 操作，不是这次代码改动的验收范围。
