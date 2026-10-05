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

import { Fragment, VNode } from "preact";
import { html } from "htm/preact";
import { useState } from "preact/hooks";

import { adaptivePaletteGlobals, settingsSavedCount } from "../../state/GlobalData";
import {
  SETTING_DESCRIPTORS, SettingDescriptorType, SettingValueType,
  applyStoredSettings, currentValue, isOffered, saveSettings, settingKey
} from "./SettingsSchema";
import { EraseAllData } from "./EraseAllData";
import { isLocalHost } from "../../core/OllamaApi";
import { hydrateMessageLog } from "../../core/MessageLog";
import { languageSignal, t } from "../../i18n/I18n";
import "./SettingsDialog.scss";

export const SETTINGS_FORM_ID = "adjustSettingsForm";

/**
 * The note on a setting its section's switch has turned off.
 * @param {string} label - The label of the switch that turns it off.
 * @returns {string}
 */
export const dependentNote = (label: string): string => t("settingsDependentNote", { label });

// A number is held as the text the user typed, so a half-typed or emptied field is not
// silently turned into a number. The form's own validation is what rejects those.
type FormValueType = boolean | string;

type SettingsDialogProps = {
  onRequestClose: () => void
};

/**
 * The body of the "Adjust Settings" dialog: the form and its footer.
 * @param {SettingsDialogProps} props - How to close the dialog around this body.
 * @returns {VNode}
 */
export function SettingsDialog (props: SettingsDialogProps): VNode {
  const { config, fileConfig, models } = adaptivePaletteGlobals;

  const shown = SETTING_DESCRIPTORS.filter((descriptor) => isOffered(config, descriptor));

  // The language field shows the page's language, which `?lang=` may have set rather than
  // the saved choice in `config.language`.
  const [pageLanguage] = useState(languageSignal.value);

  const [values, setValues] = useState<Record<string, FormValueType>>(() => {
    const initial: Record<string, FormValueType> = {};
    shown.forEach((descriptor) => {
      const value = settingKey(descriptor) === "language" ? pageLanguage : currentValue(config, descriptor);
      initial[settingKey(descriptor)] = descriptor.kind === "number" ? String(value) : value as boolean | string;
    });
    return initial;
  });
  const [hasFailed, setHasFailed] = useState(false);
  // Set once the erase has finished. The store is gone by then, so every later write fails
  // where only the console sees it; the footer must stop offering a save that cannot happen.
  // "Close" stays live.
  const [isErased, setIsErased] = useState(false);

  const setValue = (key: string, value: FormValueType): void => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  // A setting is switched off when the setting it depends on is unchecked. That switch is
  // read from the form, not the configuration, so the rows follow it as it is clicked.
  const isSwitchedOff = (descriptor: SettingDescriptorType): boolean =>
    descriptor.enabledBy !== undefined && values[descriptor.enabledBy] === false;

  /**
   * Why a setting cannot be changed, or `undefined` when it can be.
   * @param {SettingDescriptorType} descriptor - The setting.
   * @returns {string | undefined}
   */
  const noteFor = (descriptor: SettingDescriptorType): string | undefined => {
    // The switch is named first: it is the one the user can act on without leaving the dialog.
    if (isSwitchedOff(descriptor)) {
      const master = SETTING_DESCRIPTORS.find(
        (candidate) => settingKey(candidate) === descriptor.enabledBy
      );
      return dependentNote(master ? t(master.label) : "");
    }
    // On the hosted site there is no Ollama to start.
    const needsModel = descriptor.requiresModel === true || descriptor.usesModelOutput === true;
    if (needsModel && models.length === 0) {
      return isLocalHost() ? t("settingsModelNote") : t("hosted");
    }
    return undefined;
  };

  /**
   * Save the choices, apply them and close. The comparison is against `fileConfig`,
   * `config.json` as it was read at start-up: the globals' `config` is the merged one, which
   * is no use as a baseline.
   *
   * The page is not reloaded. On the public website the store is memory, which a reload
   * would empty.
   * @param {Event} event - The form's submit event.
   */
  const save = async (event: Event): Promise<void> => {
    event.preventDefault();
    // `aria-disabled` does not stop a submit, so an erased store is refused here rather than
    // by the button.
    if (isErased) {
      return;
    }
    setHasFailed(false);
    const toSave: Record<string, SettingValueType> = {};
    shown.forEach((descriptor) => {
      const key = settingKey(descriptor);
      toSave[key] = descriptor.kind === "number" ? Number(values[key]) : values[key];
    });
    // A language left as it was keeps the saved choice, so a page opened with `?lang=` does
    // not save the URL's language.
    const isLanguageChanged = values.language !== pageLanguage;
    if (!isLanguageChanged) {
      toSave.language = config.language;
    }
    // A failed write leaves the dialog open with its reason shown. Closing anyway would look
    // like the settings had taken.
    if (!await saveSettings(toSave, fileConfig)) {
      setHasFailed(true);
      return;
    }
    adaptivePaletteGlobals.config = await applyStoredSettings(fileConfig);
    if (isLanguageChanged) {
      languageSignal.value = adaptivePaletteGlobals.config.language;
      // A `?lang=` left as it was would show the old language in the address, and bring it
      // back on reload.
      const url = new URL(window.location.href);
      if (url.searchParams.has("lang")) {
        url.searchParams.set("lang", languageSignal.value);
        history.replaceState(history.state, "", url);
      }
    }
    // "Messages to remember" may have changed.
    await hydrateMessageLog();
    settingsSavedCount.value++;
    props.onRequestClose();
  };

  /**
   * One setting: its control, and the note explaining why it is unavailable.
   * @param {SettingDescriptorType} descriptor - The setting to render.
   * @returns {VNode}
   */
  const renderSetting = (descriptor: SettingDescriptorType): VNode => {
    const key = settingKey(descriptor);
    const controlId = `setting-${key.replaceAll(".", "-")}`;
    const noteId = `${controlId}-note`;
    const note = noteFor(descriptor);
    const unavailable = note !== undefined;
    const rowClass = unavailable ? "settingsRow settingsRowUnavailable" : "settingsRow";
    const label = html`<label for=${controlId}>${t(descriptor.label)}</label>`;

    // `aria-disabled` rather than `disabled`: a disabled control drops out of the tab
    // order, which costs a switch or eye-gaze user their scan position and puts the note
    // explaining the state out of reach.
    const shared = {
      id: controlId,
      "aria-disabled": unavailable ? "true" : undefined,
      "aria-describedby": unavailable ? noteId : undefined
    };

    const control = descriptor.kind === "boolean"
      ? html`
        <input
          ...${shared}
          type="checkbox"
          checked=${values[key] as boolean}
          onClick=${unavailable ? (event: Event) => event.preventDefault() : undefined}
          onChange=${(event: Event) => setValue(key, (event.currentTarget as HTMLInputElement).checked)} />
      `
      : descriptor.kind === "choice"
        ? html`
        <select
          ...${shared}
          value=${values[key] as string}
          onChange=${(event: Event) => setValue(key, (event.currentTarget as HTMLSelectElement).value)}>
          ${descriptor.choices?.map((choice) => html`
            <option key=${choice.value} value=${choice.value} lang=${choice.value}>${choice.text}</option>
          `)}
        </select>
      `
        : html`
        <input
          ...${shared}
          type="number"
          inputmode="numeric"
          min=${descriptor.min}
          step="1"
          required
          readOnly=${unavailable}
          value=${values[key] as string}
          onInput=${(event: Event) => setValue(key, (event.currentTarget as HTMLInputElement).value)} />
      `;

    return html`
      <${Fragment}>
        <div class=${rowClass}>
          ${descriptor.kind === "boolean" ? html`${control}${label}` : html`${label}${control}`}
        </div>
        ${note && html`<p class="settingNote" id=${noteId}>${note}</p>`}
      <//>
    `;
  };

  // Groups appear in the order their first setting does, so the descriptor array is the
  // only place the ordering lives.
  const groups = [...new Set(shown.map((descriptor) => descriptor.group))];

  const form = html`
    <form
      id=${SETTINGS_FORM_ID}
      class="settingsForm"
      onSubmit=${(event: Event) => void save(event)}>
      ${groups.map((group) => html`
        <fieldset class="settingsGroup" key=${group}>
          <legend>${t(group)}</legend>
          ${shown.filter((descriptor) => descriptor.group === group).map(renderSetting)}
        </fieldset>
      `)}
    </form>
  `;

  // The footer sits outside the form, which is the dialog's only scrolling part, so
  // "Save and close" stays where the user left it. It submits the form by id.
  const footer = html`
    <div class="dialogFooter">
      <button
        type="submit"
        class="settingsSave"
        aria-disabled=${isErased ? "true" : undefined}
        form=${SETTINGS_FORM_ID}>${t("settingsSave")}</button>
      <button type="button" onClick=${props.onRequestClose}>${t("close")}</button>
    </div>
  `;

  // "Erase all app data and quit" is the uninstall path, so it is shown only where there is
  // an app to uninstall. On the hosted site nothing was installed and a reload clears the
  // data anyway.
  return html`
    <${Fragment}>
      ${form}
      ${isLocalHost() && html`<${EraseAllData} onErased=${() => setIsErased(true)} />`}
      ${hasFailed && html`<p class="settingsFailure" role="alert">${t("settingsFailed")}</p>`}
      ${footer}
    <//>
  `;
}
