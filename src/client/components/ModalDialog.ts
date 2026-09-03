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

import { VNode, ComponentChildren } from "preact";
import { html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";

import "./ModalDialog.scss";

// Distinct from the footer "Close" each dialog body renders, so the two controls do not
// share an accessible name.
export const DISMISS_LABEL = "Close dialog";

type ModalDialogProps = {
  id: string,
  title: string,
  isOpen: boolean,
  onClose: () => void,
  restoreFocusTo?: () => HTMLElement | null,
  isDismissible?: boolean,
  children?: ComponentChildren
};

/**
 * A modal dialog built on the native `<dialog>` element. `showModal()` supplies the
 * focus trap, Escape-to-close, and background `inert` -- all of which go subtly wrong
 * when hand-rolled. Because WebKit does not return focus to the opener on close, focus
 * restoration is done explicitly by moving focus to the first element before the dialog
 * opens.
 *
 * `restoreFocusTo` names where focus goes when the dialog closes.
 *
 * `isDismissible` defaults to true. Setting it false withdraws every way out of the dialog
 * -- Escape and the header button alike -- for a dialog whose parent is midway through
 * something it cannot undo, so that closing cannot imply a cancellation that is no longer
 * available. Escape and the header button reach the dialog by different routes: Escape runs
 * the `cancel` default action, which `preventDefault()` blocks, while the button calls
 * `close()` directly and has to be stopped on its own.
 *
 * `id` must not contain whitespace: it is used to derive the heading id referenced by
 * `aria-labelledby`, whose value is parsed as a space-separated list.
 * @param {ModalDialogProps} props - Dialog identity, title, open state, and body.
 * @returns {VNode}
 */
export function ModalDialog (props: ModalDialogProps): VNode {
  const { id, title, isOpen, onClose, restoreFocusTo, isDismissible = true, children } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const isUnmountingRef = useRef(false);
  const headingId = `${id}-title`;

  // `showModal()` throws when the dialog is already open, and `close()` on an already
  // closed dialog fires a spurious `close` event, so both calls are guarded.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Unmounting an open dialog would tear it out of the top layer without running the
  // close algorithm, stranding focus instead of restoring it to the opener. Kept
  // separate from the effect above: putting this in that effect's cleanup would close
  // the dialog on every toggle and make its `else if` branch dead code.
  useEffect(() => () => {
    isUnmountingRef.current = true;
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
  }, []);

  const dismiss = () => dialogRef.current?.close();

  // Escape's close is a default action on the `cancel` event, so refusing it is what keeps
  // the dialog on screen.
  const refuseCancel = (event: Event) => {
    if (!isDismissible) {
      event.preventDefault();
    }
  };

  // Chromium and Firefox return focus to the opener themselves; WebKit leaves it on
  // <body>. Restoring explicitly is a no-op where the engine already did it, and keeps
  // a switch or eye-gaze user from losing their scan position on close. Focus is
  // restored before notifying the parent, since `onClose` triggers a re-render.
  // The `close` event is queued as a task, so a dialog closed by unmounting fires it once
  // the component is gone. Reporting that as a close would tell the parent the user
  // answered a question that was taken off the screen.
  // A named target can be unreachable: another modal dialog may still be open, which makes
  // everything outside it `inert`, and `focus()` on an inert element does nothing. Falling
  // back to the opener keeps focus where the user was working instead of on `<body>`.
  const handleClose = () => {
    const target = restoreFocusTo?.() ?? openerRef.current;
    target?.focus();
    if (target !== openerRef.current && document.activeElement !== target) {
      openerRef.current?.focus();
    }
    if (!isUnmountingRef.current) {
      onClose();
    }
  };

  return html`
    <dialog
      id=${id}
      ref=${dialogRef}
      class="modalDialog"
      aria-labelledby=${headingId}
      onCancel=${refuseCancel}
      onClose=${handleClose}>
      <div class="modalDialogHeader">
        <h2 id=${headingId}>${title}</h2>
        <button
          type="button"
          class="modalDialogDismiss"
          aria-label=${DISMISS_LABEL}
          disabled=${!isDismissible}
          onClick=${dismiss}>✕</button>
      </div>
      ${children}
    </dialog>
  `;
}
