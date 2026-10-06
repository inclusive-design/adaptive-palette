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
 * The settings the user may change from within the app, and the reading and writing of
 * their choices in storage.
 *
 * The prompts and model names in `config.json` are deliberately absent: they are not
 * something to edit in a dialog, and leaving them out means the store cannot carry them
 * at all.
 */
import type { AdaptivePaletteConfigType } from "../../index.d";
import { getStorage } from "../../core/StorageBackend";
import { isPrompt } from "../../core/Config";
import { LANGUAGES, LANGUAGE_NAMES, type StringKey } from "../../i18n/I18n";

export type SettingValueType = boolean | number | string;

export type SettingDescriptorType = {
  path: string[],          // where the value lives in the config object
  kind: "boolean" | "number" | "choice",
  label: StringKey,        // the text shown in the dialog
  group: StringKey,        // the heading it sits under
  min?: number,            // numbers only
  choices?: { value: string, text: string }[],  // choices only: each value and its text
  // Useless without a model Ollama can serve, and without prompts in its own section.
  requiresModel?: boolean,
  // Greyed out without a model, like `requiresModel`, but needs no prompts of its own.
  usesModelOutput?: boolean,
  enabledBy?: string       // the key of the switch that turns this setting off with it
};

/*
 * Groups are rendered in the order their first descriptor appears, so this array is the
 * only place the dialog's ordering lives.
 */
export const SETTING_DESCRIPTORS: SettingDescriptorType[] = [
  {
    path: ["language"], kind: "choice", label: "settingLanguage", group: "settingGroupGeneral",
    choices: LANGUAGES.map((code) => ({ value: code, text: LANGUAGE_NAMES[code] }))
  },
  {
    path: ["announceSymbolOnInput"], kind: "boolean",
    label: "settingSpeakEachSymbol", group: "settingGroupGeneral"
  },
  {
    path: ["markAiSuggestions"], kind: "boolean", usesModelOutput: true,
    label: "settingMarkAi", group: "settingGroupGeneral"
  },
  {
    path: ["backquoteGoesBack"], kind: "boolean",
    label: "settingBackquote", group: "settingGroupGeneral"
  },
  {
    path: ["switchScanning", "enabled"], kind: "boolean",
    label: "settingSwitchScanning", group: "settingGroupGeneral"
  },
  {
    path: ["maxRecalledRecords"], kind: "number", min: 0,
    label: "settingMessagesToRemember", group: "settingGroupGeneral"
  },
  {
    path: ["symbolSearch", "show"], kind: "boolean",
    label: "settingShowSearch", group: "settingGroupSymbolEntry"
  },
  {
    path: ["svgBuilderString", "show"], kind: "boolean",
    label: "settingShowSvg", group: "settingGroupSymbolEntry"
  },
  {
    path: ["wordPrediction", "show"], kind: "boolean",
    label: "settingWordSuggestion", group: "settingGroupWordPrediction"
  },
  {
    path: ["wordPrediction", "maxSuggestions"], kind: "number", min: 1,
    enabledBy: "wordPrediction.show",
    label: "settingSuggestionsToShow", group: "settingGroupWordPrediction"
  },
  {
    path: ["wordPrediction", "enableModelQuery"], kind: "boolean", requiresModel: true,
    enabledBy: "wordPrediction.show",
    label: "settingAskModelWords", group: "settingGroupWordPrediction"
  },
  {
    path: ["telegraphicTranslation", "numSentences"], kind: "number", min: 1, requiresModel: true,
    label: "settingSentenceChoices", group: "settingGroupSentences"
  },
  {
    path: ["telegraphicTranslation", "showBlissSentence"], kind: "boolean", requiresModel: true,
    label: "settingShowBlissSentence", group: "settingGroupSentences"
  },
  {
    path: ["indicatorLabelLookup", "useModelQueryFallback"], kind: "boolean", requiresModel: true,
    label: "settingAskModelIndicator", group: "settingGroupIndicatorLabels"
  }
];

/**
 * The JavaScript type of a setting's value.
 * @param {SettingDescriptorType} descriptor - The setting.
 * @returns {string}
 */
const valueType = (descriptor: SettingDescriptorType): string =>
  descriptor.kind === "choice" ? "string" : descriptor.kind;

/**
 * The key a setting is stored under, and the key the dialog's form state uses.
 * @param {SettingDescriptorType} descriptor - The setting.
 * @returns {string} - The path, dot separated.
 */
export function settingKey (descriptor: SettingDescriptorType): string {
  return descriptor.path.join(".");
}

/**
 * The object holding a setting, or `undefined` when its section is absent -- which is what
 * `telegraphicTranslation` is whenever the section is unconfigured.
 * @param {object} config - The configuration to look in.
 * @param {string[]} path - Where the setting lives.
 * @returns {Record<string, unknown> | undefined}
 */
function parentOf (config: object, path: string[]): Record<string, unknown> | undefined {
  let node: unknown = config;
  for (const key of path.slice(0, -1)) {
    if (!node || typeof node !== "object") {
      return undefined;
    }
    node = (node as Record<string, unknown>)[key];
  }
  return node && typeof node === "object" ? node as Record<string, unknown> : undefined;
}

/**
 * The value a setting currently holds, or `undefined` when the config does not carry it.
 * A setting the config has no value for is left out of the dialog: the user cannot supply
 * the rest of an unconfigured section from there.
 * @param {AdaptivePaletteConfigType} config - The configuration to read.
 * @param {SettingDescriptorType} descriptor - The setting.
 * @returns {SettingValueType | undefined}
 */
export function currentValue (
  config: AdaptivePaletteConfigType, descriptor: SettingDescriptorType
): SettingValueType | undefined {
  const parent = parentOf(config, descriptor.path);
  const value = parent?.[descriptor.path[descriptor.path.length - 1]];
  return typeof value === valueType(descriptor) ? value as SettingValueType : undefined;
}


/**
 * Whether a setting is one to offer in the dialog, and one a stored override may set.
 *
 * A setting the config carries no value for is left out: the user cannot supply the rest of
 * an unconfigured section from the dialog.  A model-backed setting is left out as well when
 * its section has no prompts, whether because `config.json` never configured it or because
 * the section was malformed and fell back to a default: switching it on would only buy an
 * empty query.
 * @param {AdaptivePaletteConfigType} config - The configuration to read.
 * @param {SettingDescriptorType} descriptor - The setting.
 * @returns {boolean}
 */
export function isOffered (
  config: AdaptivePaletteConfigType, descriptor: SettingDescriptorType
): boolean {
  if (currentValue(config, descriptor) === undefined) {
    return false;
  }
  if (descriptor.requiresModel !== true) {
    return true;
  }
  const section = parentOf(config, descriptor.path);
  return isPrompt(section?.systemPrompt) && isPrompt(section?.userPrompt);
}

/**
 * Whether a stored value is one this setting can take.  The store is hand-editable, so this
 * runs on every value read back from it.
 * @param {SettingDescriptorType} descriptor - The setting.
 * @param {unknown} value - The stored value.
 * @returns {boolean}
 */
function isValidValue (descriptor: SettingDescriptorType, value: unknown): boolean {
  if (typeof value !== valueType(descriptor)) {
    return false;
  }
  if (descriptor.kind === "number") {
    return Number.isInteger(value) && (value as number) >= (descriptor.min ?? 0);
  }
  if (descriptor.kind === "choice") {
    return descriptor.choices?.some((choice) => choice.value === value) === true;
  }
  return true;
}

/**
 * The stored overrides, or an empty object when there are none or they cannot be read.
 * @returns {Promise<Record<string, unknown>>}
 */
async function readOverrides (): Promise<Record<string, unknown>> {
  try {
    return await getStorage().readSettings();
  } catch (error) {
    console.error(`Could not read the saved settings: ${String(error)}`);
    return {};
  }
}

/**
 * A copy of the configuration with the user's saved choices applied.
 *
 * The descriptors are what is iterated, never the stored object's keys, so a hand-edited
 * store can only reach the settings named here: a `systemPrompt` written into it is never
 * looked at.  An override that fails validation is skipped and the value from `config.json`
 * stands.  Nothing here throws; a store that cannot be read degrades to the file.
 * @param {AdaptivePaletteConfigType} config - The configuration parsed from `config.json`.
 * @returns {Promise<AdaptivePaletteConfigType>}
 */
export async function applyStoredSettings (
  config: AdaptivePaletteConfigType
): Promise<AdaptivePaletteConfigType> {
  const overrides = await readOverrides();
  const merged = structuredClone(config);
  SETTING_DESCRIPTORS.forEach((descriptor) => {
    const key = settingKey(descriptor);
    if (!(key in overrides) || !isValidValue(descriptor, overrides[key])) {
      return;
    }
    // A setting the dialog does not offer is not one an override may set: an absent section
    // stays absent, and a model-backed setting stays off when its section has no prompts.
    if (!isOffered(config, descriptor)) {
      return;
    }
    const parent = parentOf(merged, descriptor.path) as Record<string, unknown>;
    parent[descriptor.path[descriptor.path.length - 1]] = overrides[key];
  });
  return merged;
}

/**
 * Save the user's choices, keeping only those that differ from `config.json`.  A setting
 * the user never moved off the file's value keeps tracking the file, so a later edit to a
 * default still reaches a user who has saved.
 * @param {Record<string, SettingValueType>} values - The dialog's values, keyed by `settingKey`.
 * @param {AdaptivePaletteConfigType} baseline - The configuration as `config.json` has it,
 *                                               without any overrides applied.
 * @returns {Promise<boolean>} - `true` when the choices were saved; `false` when the store
 *                      denied the write, in which case nothing was written.
 */
export async function saveSettings (
  values: Record<string, SettingValueType>, baseline: AdaptivePaletteConfigType
): Promise<boolean> {
  const overrides: Record<string, SettingValueType> = {};
  SETTING_DESCRIPTORS.forEach((descriptor) => {
    const key = settingKey(descriptor);
    const value = values[key];
    const fileValue = currentValue(baseline, descriptor);
    // A setting the dialog does not offer has nothing to override.  A value the setting
    // cannot take is dropped rather than stored.
    if (value === undefined || !isOffered(baseline, descriptor) ||
        !isValidValue(descriptor, value) || value === fileValue) {
      return;
    }
    overrides[key] = value;
  });
  try {
    // An empty object rather than a delete: an absent record and one holding nothing read
    // back the same, so there is no second case to keep.
    await getStorage().writeSettings(overrides);
    return true;
  } catch (error) {
    console.error(`Could not save the settings: ${String(error)}`);
    return false;
  }
}
