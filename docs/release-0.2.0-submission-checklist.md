# 0.2.0 上线清单（Chrome Web Store 开发者后台手动操作）

这是给你在 [Chrome Web Store 开发者后台](https://chrome.google.com/webstore/devconsole) 手动操作用的清单——我没有开发者后台的登录/API 访问权限，这一步只能你自己做。清单按操作顺序排，每一步注明素材在哪、该填什么。

---

## 0. 前置确认

- [ ] PR [#3](https://github.com/PirateBrook/persona-chat/pull/3)（0.2.0 全部改动）已经合并进 `main`。**这一步我没有自动做**——你之前选的是"现在提 PR，不自动合并"，需要你自己审完点 merge。
- [ ] 合并后本地切到 main 并拉最新：
  ```bash
  git checkout main && git pull origin main
  ```
- [ ] 确认 `package.json` 里 `version` 是 `0.2.0`（已经改好，合并后会带过去）。

## 1. 打包

```bash
pnpm install   # 确保依赖是最新的
pnpm package   # 等价于 plasmo package，产出可直接上传的 zip
```
产出物在 `build/chrome-mv3-prod.zip`（Plasmo 默认路径，具体文件名跑完看终端输出确认）。

- [ ] 打包前跑一遍 `npx tsc --noEmit` + `pnpm build` 确认干净（这两步我已经跑过，但你本地环境可能有 pnpm-lock 差异，建议自己再跑一次保险）。

## 2. 开发者后台 —— 更新已有 listing

因为这是**更新**（不是首次提交，`[0.0.1]` 那次已经是首次提交），流程是：

1. 登录 [Chrome Web Store 开发者后台](https://chrome.google.com/webstore/devconsole)，选中 Persona.chat 这个已有条目。
2. **Package** 标签页 → 上传第 1 步产出的 zip，替换旧版本。
3. **Store listing** 标签页 → 更新以下字段（内容全部在 `docs/chrome-web-store-listing.md`，直接复制粘贴即可）：
   - Short description（≤132 字符）：英文/中文两个版本都要更新（英文改了"a bar owner..."那句，中文加了"或 ChatGPT"）。
   - Detailed description：英文/中文都改了，三处提到平台数量的地方都从"两个"变成"三个"。
   - **截图**：这轮 ChatGPT 的截图还没拍（`screenshot-7`/`screenshot-8`，见 `docs/chrome-web-store-listing.md` 的 Assets checklist），**你可以先用现有的 6 张（DeepSeek×4 + Claude×2）提交这次更新，截图不是提审的硬性阻塞项**——CWS 不会因为截图没覆盖到新平台就拒审，只是不够完整。等 ChatGPT 截图后续补上时，可以再提一次小版本更新截图，不用现在卡住。
4. **Privacy practices** 标签页（这是一个独立于 hosted privacy policy 链接的表单，每次改了权限通常需要重新确认）：
   - 因为这次**新增了一个 host permission**（`https://chatgpt.com/*`），大概率会触发 CWS 要求你重新过一遍这个 disclosure 表单。
   - 数据使用类别：跟之前一样勾"不收集用户数据"（personas/世界书/背景图全部只在 `chrome.storage.local`，零网络请求——`extension-review-report.md` 里已经重新核实过一遍）。
   - Privacy policy URL：`https://github.com/PirateBrook/persona-chat/blob/main/PRIVACY.md`（不用改，内容没变）。
5. **Permissions justification**（提交表单里通常会让你逐条解释权限，尤其是新增的）：直接用 `docs/chrome-web-store-listing.md` 里"Permission justifications"这一节的英文原文，`chatgpt.com` 那条已经更新成三个 host 一起写的版本。

## 3. 提交前最后自查

- [ ] 三个平台（DeepSeek/Claude.ai/ChatGPT）里，至少手动开一次真实登录会话确认扩展图标能点开、人设能应用——这轮我已经用 browser-cdp 在真机上全部验证过（`docs/prd/chatgpt-adapter.md` 第 8 节），但提交前你自己肉眼过一遍最稳。
- [ ] 确认 `extension-review-report.md`（本轮新产出，根目录）里没有遗留的 Critical/High/Medium——当前结论是 0 个。
- [ ] Version 字段确认显示 `0.2.0`（后台通常会自动从 manifest 读取，不用手填）。

## 4. 提交审核

- [ ] 点 **Submit for review**。
- [ ] CWS 审核通常几小时到几天不等。**新增了一个 host permission 这件事本身可能会让这次审核比纯功能更新稍微慢一点**（历史上新增权限的更新有时会被人工复核），如果审核时间明显变长或被拒，把拒信内容发给我，我可以帮你对照 `extension-review-report.md`/`docs/chrome-web-store-listing.md` 分析原因。

## 5. 提交后

- [ ] 审核通过后，在 GitHub 上给这次发布打个 tag（可选，但方便以后追溯）：
  ```bash
  git tag v0.2.0 && git push origin v0.2.0
  ```
- [ ] 更新 memory / 告诉我审核结果，我会记到项目备忘录里，供下一轮迭代参考（比如"新增权限的审核平均要多久"这类经验值，对下次加第四个平台有用）。

---

**关于 ChatGPT 截图这个已知缺口**：`docs/chrome-web-store-listing.md` 的 Assets checklist 里已经标成待办，包含了下次要做的两张截图规格（1280×800，需要先把侧边栏真实聊天记录遮掉，跟当初处理 DeepSeek/Claude 截图隐私问题的流程一样）。这不影响这次能不能提审，只是商店页面视觉上还没体现第三个平台，随时可以单独补一次小更新。
