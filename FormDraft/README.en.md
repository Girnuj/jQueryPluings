# FormDraft

## What it does

FormDraft automatically saves and restores form drafts in `localStorage` or `sessionStorage` using `data-*` attributes.

## Problem it solves

In long forms (CRM, checkout, onboarding), users may close the tab, refresh the page, or pause the flow.

Without draft persistence, data is lost and abandonment increases.

## Benefits

- Auto-save on `input/change/blur`.
- Auto-restore when users return.
- `localStorage` and `sessionStorage` support.
- Draft cleanup on `FormRequest` success.
- Configurable draft key per form/context.
- Custom lifecycle events (`before/saved/restored/cleared/error`).

## Requirements

- JavaScript ECMAScript 2020.
- Browser with `localStorage` or `sessionStorage` support.

## Include in HTML

```html
<script src="./formDraft.min.js"></script>
```

## Basic usage

```html
<form
  data-form-draft
  data-fd-storage="local"
  data-fd-key="checkout-v1"
>
  <input name="name" />
  <input name="email" />
</form>
```

## Main attributes

- `data-form-draft`: enables plugin on forms.
- `data-fd-storage="local|session"`: storage engine.
- `data-fd-key="key"`: explicit draft key.
- `data-fd-key-prefix="prefix"`: prefix for generated key.
- `data-fd-debounce="350"`: save debounce in ms.
- `data-fd-save-on-input="true|false"`: save on `input`.
- `data-fd-save-on-change="true|false"`: save on `change`.
- `data-fd-save-on-blur="true|false"`: save on `blur`.
- `data-fd-restore-on-init="true|false"`: restore on init.
- `data-fd-clear-on-submit="true|false"`: clear draft on `submit`.
- `data-fd-clear-on-form-request-success="true|false"`: clear on `success.plugin.formRequest`.
- `data-fd-max-age="86400000"`: max draft age in ms.
- `data-fd-include="selector"`: allowed fields (whitelist).
- `data-fd-exclude="selector"`: excluded fields (blacklist).

## FormRequest compatibility

FormDraft is fully compatible with `FormRequest`.

Recommended pattern:

- Keep `FormRequest` as the real request owner.
- Use `FormDraft` to persist user progress.
- Enable `data-fd-clear-on-form-request-success="true"` to clear draft after successful backend response.

Note: `FormDraft` clears persisted draft data (storage). If you also want to clear visible form inputs on success, use `data-form-reset-on-success="true"` from `FormRequest`.

## Public API

```html
<script>
  const form = document.querySelector('form[data-form-draft]');

  const instance = window.Plugins.FormDraft.init(form, {
    storage: 'local',
    key: 'checkout-v1',
    debounceMs: 300,
    restoreOnInit: true,
    clearOnFormRequestSuccess: true
  });

  instance.saveNow();
  instance.restoreNow();
  instance.clearDraft();

  window.Plugins.FormDraft.getInstance(form);
  window.Plugins.FormDraft.destroy(form);
  window.Plugins.FormDraft.initAll(document);
  window.Plugins.FormDraft.destroyAll(document);
</script>
```

## Events

- `before.plugin.formDraft`: before save (cancelable).
- `saved.plugin.formDraft`: draft saved.
- `restored.plugin.formDraft`: draft restored.
- `cleared.plugin.formDraft`: draft removed.
- `error.plugin.formDraft`: storage error.

## Demo

- `test-form-draft.html`

## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-form-draft>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-form-draft`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.

Copyright (c) 2026 Samuel Montenegro
See the LICENSE file in the repository root for full terms.