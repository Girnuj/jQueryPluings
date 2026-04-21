# RequestState

## What it does

RequestState manages visual states for async actions in HTML triggers (`button`, `a`, `form`, etc.) using `data-*`.
It handles `idle`, `loading`, `success`, and `error` without duplicating logic in each view.

## Problem it solves

Most projects repeat the same code for:

- disabling triggers during async work,
- showing success/error feedback,
- resetting UI state,
- testing UI flows without a real backend.

RequestState centralizes this into a declarative, reusable plugin.

## Origin and scope

RequestState started mainly with the goal of executing requests and rendering content declaratively in the UI, avoiding repeated `fetch` and visual-feedback logic across views.

Over time it evolved into a fairly complete plugin: beyond request/response handling, it now covers lifecycle states (`idle/loading/success/error`), messages, per-state classes, retries, timeout, mock mode for QA, dynamic payload support, and events to integrate with other plugins such as `FormRequest` and `FormValidate`.

## Benefits

- Declarative flow with `data-request-state`.
- Standard UI states (`idle/loading/success/error`) across frameworks.
- Mock mode (`data-rs-mock`) for QA and visual testing.
- Optional real `fetch` request with timeout and `cache: 'no-store'`.
- Configurable retries for transient failures.
- Native `submit` support when used on forms.
- Declarative response rendering via response target.
- Public API plus lifecycle events/hooks.

## Integration with FormRequest and FormValidate

This plugin integrates perfectly with:

- `FormValidate`: validates rules and blocks submit when invalid.
- `FormRequest`: performs the real `fetch` submission.
- `RequestState`: handles visual states (`idle/loading/success/error`) and trigger UX.

Recommended to avoid double submission:

- Keep only one owner of the real network request (usually `FormRequest`).
- Use `RequestState` for visual state and UI feedback.

## Requirements

- JavaScript with ECMAScript 2020 syntax.

## Include in HTML

```html
<script src="./requestState.min.js"></script>
```

For debugging or development, you can use `requestState.js`.

## Main attributes

- `data-request-state`: enables plugin on trigger.
- `data-rs-target="#selector"`: node where main classes/state are applied.
- `data-rs-message-target="#selector"`: node where state messages are written.
- `data-rs-loading-text="Processing..."`: loading message.
- `data-rs-success-text="Done"`: success message.
- `data-rs-error-text="Failed"`: error message.
- `data-rs-loading-class="my-loading"`: CSS class for `loading` state.
- `data-rs-success-class="my-success"`: CSS class for `success` state.
- `data-rs-error-class="my-error"`: CSS class for `error` state.
- `data-rs-idle-class="my-idle"`: CSS class for `idle` state.
- `data-rs-delay="700"`: delay before resolution (ms).
- `data-rs-auto-reset="1800"`: resets to `idle` after that time.
- `data-rs-disable-on-loading="true|false"`: when `true`, interaction is blocked while state is not `idle` (`loading`, `success`, `error`).
- `data-rs-mock="success|error"`: forces simulated result.
- `data-rs-send="true|false"`: enables real request.
- `data-rs-endpoint="/api/action"`: request endpoint.
- `data-rs-method="GET|POST|..."`: HTTP method.
- `data-rs-timeout="12000"`: timeout in ms.
- `data-rs-retry-count="2"`: retry attempts.
- `data-rs-retry-delay="350"`: delay between retries (ms).
- `data-rs-retry-statuses="408,429,500,502,503,504"`: retriable HTTP statuses.
- `data-rs-headers-json='{"X-Key":"value"}'`: extra headers.
- `data-rs-payload-json='{"id":10}'`: base JSON payload for methods with body.
- `data-rs-response-target="#selector"`: node where response/error is rendered.
- `data-rs-response-mode="auto|text|json|html"`: render mode for response target.
- `data-rs-name-*`: dynamic payload (example: `data-rs-name-item-id="P-100"`).

## Form submit support

When `data-request-state` is placed on a `<form>`, plugin intercepts `submit` automatically.

```html
<form
  data-request-state
  data-rs-send="true"
  data-rs-endpoint="/api/profile"
  data-rs-method="POST"
  data-rs-loading-text="Saving..."
  data-rs-success-text="Profile updated"
  data-rs-error-text="Could not save"
>
  <input type="text" name="name" value="Samuel" />
  <button type="submit">Save</button>
</form>
```

Payload includes form fields + `data-rs-name-*` + `data-rs-payload-json`.

## Multiple-click blocking

To prevent double submissions, plugin executes only when state is `idle`.

- If state is `loading`, `success`, or `error`, new clicks/submits are ignored.
- With `data-rs-disable-on-loading="true"`, trigger remains visually/functionally disabled outside `idle`.
- To re-enable automatically, set `data-rs-auto-reset` (ms) so state returns to `idle`.

## Response target

You can render response (or error) into a declarative target node:

```html
<button
  data-request-state
  data-rs-send="true"
  data-rs-endpoint="/api/demo"
  data-rs-method="GET"
  data-rs-response-target="#serverResponse"
  data-rs-response-mode="json"
>
  Fetch
</button>

<pre id="serverResponse"></pre>
```

## CSS classes via attributes

You can also pass CSS class names via attributes to control each state style.

Exact attribute names:

- `data-rs-loading-class`
- `data-rs-success-class`
- `data-rs-error-class`
- `data-rs-idle-class`

Example:

```html
<button
  data-request-state
  data-rs-target="#boxA"
  data-rs-loading-class="u-loading"
  data-rs-success-class="u-success"
  data-rs-error-class="u-error"
  data-rs-idle-class="u-idle"
  data-rs-mock="success"
>
  Run
</button>
```

## Minimal example

```html
<button
  data-request-state
  data-rs-target="#saveState"
  data-rs-message-target="#saveMessage"
  data-rs-loading-text="Saving..."
  data-rs-success-text="Saved"
  data-rs-error-text="Could not save"
  data-rs-mock="success"
  data-rs-auto-reset="1400"
>
  Save changes
</button>

<div id="saveState" data-rs-state="idle">
  <span id="saveMessage"></span>
</div>
```

## Public API

```html
<script>
  const trigger = document.querySelector('[data-request-state]');

  const instance = window.Plugins.RequestState.init(trigger, {
    delayMs: 500,
    autoResetMs: 1800,
    retryCount: 1,
    retryDelayMs: 350,
    retryStatuses: [408, 429, 500, 502, 503, 504],
    disableOnLoading: true,
    sendRequest: false,
    endpoint: '',
    method: 'GET',
    timeoutMs: 12000,
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'RequestState' },
    loadingClass: 'is-loading',
    successClass: 'is-success',
    errorClass: 'is-error',
    idleClass: 'is-idle',
    loadingText: 'Processing...',
    successText: 'Done.',
    errorText: 'Something went wrong.',
    responseTarget: '',
    responseMode: 'auto',
    mockResult: '',
    onBefore: function (ctx) {
      console.log('before', ctx);
    },
    onStateChange: function (state, ctx) {
      console.log('state', state, ctx);
    },
    onSuccess: function (ctx) {
      console.log('success', ctx);
    },
    onError: function (ctx) {
      console.log('error', ctx);
    },
    onComplete: function (ctx) {
      console.log('complete', ctx);
    }
  });

  window.Plugins.RequestState.getInstance(trigger);
  window.Plugins.RequestState.destroy(trigger);
  window.Plugins.RequestState.initAll(document);
  window.Plugins.RequestState.destroyAll(document);
</script>
```

Main methods:

- `window.Plugins.RequestState.init(element, options)`: creates or reuses instance.
- `window.Plugins.RequestState.getInstance(element)`: returns instance or `null`.
- `window.Plugins.RequestState.destroy(element)`: destroys one instance.
- `window.Plugins.RequestState.initAll(root)`: initializes all matching triggers.
- `window.Plugins.RequestState.destroyAll(root)`: destroys instances inside a container.

## Events

- `before.plugin.requestState`: before flow starts (cancelable).
- `state.plugin.requestState`: fired on each state change (`idle/loading/success/error`).
- `success.plugin.requestState`: when flow ends in success.
- `error.plugin.requestState`: when flow ends in error.
- `complete.plugin.requestState`: always at end of cycle.

## Demo

- `test-request-state.html`

## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-request-state>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-request-state`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro