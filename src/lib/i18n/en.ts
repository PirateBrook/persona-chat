/**
 * Canonical key set. zh.ts is typed against `Messages` (derived from this
 * file), so a missing or extra key over there is a compile error.
 */
export const en = {
  // ---- persona-message.ts (model-facing wrapper) ----
  "wrap.intro":
    "From now on, please act as the following persona and stay in character for the rest of our conversation:",
  "wrap.scenario": "Scenario:",
  "wrap.example": "Example of how you speak in character:",
  "wrap.ackGreeting": 'When you acknowledge, respond in character with: "{greeting}"',
  "wrap.ackPlain": "Acknowledge briefly in character, then wait for my first question.",

  // ---- use-persona-enrich.ts ----
  "enrich.failed": "Couldn't enrich — try refreshing the page.",
  "enrich.nothingYet": "Nothing to enrich yet.",
  "enrich.nothingNew": "Nothing new — send as-is.",
  "enrich.loreNote.one": "{count} lore note",
  "enrich.loreNote.other": "{count} lore notes",
  "enrich.reminder": "in-character reminder",
  "enrich.added": "Added {parts}. Press Enter to send.",

  // ---- contents/deepseek.tsx ----
  "pill.enrich": "Enrich",

  // ---- PlatformOverlay.tsx (anti-cross-talk guard) ----
  "guard.button": "Guard",
  "guard.reminder":
    "Do not write dialogue, actions, or thoughts for {{user}}. Only speak and act as {{char}}.",

  // ---- lib/macros.ts ----
  "macro.user.default": "User",

  // ---- FloatingButton.tsx ----
  "fab.open": "Open Persona panel",
  "fab.close": "Close Persona panel",

  // ---- common (shared across components) ----
  "common.close": "Close",
  "common.loading": "Loading…",
  "common.active": "Active",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.duplicate": "Duplicate",

  // ---- PersonaPanel.tsx ----
  "panel.deactivate": "Deactivate",
  "panel.updatedTitle": "Extension was updated",
  "panel.updatedBody": "Refresh the page to reconnect — your personas are safe.",
  "panel.refreshPage": "Refresh page",
  "toast.deactivated": "Persona deactivated. Start a new chat for a clean slate.",
  "toast.ready": "Persona ready — press Enter to send.",
  "toast.clipboard": "Copied to clipboard — paste into the chat to activate.",
  "toast.injectFailed": "Couldn't reach the chat input. Try refreshing the page.",

  // ---- ModeTabs.tsx ----
  "tab.personas": "Personas",
  "tab.scenes": "Scenes",
  "tab.tweaks": "Tweaks",

  // ---- PageTweaksPanel.tsx ----
  "tweaks.blurb": "Small DOM tweaks applied directly to the chat page.",
  "tweaks.hideThinking": "Hide reasoning trace",
  "tweaks.hideThinkingDesc": "Collapses DeepSeek's \"Thought for Ns\" block — the final answer still shows.",

  // ---- PersonaList.tsx ----
  "list.searchPlaceholder": "Search personas…",
  "list.emptyTitle": "No personas yet",
  "list.emptyBody": "Create one from the options page.",
  "list.worldInfoTitle.one": "{count} world info entry",
  "list.worldInfoTitle.other": "{count} world info entries",
  "list.apply": "Apply →",
  "list.noMatch": 'No personas match "{query}".',
  "list.pinned": "Pinned",
  "list.recent": "Recent",
  "list.all": "All",
  "list.pin": "Pin to top",
  "list.unpin": "Unpin",

  // ---- BackgroundPicker.tsx ----
  "bg.blurb": "Sets the scene behind the chat. Purely visual — never touches what gets sent.",
  "bg.none": "None",
  "bg.custom.heading": "Your uploads",
  "bg.custom.upload": "Upload image",
  "bg.custom.delete": "Delete this background",
  "bg.custom.uploadFailed": "Couldn't read that image — try a different file.",
  "confirm.deleteBackground": "Delete this background image?",

  // ---- popup.tsx ----
  "popup.activeOn": "Active on supported sites",
  "popup.hint": "Open a supported chat site (chat.deepseek.com or claude.ai) — the Persona button appears bottom-right.",
  "popup.manage": "Manage personas",

  // ---- options.tsx ----
  "options.subtitle": "Your character library · stored locally",
  "options.export": "Export backup",
  "options.import": "Import backup",
  "options.new": "+ New persona",
  "options.copyName": "{name} (copy)",
  "options.listHeading": "Personas ({count})",
  "options.worldInfoCount.one": "📖 {count} world info entry",
  "options.worldInfoCount.other": "📖 {count} world info entries",
  "options.listEmpty": 'No personas yet. Click "+ New persona" to start.',
  "options.editorHeading": "Editor",
  "options.previewHeading": "Preview",
  "field.name": "Name",
  "field.avatar": "Avatar emoji",
  "field.personaPrompt": "Persona prompt (personality)",
  "field.scenario": "Scenario (optional) — the setting/situation",
  "field.exampleDialogue": "Example dialogue (optional) — locks voice/style",
  "field.greeting": "Greeting (optional)",
  "field.driftReminder":
    "In-character reminder (optional) — resurfaces every few enrich-taps to fight drift",
  "field.background": "Background preset (optional)",
  "field.backgroundImage": "Scene background image (optional)",
  "field.backgroundImage.upload": "Upload image",
  "field.backgroundImage.replace": "Replace",
  "field.backgroundImage.hint":
    "Overrides the preset above — applied when you switch to this persona.",
  "placeholder.exampleDialogue": "User: ...\nCharacter: ...",
  "placeholder.keys": "keys, comma, separated",
  "placeholder.loreContent": "Lore to inject when a key matches the draft message",
  "options.worldInfoLabel": 'World Info (optional) — keywords that surface lore on "✨ Enrich"',
  "options.addEntry": "+ Add entry",
  "options.noEntries": "No entries yet.",
  "options.previewEmpty": 'Select a persona to edit, or click "+ New persona".',
  "alert.nameRequired": "Name and Persona prompt are required.",
  "confirm.delete": "Delete this persona?",
  "alert.imported.one": "Imported {count} persona.",
  "alert.imported.other": "Imported {count} personas.",
  "alert.importNone": "No valid personas found in file.",
  "alert.importParseError":
    "Couldn't parse that file — expected a persona-chat JSON export.",
  "select.none": "None",
  "options.backgroundOption": "{label} ({category})",
  "options.language": "Language",
  "options.userName": "Your name (for {{user}})",
  "options.userNamePlaceholder": "User (default)",
  "lang.auto": "Auto (browser)",
  "lang.en": "English",
  "lang.zh": "中文",

  // ---- tag labels ----
  "tag.work": "Work",
  "tag.fun": "Fun",
  "tag.productivity": "Productivity",
  "tag.writing": "Writing",
  "tag.product": "Product",
  "tag.thinking": "Thinking",
  "tag.language": "Language",
  "tag.career": "Career",
  "tag.philosophy": "Philosophy",
  "tag.roleplay": "Roleplay",
  "tag.companion": "Companion",
  "tag.fantasy": "Fantasy",
  "tag.mystery": "Mystery",
  "tag.imagegen": "Image Prompts",
  "tag.creative": "Creative",

  // ---- background preset labels & categories ----
  "bg.bg_slate_focus": "Slate Focus",
  "bg.bg_paper_desk": "Paper Desk",
  "bg.bg_midnight_terminal": "Midnight Terminal",
  "bg.bg_sunset_pop": "Sunset Pop",
  "bg.bg_candy": "Candy",
  "bg.bg_late_night_bar": "Late Night Bar",
  "bg.bg_warm_lamp": "Warm Lamp",
  "bg.bg_diary_pastel": "Diary Pastel",
  "bg.bg_retro_quest": "Retro Quest",
  "bg.bg_deduction_fog": "Deduction Fog",
  "bg.bg_marble_hall": "Marble Hall",
  "bg.bg_zen_ink": "Zen Ink",
  "bgCategory.work": "work",
  "bgCategory.fun": "fun",
  "bgCategory.companion": "companion",
  "bgCategory.roleplay": "roleplay",
  "bgCategory.philosophy": "philosophy",

  // ---- memory ----
  "pill.memory": "Remember",
  "memory.placeholder": "What should I remember?",
  "memory.saved": "Saved",
  "memory.badge": "📌 Memory",
  "memory.badgeHint": "Captured during a chat, not hand-authored",

  // ---- tts ----
  "tts.enable": "Read replies aloud",
  "tts.enableDesc": "Uses your browser's built-in text-to-speech — no network call.",
  "tts.voice": "Voice",
  "tts.systemDefault": "System default",
  "tts.play": "Read last reply aloud",

  // ---- character-card-import ----
  "cardImport.button": "Import character card (chub.ai etc.)",
  "cardImport.creatorLabel": "By {name}",
  "cardImport.portraitHint": "Portrait imported from character card",
  "cardImport.success": 'Imported "{name}".',
  "cardImport.error.unsupported_file": "Only .png and .json character card files are supported.",
  "cardImport.error.no_embedded_data":
    "No character data found in that PNG — expected a chara/ccv3 tEXt chunk.",
  "cardImport.error.invalid_json": "Couldn't parse the character card data as JSON.",
  "cardImport.error.missing_name": "That character card has no name field.",
  "cardImport.error.unknown": "Couldn't import that character card.",
  "cardImport.findMore": "Find more characters ↗",
  "cardImport.findMoreHint":
    "Opens chub.ai in a new tab — a third-party character card community, not affiliated with us. Cards you download there work with \"Import character card\" above.",

  // ---- world info V3 decorators (options.tsx editor + world-info.ts labels) ----
  "worldbook.advanced": "Advanced",
  "worldbook.constant": "Always inject (constant)",
  "worldbook.constantHint":
    "Always injected on every Enrich, regardless of keywords. A description-slot position below also places a copy in the activation message when you apply the persona.",
  "worldbook.position": "Position",
  "worldbook.positionHint":
    "Only affects always-inject entries — which activation-message slot this lore also folds into.",
  "worldbook.position.none": "Default (in enrich block)",
  "worldbook.position.before_desc": "Before persona",
  "worldbook.position.after_desc": "After persona",
  "worldbook.position.personality": "With personality",
  "worldbook.position.scenario": "With scenario",
  "worldbook.position.at_depth": "By depth",
  "worldbook.depth": "Depth",
  "worldbook.depthHint": "Higher sits farther from your draft (ordering only — not chat history).",
  "worldbook.role": "Role label",
  "worldbook.role.default": "None (📖)",
  "worldbook.role.system": "System",
  "worldbook.role.user": "User",
  "worldbook.role.assistant": "Assistant",
  "worldbook.label.system": "⚙️ System note:",
  "worldbook.label.assistant": "🎭 In character:",
} as const
