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
 * The Swedish UI text: machine-drafted, not yet reviewed by a native speaker. The type makes
 * `npm run typecheck` fail when a key from `en.ts` is missing here or one is added that
 * `en.ts` does not have.
 */
import type { en } from "./en";

export const sv: Record<keyof typeof en, string> = {
  // Shared
  close: "Stäng",
  cancel: "Avbryt",
  addToMessage: "Lägg till i meddelandet",
  labelField: "Etikett:",
  symbolFallback: "Symbol",
  symbolAdded: "{{label}} har lagts till i meddelandet",
  unavailable: "{{label}} är inte tillgänglig",
  back: "Tillbaka",
  and: "och",

  // Top bar and dialogs
  toolbarSearch: "Lägg till symbol i meddelandet",
  toolbarSvg: "Lägg till symbol med SVG-byggsträng",
  toolbarSettings: "Inställningar",
  toolbarAboutMe: "Om mig",
  dialogDismiss: "Stäng dialogrutan",
  messagePreview: "Meddelandet hittills",
  aiBadge: "AI",
  aiSuggestion: "AI-förslag, {{text}}",

  // Symbol search
  searchFindWord: "Sök ett ord:",
  searchSubmit: "Sök",
  searchClear: "Rensa",
  searchNoSelection: "Välj en symbol först",
  searchPlaceholder: "Sök på glosa",
  searchSelected: "✓ vald",
  searchNoneFound: "Inga symboler hittades för \"{{text}}\"",
  searchFoundOne: "1 symbol hittades för \"{{text}}\"",
  searchFoundMany: "{{total}} symboler hittades för \"{{text}}\"",
  searchTooMany: "{{total}} symboler hittades för \"{{text}}\". De första {{max}} visas; förfina sökningen.",

  // SVG-builder string entry
  svgBuilderString: "Byggsträng:",
  svgInvalid: "Ogiltig byggsträng",

  // Clear saved data
  clearConfirm: "Rensa",
  clearQuestion: "Detta raderar alla meddelanden och Om mig-anteckningar du har sparat, och meddelandet du skriver nu. Det går inte att ångra.",
  clearFailed: "Sparade data kunde inte rensas. Webbläsaren låter inte appen använda sin lagring.",

  // Input area
  inputArea: "Inmatningsområde",
  cursorBackward: "bakåt",
  cursorForward: "framåt",
  cursorStart: "markören till början",
  cursorEnd: "markören till slutet",
  indicatorLoading: "{{label}} hämtar ny etikett",

  // Switch scanning
  scanExitRow: "Lämna raden",

  // AI and storage status
  noModels: "Inga modeller finns. Starta Ollama för att använda AI-funktionerna.",
  hosted: "AI-funktionerna finns bara i skrivbordsversionen.",
  notSaved: "Inget sparas på den här datorn. Om du laddar om sidan försvinner dina data.",

  // Settings dialog
  settingsSave: "Spara och stäng",
  settingsModelNote: "Starta Ollama för att använda detta.",
  settingsFailed: "Inställningarna kunde inte sparas. Webbläsaren låter inte appen använda sin lagring.",
  settingsDependentNote: "Slå på \"{{label}}\" för att använda detta.",
  settingGroupGeneral: "Allmänt",
  settingGroupSymbolEntry: "Symbolinmatning",
  settingGroupWordPrediction: "Ordförslag",
  settingGroupSentences: "Meningar",
  settingGroupIndicatorLabels: "Indikatoretiketter",
  settingLanguage: "Språk",
  settingSpeakEachSymbol: "Läs upp varje symbol när jag lägger till den",
  settingMarkAi: "Markera AI-förslag",
  settingBackquote: "Gå tillbaka med tangenten grav accent (`)",
  settingSwitchScanning: "Använd radskanning med två kontakter",
  settingMessagesToRemember: "Meddelanden att komma ihåg",
  settingShowSearch: "Visa \"Lägg till symbol i meddelandet\"",
  settingShowSvg: "Visa inmatning av SVG-byggsträng",
  settingWordSuggestion: "Slå på ordförslag",
  settingSuggestionsToShow: "Antal förslag att visa",
  settingAskModelWords: "Fråga AI-modellen om förslag",
  settingSentenceChoices: "Antal meningsförslag",
  settingShowBlissSentence: "Visa blissymboler ovanför varje mening",
  settingAskModelIndicator: "Fråga AI-modellen när ingen etikett hittas",

  // Erase all app data
  eraseLabel: "Radera alla appdata och avsluta",
  eraseQuestion: "Detta raderar alla meddelanden, inställningar och Om mig-anteckningar du har sparat, och avslutar sedan. Det går inte att ångra.",
  eraseNote: "Gör detta innan du tar bort appen: när appen är borta går det inte längre att nå dessa data.",
  eraseConfirm: "Radera och avsluta",
  eraseFailed: "Data kunde inte raderas. Stäng andra flikar som visar Adaptive Palette och försök igen.",
  eraseDone: "Allt har raderats. Du kan stänga fönstret och ta bort appen.",
  erasePending: "Raderar allt nu. Det går inte att stoppa när det har börjat.",

  // First-run setup
  setupTitle: "Konfigurera AI-funktionerna",
  setupNoOllama: "AI-funktionerna behöver Ollama, som inte körs på den här datorn. Installera och starta det, och välj sedan Försök igen.",
  setupInstall: "Installera Ollama",
  setupRetry: "Försök igen",
  setupDownload: "Ladda ner",
  setupContinue: "Fortsätt utan AI-funktioner",
  setupPullFailed: "Nedladdningen blev inte klar. Kontrollera att Ollama fortfarande körs och försök igen.",
  setupProgress: "Laddar ner {{models}}",
  setupMissingModel: "AI-funktionerna behöver {{models}}, som Ollama inte har ännu. Det är en stor nedladdning som bara behöver göras en gång.",
  setupPercent: "{{percent}} % nedladdat",

  // Word prediction
  predictedWords: "Förslag på nästa ord",
  predictionQuerying: "⏳ Hämtar fler ordförslag…",
  predictionMoreOne: "1 ordförslag till",
  predictionMoreMany: "{{count}} ordförslag till",
  predictionNotConfigured: "Ordförslag från modellen är inte konfigurerade. Kontrollera avsnittet wordPrediction i config.json.",

  // About Me
  aboutMeNotesHeading: "Dina anteckningar",
  aboutMeLearntHeading: "Vad systemet har lärt sig",
  aboutMeDismissedHeading: "Förslag du har avböjt",
  aboutMeSuggest: "Föreslå uppdateringar",
  aboutMeCategory: "Kategori",
  aboutMeNote: "Anteckning",
  aboutMeAddNote: "Lägg till anteckning",
  aboutMeEdit: "Ändra",
  aboutMeEditCategory: "Ändra kategori",
  aboutMeEditNote: "Ändra anteckning",
  aboutMeDelete: "Ta bort",
  aboutMeSave: "Spara",
  aboutMeAccept: "Godta",
  aboutMeReject: "Avböj",
  aboutMeRestore: "Lägg tillbaka",
  aboutMeSubtitle: "Vad Adaptive Palette vet om dig.",
  aboutMeAdded: "Tillagd",
  aboutMeNoNotes: "Inga anteckningar än.",
  aboutMeNothingLearnt: "Inget inlärt än.",
  aboutMeNothingDismissed: "Inget avböjt än.",
  aboutMeWorking: "Läser dina meddelanden…",
  aboutMeNothingNew: "Inget nytt att föreslå.",
  aboutMeLearntUpTo: "Inlärt från dina meddelanden fram till {{date}}.",
  aboutMeMoreWaiting: "Fler meddelanden väntar. Välj Föreslå uppdateringar igen.",
  aboutMeNoNewMessages: "Det finns inga nya meddelanden att lära sig av.",
  aboutMeReviewOne: "1 förslag att granska.",
  aboutMeReviewMany: "{{count}} förslag att granska.",
  aboutMeNotConfigured: "Förslag för Om mig är inte konfigurerade. Kontrollera avsnittet aboutMe i config.json.",
  factFamily: "Familj",
  factBackground: "Bakgrund",
  factPreferences: "Önskemål",
  factCommunicationStyle: "Kommunikationsstil",
  factOther: "Övrigt",

  // Sentences
  sentenceNotConfigured: "Meningsöversättning är inte konfigurerad. Kontrollera avsnittet telegraphicTranslation i config.json.",
  sentenceNoSentences: "Modellen gav inga användbara meningar.",
  sentenceWorking: "⏳ Skapar meningar…",
  sentenceMakingMore: "⏳ Skapar fler meningar…",
  sentenceCannotComplete: "⚠ Kunde inte skapa meningar. Försök igen.",
  sentenceTypeYours: "Passar inget? Skriv din egen",
  sentenceSpeak: "Läs upp",
  sentenceDone: "✓ Klar",
  sentenceDoneSpoken: "Klar",
  discardWorking: "En mening skapas fortfarande. Om du ändrar meddelandet avbryts det. Ändra ändå?",
  discardReady: "Om du ändrar meddelandet tas meningarna bort. Ändra ändå?",
  discardTitle: "Ändra meddelandet?",
  discardChangeAnyway: "Ändra ändå",
  discardKeep: "Behåll meningarna",

  // Message attributes
  attributeIntent: "Avsikt",
  attributeTone: "Ton",
  attributeFeeling: "Känsla",
  attributePriority: "Prioritet",
  attributeOn: "{{name}}, på",
  attributeOff: "{{name}}, av",
  attributeRemove: "Ta bort {{name}}"
};
