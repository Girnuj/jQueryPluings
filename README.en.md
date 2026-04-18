# Plugins

## Introduction

At some point, we have all needed to solve tasks like opening a modal, removing a DOM element, or moving it to a different position, send a form, validate an input.
This repository is a collection of useful native JavaScript plugins to make that work easier, without external libraries and without writing too much repetitive code, the idea is that you take what you need when you need it and only that.

Each plugin includes its source version (`.js`) so you can adapt it to your needs, and its minified version (`.min.js`) for direct usage.
It can be useful for POC, SPA, or enterprise projects, working only with native JavaScript and HTML attributes.

If this is your first time here, I recommend reviewing at least each plugin README to quickly understand what problem it solves and how to integrate it.

A collection of JavaScript plugins for DOM manipulation, organized by folder.
No external dependencies.
These are automatically initialized when they detect the necessary HTML attributes, so you don't have to worry about writing JS; you can also opt for manual initialization.

## General Requirements

- JavaScript using ECMAScript 2020 (ECMA-2020) syntax

Functional plugins in native JavaScript.
ECMAScript 2020 is supported by most modern browsers.

## Available Plugins

- [ChildSelect](ChildSelect/): loads dependent options into a child select based on parent select value.
- [ConfirmAction](ConfirmAction/): asks for confirmation before sensitive or destructive actions on buttons, links, and forms.
- [FormDraft](FormDraft/): saves and restores form drafts in `localStorage`/`sessionStorage`, ideal for long form flows.
- [FormRequest](FormRequest/): extends native forms with async `fetch` submission, field error handling, security controls, and retry/timeout behavior.
- [FormValidate](FormValidate/): adds extended `data-*` business-rule validations, supports creating new custom rules, and blocks submit when rules fail.
- [ImgUploadPreview](ImgUploadPreview/): previews selected image files in an `<img>` element.
- [InfinitePager](InfinitePager/): handles incremental pagination with "load more" or infinite scroll using `fetch`.
- [InputSwitchFriendly](InputSwitchFriendly/): displays friendly labels based on a switch/checkbox state.
- [ItemMover](ItemMover/): moves list elements up or down using `data-*` trigger attributes.
- [ItemRemover](ItemRemover/): removes container elements from a delete trigger.
- [Modal](Modal/): opens and closes modals using HTML triggers with `data-*` attributes and optional API.
- [ModalSteps](ModalSteps/): runs step-based modal flows with remote content loading, `POST`/`GET` support, and events to control each stage.
- [NotificationPush](NotificationPush/): triggers toast notifications and sends dynamic `data-np-*` payload to a receiver or endpoint without local cache.
- [QuerySyncState](QuerySyncState/): syncs UI controls with query params for shareable links, back/forward navigation, and persistent filters.
- [ReplaceMe](ReplaceMe/): replaces a trigger with remote HTML fetched through `POST` or `GET`.
- [RequestState](RequestState/): centralizes `idle/loading/success/error` states for async actions, with mock mode for QA and optional request flow.
- [TemplateRenderizer](TemplateRenderizer/): renders HTML templates by replacing placeholders like `{{property}}` and nested paths.
- [UIState](UIState/): lets teams preview UI states like loading, empty, error, or success for QA and design workflows.
- [VideoUrlPreview](VideoUrlPreview/): previews YouTube videos in an `<iframe>` from a URL.

## Multi-Plugin Integration Example

If you need to solve a complete flow in a single view, you can combine multiple plugins without turning them into a monolithic plugin.

- Integrated demo: [PluginIntegration/test-plugin-integration.html](PluginIntegration/test-plugin-integration.html)
- Example guide: [PluginIntegration/README.md](PluginIntegration/README.md)

Recommended composition in that example:

- `Modal` as the UI flow container.
- `FormValidate` to validate fields and block submit on validation errors.
- `ConfirmAction` for pre-confirmation of sensitive actions.
- `FormDraft` to persist user progress in long forms.
- `FormRequest` as the real request owner.
- `RequestState` for visual lifecycle states (`loading/success/error/idle`).
- `NotificationPush` for immediate user feedback.

Key rule: when combining network-related plugins, keep a single real request owner and use custom lifecycle events (`before/success/error/complete`) as bridges between plugins.

## Minified Versions

Each plugin includes a minified build (`*.min.js`) inside its own folder.
If you do not need to read or debug source code, use the minified file for a lighter production integration.

## Recommended Observer Pattern

To keep strong performance when multiple plugins coexist in the same view, the repository follows a shared observation pattern:

- `data-pp-observe-global`: controls whether plugins register automatic `MutationObserver` listeners.
  - Default behavior: enabled.
  - If you set `data-pp-observe-global="false"` on `<html>`, global automatic observation is disabled.
- `data-pp-observe-root`: scopes observer root to a specific CSS selector.
  - Example: `data-pp-observe-root="#app"` on `<html>` to observe only the main container.
  - If selector is invalid or not found, plugins fallback safely to `document.body`.

- `data-pp-observe-root-{plugin}`: lets you mark the root element directly for a specific plugin (without a selector string on `<html>`).
  - Example: `<main data-pp-observe-root-form-validate>` for `FormValidate`.
  - It has priority over `data-pp-observe-root` when both are present.

### Quick Usage (4 Cases)

1. Default (no configuration)
   - Add nothing.
   - Result: fallback to `document.body`.

2. Shared root by selector (SPA)

```html
<html data-pp-observe-root="#app"></html>
```

3. Direct root per plugin (recommended when combining plugins)

```html
<section data-pp-observe-root-form-request>...</section>
<section data-pp-observe-root-request-state>...</section>
<section data-pp-observe-root-notification-push>...</section>
```

4. No global observer (manual init)

```html
<html data-pp-observe-global="false"></html>
<script>
  window.FormValidate.initAll(document);
  window.FormRequest.initAll(document);
  window.Modal.initAll(document);
</script>
```

Priority rule: direct plugin root > selector root on `<html>` > `document.body`.

### Per-Plugin Attributes (Direct Root)

- `Modal`: `data-pp-observe-root-modal`
- `ModalSteps`: `data-pp-observe-root-modal-steps`
- `FormRequest`: `data-pp-observe-root-form-request`
- `FormValidate`: `data-pp-observe-root-form-validate`
- `FormDraft`: `data-pp-observe-root-form-draft`
- `RequestState`: `data-pp-observe-root-request-state`
- `NotificationPush`: `data-pp-observe-root-notification-push`
- `QuerySyncState`: `data-pp-observe-root-query-sync-state`
- `UIState`: `data-pp-observe-root-ui-state`
- `ChildSelect`: `data-pp-observe-root-child-select`
- `ConfirmAction`: `data-pp-observe-root-confirm-action`
- `ImgUploadPreview`: `data-pp-observe-root-img-upload-preview`
- `InfinitePager`: `data-pp-observe-root-infinite-pager`
- `VideoUrlPreview`: `data-pp-observe-root-video-url-preview`
- `ItemMover`: `data-pp-observe-root-item-mover`
- `ItemRemover`: `data-pp-observe-root-item-remover`
- `ReplaceMe`: `data-pp-observe-root-replace-me`
- `InputSwitchFriendly`: `data-pp-observe-root-input-switch-friendly`

Architecture note: when combining network-related plugins (for example `FormRequest` with `RequestState`), keep a single real request owner to avoid double submissions and duplicated lifecycle events.


## Repository Structure

Each plugin lives in its own folder and should include its documentation:

```text
PluginsPublicos/
  PluginName/
    plugin.js
    plugin.min.js
    README.md
    test-pluginName.html
```

Current example:

```text
PluginsPublicos/
  VideoUrlPreview/
    VideoUrlPreview.js
    VideoUrlPreview.min.js
    README.md
    README.en.md
    test-video-url-preview.html
```

## Recommended Convention For New Plugins

Inside each plugin folder:

1. Main plugin file (`.js`).
2. `README.md` explaining:
   - What the plugin does.
   - Problem it solves.
   - Benefits.
   - Requirements.
   - How to include it in HTML.
   - Minimal usage example.
   - Available options and `data-*` attributes (if applicable).
3. Optional test HTML file for quick validation.

## Goal

Maintain a simple, reusable, and well-documented plugin library so that anyone can quickly integrate them into their projects by copying the JS(pluginName.js) or its .min version, and adding it to the required project views in a very simple and lightweight way.

## How To Contribute

If you want to contribute improvements or a new plugin:

1. Create (or update) the plugin folder following repository structure.
2. Implement source file (`plugin.js`) keeping `data-*` auto-init and public API when applicable.
3. Add/update plugin docs in `README.md` and `README.en.md`.
4. Include a test HTML file (`test-pluginName.html`) with real usage examples.
5. Generate minified build (`plugin.min.js`) before publishing changes.
6. Verify there are no errors and demo examples work in browser.
7. Update root `README.md` and `README.en.md` to list the plugin (or document the change).

Suggested best practices:

- Keep ECMAScript 2020 compatibility.
- Avoid unnecessary external dependencies.
- Do not break existing public API without clearly documenting the change.
