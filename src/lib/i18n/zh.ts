import type { Messages } from "./index"

export const zh: Messages = {
  // ---- persona-message.ts (model-facing wrapper) ----
  "wrap.intro": "从现在开始，请扮演以下角色，并在我们接下来的整个对话中始终保持这个角色：",
  "wrap.scenario": "场景：",
  "wrap.example": "你在角色中的说话示例：",
  "wrap.ackGreeting": '确认时，请用角色的口吻回应："{greeting}"',
  "wrap.ackPlain": "用角色的口吻简短确认，然后等待我的第一个问题。",

  // ---- use-persona-enrich.ts ----
  "enrich.failed": "增强失败——试试刷新 DeepSeek。",
  "enrich.nothingYet": "暂时没有可增强的内容。",
  "enrich.nothingNew": "没有新增内容——直接发送即可。",
  "enrich.loreNote.one": "{count} 条设定",
  "enrich.loreNote.other": "{count} 条设定",
  "enrich.reminder": "角色提醒",
  "enrich.added": "已加入 {parts}。按回车发送。",

  // ---- contents/deepseek.tsx ----
  "pill.enrich": "增强",

  // ---- FloatingButton.tsx ----
  "fab.open": "打开 Persona 面板",
  "fab.close": "关闭 Persona 面板",

  // ---- common (shared across components) ----
  "common.close": "关闭",
  "common.loading": "加载中…",
  "common.active": "使用中",
  "common.edit": "编辑",
  "common.delete": "删除",
  "common.save": "保存",
  "common.cancel": "取消",

  // ---- PersonaPanel.tsx ----
  "panel.deactivate": "停用",
  "panel.updatedTitle": "扩展已更新",
  "panel.updatedBody": "刷新页面即可重新连接——你的角色都还在。",
  "panel.refreshPage": "刷新页面",
  "toast.deactivated": "角色已停用。开一个新对话即可回到干净状态。",
  "toast.ready": "角色已就绪——按回车发送。",
  "toast.clipboard": "已复制到剪贴板——粘贴到对话框即可激活。",
  "toast.injectFailed": "找不到对话输入框，试试刷新页面。",

  // ---- ModeTabs.tsx ----
  "tab.personas": "角色",
  "tab.scenes": "场景",
  "tab.tweaks": "定制",

  // ---- PageTweaksPanel.tsx ----
  "tweaks.blurb": "直接作用于 DeepSeek 页面本身的一些小改造。",
  "tweaks.hideThinking": "隐藏思考过程",
  "tweaks.hideThinkingDesc": "折叠 DeepSeek 的「已思考」区块——最终回答仍会正常显示。",

  // ---- PersonaList.tsx ----
  "list.searchPlaceholder": "搜索角色…",
  "list.emptyTitle": "还没有角色",
  "list.emptyBody": "去设置页创建一个吧。",
  "list.worldInfoTitle.one": "{count} 条世界设定",
  "list.worldInfoTitle.other": "{count} 条世界设定",
  "list.apply": "应用 →",
  "list.noMatch": "没有匹配「{query}」的角色。",

  // ---- BackgroundPicker.tsx ----
  "bg.blurb": "为对话设置背景氛围。纯视觉效果——绝不影响实际发送的内容。",
  "bg.none": "无",
  "bg.custom.heading": "我的图片",
  "bg.custom.upload": "上传图片",
  "bg.custom.delete": "删除这张背景",
  "bg.custom.uploadFailed": "无法读取这张图片，换一张试试。",
  "confirm.deleteBackground": "确定删除这张背景图片吗？",

  // ---- popup.tsx ----
  "popup.activeOn": "正在 chat.deepseek.com 上使用",
  "popup.hint": "打开 chat.deepseek.com——Persona 按钮会出现在右下角。",
  "popup.manage": "管理角色",

  // ---- options.tsx ----
  "options.subtitle": "你的角色库 · 本地存储",
  "options.export": "导出",
  "options.import": "导入",
  "options.new": "+ 新建角色",
  "options.listHeading": "角色（{count}）",
  "options.worldInfoCount.one": "📖 {count} 条世界设定",
  "options.worldInfoCount.other": "📖 {count} 条世界设定",
  "options.listEmpty": "还没有角色。点击「+ 新建角色」开始。",
  "options.editorHeading": "编辑器",
  "options.previewHeading": "预览",
  "field.name": "名称",
  "field.avatar": "头像 emoji",
  "field.personaPrompt": "角色设定（性格）",
  "field.scenario": "场景（可选）——设定 / 情境",
  "field.exampleDialogue": "示例对话（可选）——锁定语气 / 风格",
  "field.greeting": "开场白（可选）",
  "field.driftReminder": "角色提醒（可选）——每隔几次增强就重现一次，防止角色跑偏",
  "field.background": "背景（可选）",
  "placeholder.exampleDialogue": "用户：……\n角色：……",
  "placeholder.keys": "关键词，用逗号分隔",
  "placeholder.loreContent": "当关键词匹配到草稿内容时注入的设定",
  "options.worldInfoLabel": "世界设定（可选）——在「✨ 增强」时根据关键词浮现的设定",
  "options.addEntry": "+ 添加条目",
  "options.noEntries": "还没有条目。",
  "options.previewEmpty": "选择一个角色进行编辑，或点击「+ 新建角色」。",
  "alert.nameRequired": "名称和角色设定为必填项。",
  "confirm.delete": "确定删除这个角色吗？",
  "alert.imported.one": "已导入 {count} 个角色。",
  "alert.imported.other": "已导入 {count} 个角色。",
  "alert.importNone": "文件中没有找到有效的角色。",
  "alert.importParseError": "无法解析该文件——需要 persona-chat 导出的 JSON 文件。",
  "select.none": "无",
  "options.backgroundOption": "{label}（{category}）",
  "options.language": "语言",
  "lang.auto": "跟随浏览器",
  "lang.en": "English",
  "lang.zh": "中文",

  // ---- tag labels ----
  "tag.work": "工作",
  "tag.fun": "娱乐",
  "tag.productivity": "效率",
  "tag.writing": "写作",
  "tag.product": "产品",
  "tag.thinking": "思辨",
  "tag.language": "语言",
  "tag.career": "职业",
  "tag.philosophy": "哲学",
  "tag.roleplay": "角色扮演",
  "tag.companion": "陪伴",

  // ---- background preset labels & categories ----
  "bg.bg_slate_focus": "石板专注",
  "bg.bg_paper_desk": "纸面书桌",
  "bg.bg_midnight_terminal": "午夜终端",
  "bg.bg_sunset_pop": "落日流行",
  "bg.bg_candy": "糖果",
  "bg.bg_late_night_bar": "深夜酒馆",
  "bg.bg_warm_lamp": "暖灯",
  "bg.bg_diary_pastel": "日记粉彩",
  "bg.bg_retro_quest": "复古冒险",
  "bg.bg_deduction_fog": "推理迷雾",
  "bg.bg_marble_hall": "大理石厅",
  "bg.bg_zen_ink": "禅意水墨",
  "bgCategory.work": "工作",
  "bgCategory.fun": "娱乐",
  "bgCategory.companion": "陪伴",
  "bgCategory.roleplay": "角色扮演",
  "bgCategory.philosophy": "哲学",

  // ---- memory ----
  "pill.memory": "记住",
  "memory.placeholder": "要记住点什么？",
  "memory.saved": "已保存",
  "memory.badge": "📌 记忆",
  "memory.badgeHint": "在对话中随手记下的，不是手写设定"
}
