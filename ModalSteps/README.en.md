# ModalSteps

Native JavaScript plugin to handle step-based modals with remote HTML loading and progressive submit using `fetch`.

## Problem it solves

Solves modal wizard flows (multiple steps, validation, and navigation) without rebuilding request/state orchestration in every project.

## Benefits

- Standardizes step-based modal flows in one implementation.
- Supports mixed GET/POST flows consistently.
- Improves maintainability for complex forms.
- Makes flow evolution easier without rewriting core behavior.

## Requirements

- A modern browser with support for `fetch`, `MutationObserver`, `WeakMap`, `FormData`, and `CustomEvent`.
- A modal with `data-dialog="steps"` and internal container `data-dialog="main"`.
- A trigger that opens the modal and optionally provides `data-dialog-src`.

## Installation

Include the plugin:

```html
<script src="./modalSteps.min.js"></script>
```

For production, use `modalSteps.min.js`. If you need debugging, you can use `modalSteps.js`.

## Basic Usage

```html
<button type="button" data-dialog-src="/steps/start" id="btnOpenWizard">
  Open wizard
</button>

<div id="stepsModal" role="dialog" data-dialog="steps" aria-hidden="true">
  <section data-dialog="main"></section>
</div>
```

The plugin auto-initializes on modals matching:

- `[role="dialog"][data-dialog="steps"]`
- `dialog[data-dialog="steps"]`

## How It Works

- Listens to `shown.plugin.modalStep` to load the first HTML step.
- Inserts step content into `data-dialog="main"`.
- Intercepts `submit` from forms inside the modal.
- Steps can use `POST` forms to submit data and `GET` requests to retrieve data from APIs.
- Sends data with `fetch` and handles responses by status (`200`, `201`, `204`, `400`, `418`).
- Clears content on `hidden.plugin.modalStep`.

## Supported `data-*` attributes

- `data-dialog="steps"`: marks the modal as plugin subject. Status: **required for auto-initialization**.
- `data-dialog="main"`: container where each step is rendered. Status: **required**.
- `data-dialog-src`: first-step URL on the trigger that opens the modal. Status: **optional/conditional** (if omitted, you can provide `getFirstStepRequest` through API).
- `data-dialog-reload-on-no-content="true|false"`: controls automatic reload on empty `201/204` responses. Status: **optional**.

## Public API

```html
<script>
  const modal = document.querySelector('#stepsModal');

  const instance = window.ModalSteps.init(modal, {
    reloadOnNoContent: true,
    jsonResponseHandler: function (data, status, subject) {
      console.log('JSON', status, data, subject);
    },
    after201: function (content, response, subject) {
      console.log('after201', content, response, subject);
    },
    after204: function (response, subject) {
      console.log('after204', response, subject);
    }
  });

  instance.bind(function getFirstStepRequest() {
    return fetch('/steps/start', { credentials: 'same-origin' });
  });

  // Manual content injection into the steps container.
  instance.load('<form action="/steps/submit"><button type="submit">Send</button></form>');

  window.ModalSteps.getInstance(modal);
  window.ModalSteps.destroy(modal);
  window.ModalSteps.initAll(document);
  window.ModalSteps.destroyAll(document);
</script>
```

Main methods:

- window.ModalSteps.init(element, options): creates or reuses an instance.
- instance.bind(getFirstStepRequest): binds listeners and optional first-step callback.
- instance.load(html, submitDataGetter): manually loads content into the main steps container.
- window.ModalSteps.getInstance(element): returns current instance or null.
- window.ModalSteps.destroy(element): destroys a specific instance.
- window.ModalSteps.initAll(root): initializes all matches inside a container.
- window.ModalSteps.destroyAll(root): destroys all matches inside a container.

## Plugin Events

- `shown.plugin.modalStep`: expected event to trigger first-step loading.
- `hidden.plugin.modalStep`: expected event to clear step content.

## Security options

- `strictSameOrigin` (default: `true`): blocks cross-origin URLs for step loading and submit.
- `allowedSubmitMethods` (default: `['GET', 'POST']`): limits allowed HTTP methods for submit.

Notes:

- If a form is `GET`, the plugin serializes fields into query string (no body).
- If a form is `POST`, the plugin sends `FormData` in the body.
- Only `http`/`https` URLs are allowed.

## Common Errors

- Missing `data-dialog="main"`: no container to render steps.
- Trigger without `data-dialog-src` and no `getFirstStepRequest`: content is not loaded.
- Unexpected HTTP response: plugin attempts to close modal as fallback.

## Demo

You can open the test file included in this project:

- `test-modal-steps.html`

## Example Preview

Initial HTML state:

![ModalSteps initial example](./img/image.png)

First popup in the flow:

![ModalSteps first popup](./img/image2.png)

Second step in the flow:

![ModalSteps second step](./img/image3.png)

Final modal in the flow:

![ModalSteps final modal](./img/image4.png)

## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-modal-steps>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-modal-steps`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro