/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

/**
 * The English UI text. Its keys are the list every other language must match: `sv.ts` is
 * typed against this object, so `npm run typecheck` fails on a missing or extra key.
 *
 * `{{name}}` is a placeholder that `t()` fills.
 */
export const en = {
  // Shared
  close: "Close",
  cancel: "Cancel",
  addToMessage: "Add to message",
  labelField: "Label:",
  symbolFallback: "Symbol",
  symbolAdded: "{{label}} added to message",
  unavailable: "{{label}} unavailable",
  back: "Back",
  and: "and",

  // Top bar and dialogs
  toolbarSearch: "Add Symbol to Message",
  toolbarSvg: "Add Symbol by SVG-Builder String",
  toolbarSettings: "Adjust Settings",
  toolbarAboutMe: "About Me",
  dialogDismiss: "Close dialog", // distinct from the footer "Close", so the two have different accessible names
  messagePreview: "Message so far",
  aiBadge: "AI",
  aiSuggestion: "AI suggestion, {{text}}",

  // Symbol search
  searchFindWord: "Find a word:",
  searchSubmit: "Search",
  searchClear: "Clear",
  searchNoSelection: "Select a symbol first",
  searchPlaceholder: "Search by gloss",
  searchSelected: "✓ selected",
  searchNoneFound: "No symbols found for \"{{text}}\"",
  searchFoundOne: "1 symbol found for \"{{text}}\"",
  searchFoundMany: "{{total}} symbols found for \"{{text}}\"",
  searchTooMany: "{{total}} symbols found for \"{{text}}\". Showing the first {{max}}; refine your search.",

  // SVG-builder string entry
  svgBuilderString: "Builder string:",
  svgInvalid: "Invalid builder string",

  // Clear saved data
  clearConfirm: "Clear",
  clearQuestion: "This deletes every message and About Me note you have saved, and the message you are writing now. It cannot be undone.",
  clearFailed: "The saved data could not be cleared. This browser is not letting the app use its storage.",

  // Input area
  inputArea: "Input Area",
  cursorBackward: "backward",
  cursorForward: "forward",
  cursorStart: "move cursor to start",
  cursorEnd: "move cursor to end",
  indicatorLoading: "{{label}} loading new label",

  // Switch scanning
  scanExitRow: "Exit row",

  // AI and storage status
  noModels: "No models available. Start Ollama to enable AI features.",
  hosted: "AI features are available only in the desktop version.",
  notSaved: "Nothing is saved on this computer. Reloading the page clears your data.",

  // Settings dialog
  settingsSave: "Save and close",
  settingsModelNote: "Start Ollama to use this.",
  settingsFailed: "The settings could not be saved. This browser is not letting the app use its storage.",
  settingsDependentNote: "Turn on \"{{label}}\" to use this.",
  settingGroupGeneral: "General",
  settingGroupSymbolEntry: "Symbol entry",
  settingGroupWordPrediction: "Word prediction",
  settingGroupSentences: "Sentences",
  settingGroupIndicatorLabels: "Indicator labels",
  settingLanguage: "Language",
  settingSpeakEachSymbol: "Speak each symbol as I add it",
  settingMarkAi: "Mark AI suggestions",
  settingBackquote: "Go back with the backquote (`) key",
  settingSwitchScanning: "Use two-switch row scanning",
  settingMessagesToRemember: "Messages to remember",
  settingShowSearch: "Show \"Add Symbol to Message\"",
  settingShowSvg: "Show SVG-builder string entry",
  settingWordSuggestion: "Enable word suggestion",
  settingSuggestionsToShow: "Suggestions to show",
  settingAskModelWords: "Ask the AI model for suggestions",
  settingSentenceChoices: "Sentence choices to offer",
  settingShowBlissSentence: "Show Bliss symbols above each sentence",
  settingAskModelIndicator: "Ask the AI model when no label is found",

  // Erase all app data
  eraseLabel: "Erase all app data and quit",
  eraseQuestion: "This deletes every message, setting and About Me note you have saved, and then quits. It cannot be undone.",
  eraseNote: "Do this before deleting the app: once the app is gone there is no way left to reach this data.",
  eraseConfirm: "Erase and quit",
  eraseFailed: "The data could not be erased. Close any other tab showing Adaptive Palette, then try again.",
  eraseDone: "Everything has been erased. You can close this window and delete the app.",
  erasePending: "Erasing everything now. This cannot be stopped once it has started.",

  // First-run setup
  setupTitle: "Set up the AI features",
  setupNoOllama: "The AI features need Ollama, which is not running on this computer. Install it, start it, then choose Try again.",
  setupInstall: "Install Ollama",
  setupRetry: "Try again",
  setupDownload: "Download",
  setupContinue: "Continue without AI features",
  setupPullFailed: "The download did not finish. Check that Ollama is still running, then try again.",
  setupProgress: "Downloading {{models}}",
  setupMissingModel: "The AI features need {{models}}, which Ollama has not got yet. It is a large download and only has to be done once.",
  setupPercent: "{{percent}}% downloaded",

  // Word prediction
  predictedWords: "Suggested next words",
  predictionQuerying: "⏳ Querying more word suggestions…",
  predictionMoreOne: "1 more word suggestion",
  predictionMoreMany: "{{count}} more word suggestions",
  predictionNotConfigured: "Model-backed word prediction is not configured. Check the wordPrediction section of config.json.",

  // About Me
  aboutMeNotesHeading: "Your notes",
  aboutMeLearntHeading: "What the system has learnt",
  aboutMeDismissedHeading: "Suggestions you turned down",
  aboutMeSuggest: "Suggest updates",
  aboutMeCategory: "Category",
  aboutMeNote: "Note",
  aboutMeAddNote: "Add note",
  aboutMeEdit: "Edit",
  aboutMeEditCategory: "Change category",
  aboutMeEditNote: "Change note",
  aboutMeDelete: "Delete",
  aboutMeSave: "Save",
  aboutMeAccept: "Accept",
  aboutMeReject: "Reject",
  aboutMeRestore: "Add back",
  aboutMeSubtitle: "What Adaptive Palette knows about you.",
  aboutMeAdded: "Added",
  aboutMeNoNotes: "No notes yet.",
  aboutMeNothingLearnt: "Nothing learnt yet.",
  aboutMeNothingDismissed: "Nothing turned down yet.",
  aboutMeWorking: "Reading your messages…",
  aboutMeNothingNew: "Nothing new to suggest.",
  aboutMeLearntUpTo: "Learnt from your messages up to {{date}}.",
  aboutMeMoreWaiting: "More messages are waiting. Choose Suggest updates again.",
  aboutMeNoNewMessages: "There are no new messages to learn from.",
  aboutMeReviewOne: "1 suggestion to review.",
  aboutMeReviewMany: "{{count}} suggestions to review.",
  aboutMeNotConfigured: "About Me suggestions are not configured. Check the aboutMe section of config.json.",
  factFamily: "Family",
  factBackground: "Background",
  factPreferences: "Preferences",
  factCommunicationStyle: "Communication style",
  factOther: "Other",

  // Sentences
  sentenceNotConfigured: "Sentence translation is not configured. Check the telegraphicTranslation section of config.json.",
  sentenceNoSentences: "The model returned no usable sentences.",
  sentenceWorking: "⏳ Making sentences…",
  sentenceMakingMore: "⏳ Making more sentences…",
  sentenceCannotComplete: "⚠ Could not make sentences. Try again.",
  sentenceTypeYours: "None fit? Type yours",
  sentenceSpeak: "Speak",
  sentenceDone: "✓ Done",
  sentenceDoneSpoken: "Done",
  discardWorking: "Still making a sentence. Changing your message will stop it. Change anyway?",
  discardReady: "Changing your message will remove the sentences. Change anyway?",
  discardTitle: "Change your message?",
  discardChangeAnyway: "Change anyway",
  discardKeep: "Keep sentences",

  // Message attributes
  attributeIntent: "Intent",
  attributeTone: "Tone",
  attributeFeeling: "Feeling",
  attributePriority: "Priority",
  attributeOn: "{{name}}, on",
  attributeOff: "{{name}}, off",
  attributeRemove: "Remove {{name}}"
};
