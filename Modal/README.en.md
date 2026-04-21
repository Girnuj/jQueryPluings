# Modal

Native plugin to open, close, and toggle modals without external dependencies.

## Problem it solves

Solves consistent modal handling without depending on third-party libraries or rebuilding modal behavior from scratch in each project.

## Benefits

- Clear API and attributes for open/close/toggle flows.
- Less coupling to frameworks or external UI libraries.
- Consistent behavior across modal implementations.
- Easy integration with declarative HTML and optional JS hooks.

## Requirements

- JavaScript with ECMAScript 2020 syntax.

## Include Script

```html
<script src="./modal.js"></script>
```
or
```html
<script src="./modal.min.js"></script>
```

## Quick Usage With HTML Attributes

```html
<button type="button" data-modal="toggle" data-modal-target="#myModal">
  Open modal
</button>

<div id="myModal" data-role="modal" aria-hidden="true">
  <div data-modal="backdrop">
    <div class="modal-content">
      <h3>My modal</h3>
      <p>Modal content.</p>
      <button type="button" data-modal="dismiss">Close</button>
    </div>
  </div>
</div>
```

You can also use a native `<dialog>` element:

```html
<button type="button" data-modal="toggle" data-modal-target="#nativeDialog">
  Open dialog
</button>

<dialog id="nativeDialog" data-modal-focus="true">
  <p>Hello from dialog.</p>
  <button type="button" data-modal="dismiss">Close</button>
</dialog>
```

## Example Preview

Initial state (modal closed):

![Modal closed](./img/image.png)

Open state:

![Modal open](./img/image2.png)

## Supported Attributes

- `data-modal="toggle"`: trigger to toggle open/close. Status: **optional**.
- `data-modal-target="#selector"`: CSS selector of the modal to control. Status: **required when using `data-modal="toggle"`**.
- `data-modal="dismiss"`: internal trigger to close the modal. Status: **optional**.
- `data-modal="backdrop"`: backdrop zone to close on click (if not static). Status: **optional**.
- `data-role="modal"`: marks a container as a modal subject for auto-init. Status: **optional** (plugin also detects `role="dialog"` and `<dialog>`).
- `data-modal-static="true|false"`: when `true`, backdrop click does not close. Status: **optional**.
- `data-modal-focus="true|false"`: focuses modal and first interactive element on open. Status: **optional**.
- `data-modal-keyboard="true|false"`: allows closing with Escape key. Status: **optional**.
- `data-modal-show="true|false"`: auto-opens when initialized. Status: **optional**.

## Public API

```js
const modalElement = document.querySelector('#myModal');

const instance = window.Modal.init(modalElement, {
  static: false,
  keyboard: true,
  focus: true,
  show: false,
});

instance.show();
instance.hide();
instance.toggle();

window.Modal.getInstance(modalElement);
window.Modal.destroy(modalElement);
window.Modal.initAll();
window.Modal.destroyAll();
```

Main methods:

- window.Modal.init(element, options): creates or reuses a modal instance.
- instance.show(): opens the modal.
- instance.hide(): closes the modal.
- instance.toggle(): toggles open/closed state.
- window.Modal.getInstance(element): returns current instance or null.
- window.Modal.destroy(element): destroys a specific instance.
- window.Modal.initAll(root): initializes all matching modals.
- window.Modal.destroyAll(root): destroys all matching instances.

## Custom Events

The plugin dispatches events on the modal element itself:

- `shown.plugin.modal`
- `hidden.plugin.modal`

Each event exposes the related source element (when available) in `event.detail.relatedTarget`.

## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-modal>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-modal`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro