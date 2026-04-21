# ConfirmAction

Native JavaScript plugin to require confirmation before destructive or sensitive actions.

## Problem it solves

In admin panels, eCommerce, and backoffice flows there are high-impact actions (delete, cancel, reset, publish).
Without confirmation, accidental clicks can cause data loss or unwanted changes.

## Benefits

- Standardizes confirmations across the app with `data-*`.
- Avoids duplicated confirmation logic per view.
- Works with buttons, links, and forms.
- Lets you enable/disable behavior via attributes and listen to events.
- Supports custom confirmation using your own container or async adapter.
- Adds UX controls: custom button text/classes, Escape/outside click, `deny`, and async `preConfirm`.

## Requirements

- Modern browser with `CustomEvent` and `MutationObserver` support.

## Installation

```html
<script src="./confirmAction.min.js"></script>
```

For production, use `confirmAction.min.js`. For debugging, use `confirmAction.js`.

## Basic Usage

### On a button or link

```html
<button
  data-confirm-action
  data-ca-title="Delete product"
  data-ca-message="This action cannot be undone."
>
  Delete
</button>
```

### On a form

```html
<form
  data-confirm-action
  data-ca-title="Publish changes"
  data-ca-message="Content will be published live."
  action="/api/publish"
  method="post"
>
  <button type="submit">Publish</button>
</form>
```

## Supported `data-*` attributes

- `data-confirm-action`: enables the plugin. Status: **required**.
- `data-ca-title="Text"`: optional title shown in the confirmation dialog. Status: **optional**.
- `data-ca-message="Text"`: main confirmation message. Status: **optional**.
- `data-ca-enabled="true|false"`: enables or disables confirmation behavior. Status: **optional**.
- `data-ca-dialog="#selector"`: custom container/dialog used for confirmation. Status: **optional**.
- `data-ca-confirm-text="Text"`: confirm button text. Status: **optional**.
- `data-ca-cancel-text="Text"`: cancel button text. Status: **optional**.
- `data-ca-deny-text="Text"`: deny button text (if `[data-ca-deny]` exists). Status: **optional**.
- `data-ca-confirm-class="class"`: extra class(es) for confirm button. Status: **optional**.
- `data-ca-cancel-class="class"`: extra class(es) for cancel button. Status: **optional**.
- `data-ca-deny-class="class"`: extra class(es) for deny button. Status: **optional**.
- `data-ca-loading-class="class"`: class applied while `preConfirm` is running. Status: **optional**.
- `data-ca-allow-escape="true|false"`: allow closing with Escape. Status: **optional**.
- `data-ca-allow-outside-click="true|false"`: allow closing when clicking outside custom dialog. Status: **optional**.
- `data-ca-focus-confirm="true|false"`: focus confirm button when custom dialog opens. Status: **optional**.

## Public API

```html
<script>
  const subject = document.querySelector('[data-confirm-action]');

  const instance = window.Plugins.ConfirmAction.init(subject, {
    title: 'Delete record',
    message: 'This action cannot be undone.',
    enabled: true,
    dialogSelector: '#confirmDialog',
    preConfirm: async function () {
      await new Promise(function (resolve) { setTimeout(resolve, 600); });
      return true;
    },
    confirmAdapter: function (detail) {
      return window.confirm(detail.message);
    },
    beforeConfirm: function (detail, element) {
      console.log('before', detail.actionType, element);
    },
    onConfirm: function (detail, element) {
      console.log('confirmed', detail.actionType, element);
    },
    onCancel: function (detail, element) {
      console.log('cancelled', detail.actionType, element);
    }
  });

  window.Plugins.ConfirmAction.getInstance(subject);
  window.Plugins.ConfirmAction.destroy(subject);
  window.Plugins.ConfirmAction.initAll(document);
  window.Plugins.ConfirmAction.destroyAll(document);
</script>
```

## Custom confirmation

If you set `data-ca-dialog`, the plugin uses that container instead of `window.confirm`.

Expected nodes inside that container:

- `[data-ca-dialog-title]`: title (optional).
- `[data-ca-dialog-message]`: confirmation message.
- `[data-ca-confirm]`: confirm button.
- `[data-ca-cancel]`: cancel button.
- `[data-ca-deny]`: deny button (optional).

If the selector is missing or fails, the plugin falls back to `window.confirm`.

`preConfirm` allows async checks before the action is confirmed (for example, a backend validation).
If it returns `false`, the action does not continue.

## Events

- `before.plugin.confirmAction`: before showing confirmation (cancelable).
- `confirmed.plugin.confirmAction`: fired when the user confirms.
- `cancelled.plugin.confirmAction`: fired when the user cancels.
- `denied.plugin.confirmAction`: fired when the user selects deny.

## Recommended cases

- Delete product, category, or user.
- Cancel order or refund.
- Reset settings or data.
- Publish content to production.

## Demo

- `test-confirm-action.html`

## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-confirm-action>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-confirm-action`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro