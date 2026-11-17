# Effects

When an effect hook (`useEffect`, `useLayoutEffect`) or a signals `effect()` is the right tool here, and
what to use when it is not.

## Use an effect to keep something outside Preact in step

1. A browser API with a lifecycle: `showModal()` and `close()`, a `ResizeObserver`, an event listener. Undo
   it in the effect's clean-up.
2. Focus or a layout measurement that needs the DOM as it is after a render.
3. Something no event starts. When an event starts the work, start it in the event (see below).

## Use something else

| The effect...                                  | Use instead                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| works out a value from props, state or signals | compute it while rendering, or use `computed()`                                                                             |
| resets state when an input changes             | `key` on the component, or keep the input with the state and compare while rendering (`measured` in `SentenceChoices`)      |
| runs because the user did something            | the event handler                                                                                                           |
| writes state or a signal                       | write it where the value it follows changes                                                                                 |
| focuses an element as it appears               | a callback ref defined outside the component (`focusOnMount` in `EraseAllData`), or `autofocus` on a dialog's first control |
| starts a request when a dialog opens           | the function that opens the dialog, with the abort in the one that closes it (`requestFinish()` and `closeWordDialog()`)    |

## Which hook

- `useLayoutEffect` when the work must happen before the browser paints, or while the old DOM is still
  there: measuring, moving focus off a button that is going, closing a `<dialog>` as it unmounts.
- `useEffect` for everything else.
- Signals `effect()` at module level, for work that follows signals and belongs to no single component, such
  as word prediction and the label watcher. Keep its stop function when the work must end.

## Timing in Preact 11

1. Preact renders, then changes the DOM. A component it removes runs its `useLayoutEffect` clean-ups first,
   while its DOM is still in the page, and its refs are called with `null`.
2. Callback refs of added elements run.
3. `useLayoutEffect` callbacks run, each after the clean-up of its last run. All before the paint.
4. The browser paints.
5. `useEffect` clean-ups and callbacks run. A removed component's DOM is gone by now, so its `useEffect`
   clean-up cannot move focus off an element that went.

A callback ref written inline (`ref=${(element) => ...}`) is a new function on every render, so Preact calls
it again on every render. Define it outside the component.

## Traps

- `ModalDialog`, unmounted while open, restores focus twice: in its layout clean-up, before any ref or layout
  effect of the same render, and again from the `close` event a task later. The second one takes focus back
  from anything focused in that render, unless its target was removed too. Test where focus is a task after
  it moved, not only that it moved.
- WebKit does not focus a button on mouse click, and does not return focus when a dialog closes. A focus
  test that passes in Chromium alone proves little.
