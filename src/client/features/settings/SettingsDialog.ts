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
import {
  SETTING_DESCRIPTORS, SettingDescriptorType, SettingValueType,
  currentValue, isOffered, saveSettings, settingKey
} from "./SettingsSchema";
import { EraseAllData } from "./EraseAllData";
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
  const { config, fileConfig, models } = adaptivePaletteGlobals;

  const shown = SETTING_DESCRIPTORS.filter((descriptor) => isOffered(config, descriptor));

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
      return dependentNote(master?.label ?? "");
    }
    if (descriptor.requiresModel === true && models.length === 0) {
      return MODEL_NOTE;
    }
    return undefined;
  };

  /**
   * Save the choices and reload. The comparison is against `fileConfig`, `config.json` as it
   * was read at start-up: the globals' `config` is the merged one, which is no use as a
   * baseline.
   */
  const confirm = async (): Promise<void> => {
    const toSave: Record<string, SettingValueType> = {};
    shown.forEach((descriptor) => {
      const key = settingKey(descriptor);
      toSave[key] = descriptor.kind === "number" ? Number(values[key]) : values[key] as boolean;
    });
    // A failed write leaves the dialog open with its reason shown. Reloading anyway would
    // look like the settings had taken.
    if (await saveSettings(toSave, fileConfig)) {
      window.location.reload();
    } else {
      setHasFailed(true);
    }
  };

  /**
   * Move on to the warning. `aria-disabled` does not stop a submit, so an erased store is
   * refused here rather than by the button.
   * @param {Event} event - The form's submit event.
   */
  const askToSave = (event: Event): void => {
    event.preventDefault();
    if (!isErased) {
      setIsConfirming(true);
    }
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
      onSubmit=${askToSave}>
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
        <button type="button" class="settingsSave" onClick=${() => void confirm()}>${CONFIRM_LABEL}</button>
        <button
          type="button"
          onClick=${() => { setIsConfirming(false); setHasFailed(false); }}>${DECLINE_LABEL}</button>
      </div>
    `
    : html`
      <div class="dialogFooter">
        <button
          type="submit"
          class="settingsSave"
          aria-disabled=${isErased ? "true" : undefined}
          form=${SETTINGS_FORM_ID}>${SAVE_LABEL}</button>
        <button type="button" onClick=${props.onRequestClose}>${CLOSE_LABEL}</button>
      </div>
    `;

  return html`
    <${Fragment}>
      ${isConfirming ? warning : html`
        <${Fragment}>
          ${form}
          <${EraseAllData} onErased=${() => setIsErased(true)} />
        <//>
      `}
      ${footer}
    <//>
  `;
}
