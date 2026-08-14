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

import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { loadConfig } from "../../core/Config";
import {
  SETTING_DESCRIPTORS, SettingDescriptorType, SettingValueType,
  currentValue, saveSettings, settingKey
} from "./SettingsSchema";
import "./SettingsDialog.scss";

export const SETTINGS_FORM_ID = "adjustSettingsForm";
export const SAVE_LABEL = "Save and close";
export const CLOSE_LABEL = "Close";
export const CONFIRM_LABEL = "Yes, save";
export const DECLINE_LABEL = "No";
export const MODEL_NOTE = "Start Ollama to use this.";
export const WARNING_TEXT = "Saving reloads the page. The message you are writing now will be lost.";
// Deliberately unlike the warning on "clear all saved data", which destroys them.
export const WARNING_KEPT_TEXT = "Messages you have already saved are kept.";
export const FAILURE_MESSAGE = "The settings could not be saved. This browser is not letting the app use its storage.";

/**
 * The note on a setting its section's switch has turned off.
 * @param {string} label - The label of the switch that turns it off.
 * @returns {string}
 */
export const dependentNote = (label: string): string => `Turn on "${label}" to use this.`;

// A number is held as the text the user typed, so a half-typed or emptied field is not
// silently turned into a number. The form's own validation is what rejects those.
type FormValueType = boolean | string;

type SettingsDialogProps = {
  onRequestClose: () => void
};

/**
 * The body of the "Adjust Settings" dialog: the form, and the warning shown before saving.
 *
 * Both views live in this one component so that the form's values survive a warning the
 * user declines.
 * @param {SettingsDialogProps} props - How to close the dialog around this body.
 * @returns {VNode}
 */
export function SettingsDialog (props: SettingsDialogProps): VNode {
  const { config, models } = adaptivePaletteGlobals;

  // A setting the configuration carries no value for is left out: the user cannot supply
  // the rest of an unconfigured section from here.
  const shown = SETTING_DESCRIPTORS.filter(
    (descriptor) => currentValue(config, descriptor) !== undefined
  );

  const [values, setValues] = useState<Record<string, FormValueType>>(() => {
    const initial: Record<string, FormValueType> = {};
    shown.forEach((descriptor) => {
      const value = currentValue(config, descriptor);
      initial[settingKey(descriptor)] = descriptor.kind === "number" ? String(value) : value as boolean;
    });
    return initial;
  });
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

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
      return dependentNote(master?.label ?? "");
    }
    if (descriptor.requiresModel === true && models.length === 0) {
      return MODEL_NOTE;
    }
    return undefined;
  };

  /**
   * Save the choices and reload. `config.json` is fetched again for the comparison: by now
   * the globals hold the merged configuration, which is no use as a baseline. The file is
   * browser-cached and the page is about to reload anyway.
   */
  const confirm = async (): Promise<void> => {
    const toSave: Record<string, SettingValueType> = {};
    shown.forEach((descriptor) => {
      const key = settingKey(descriptor);
      toSave[key] = descriptor.kind === "number" ? Number(values[key]) : values[key] as boolean;
    });
    const baseline = await loadConfig();
    // A failed write leaves the dialog open with its reason shown. Reloading anyway would
    // look like the settings had taken.
    if (saveSettings(toSave, baseline)) {
      window.location.reload();
    } else {
      setHasFailed(true);
    }
  };

  /**
   * One setting: its control, and the note explaining why it is unavailable.
   * @param {SettingDescriptorType} descriptor - The setting to render.
   * @returns {VNode}
   */
  const renderSetting = (descriptor: SettingDescriptorType): VNode => {
    const key = settingKey(descriptor);
    const controlId = `setting-${key.replace(".", "-")}`;
    const noteId = `${controlId}-note`;
    const note = noteFor(descriptor);
    const unavailable = note !== undefined;
    const rowClass = unavailable ? "settingsRow settingsRowUnavailable" : "settingsRow";
    const label = html`<label for=${controlId}>${descriptor.label}</label>`;

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
      onSubmit=${(event: Event) => { event.preventDefault(); setIsConfirming(true); }}>
      ${groups.map((group) => html`
        <fieldset class="settingsGroup" key=${group}>
          <legend>${group}</legend>
          ${shown.filter((descriptor) => descriptor.group === group).map(renderSetting)}
        </fieldset>
      `)}
    </form>
  `;

  const warning = html`
    <div class="settingsWarning">
      <p>${WARNING_TEXT}</p>
      <p>${WARNING_KEPT_TEXT}</p>
      ${hasFailed && html`<p class="settingsFailure" role="alert">${FAILURE_MESSAGE}</p>`}
    </div>
  `;

  // The footer sits outside the form, which is the dialog's only scrolling part, so
  // "Save and close" stays where the user left it. It submits the form by id.
  const footer = isConfirming
    ? html`
      <div class="dialogFooter">
        <button type="button" class="settingsSave" onClick=${confirm}>${CONFIRM_LABEL}</button>
        <button type="button" onClick=${() => setIsConfirming(false)}>${DECLINE_LABEL}</button>
      </div>
    `
    : html`
      <div class="dialogFooter">
        <button type="submit" class="settingsSave" form=${SETTINGS_FORM_ID}>${SAVE_LABEL}</button>
        <button type="button" onClick=${props.onRequestClose}>${CLOSE_LABEL}</button>
      </div>
    `;

  return html`
    <${Fragment}>
      ${isConfirming ? warning : form}
      ${footer}
    <//>
  `;
}
