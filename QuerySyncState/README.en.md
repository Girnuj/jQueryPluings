# QuerySyncState

Native plugin to keep UI controls in sync with URL query params in real time.

It solves a common SPA/view problem: share state through URL without rewriting manual `history`, `popstate`, parsing, and rehydration logic.

## What problem it solves

- Keep filters, search, and sorting reflected in the URL.
- Restore control state when opening a shared link.
- Support browser back/forward navigation consistently.
- Prevent UI <-> URL sync loops.

## Requirements

- ECMAScript 2020 JavaScript.

## Include

```html
<script src="querySyncState.js"></script>
```

## Minimal usage

```html
<input
  type="search"
  data-role="query-sync-state"
  data-qss-key="q"
  data-qss-type="string"
  data-qss-history="replace"
  data-qss-debounce="250"
  placeholder="Search..."
/>
```

With this:

- Input value syncs into `?q=...`.
- On reload or back/forward, input is rehydrated from URL.

## Available attributes

- `data-role="query-sync-state"`: marks control as plugin subject.
- `data-qss-key="q"`: query param name to sync.
- `data-qss-type="string|number|boolean|csv|json"`: parse/serialize type.
- `data-qss-history="replace|push"`: history strategy when writing URL.
- `data-qss-debounce="250"`: debounce in ms for UI-driven sync.
- `data-qss-default="value"`: default value when param is missing.
- `data-qss-omit-default="true|false"`: if `true`, omits param when value equals default.
- `data-qss-reset-page-key="page"`: clears that param when this filter changes.
- `data-qss-sync-on-init="true|false"`: apply URL rehydration on init.
- `data-qss-trim="true|false"`: trim text input values.

## Public API

- `window.Plugins.QuerySyncState.init(element, options)`
- `window.Plugins.QuerySyncState.getInstance(element)`
- `window.Plugins.QuerySyncState.destroy(element)`
- `window.Plugins.QuerySyncState.initAll(root)`
- `window.Plugins.QuerySyncState.destroyAll(root)`

Instance methods:

- `instance.syncFromUrl(source?, event?)`
- `instance.syncToUrl(source?, event?)`
- `instance.reset({ syncToUrl?: boolean })`

## Custom events

- `before.plugin.querySyncState` (cancelable)
- `sync.plugin.querySyncState`
- `error.plugin.querySyncState`
- `complete.plugin.querySyncState`

## Demo

- [test-query-sync-state.html](test-query-sync-state.html)

### Scenario 1: initial HTML state

Initial demo state with no query params and default values:

![Initial QuerySyncState state](img/image.png)

### Scenario 2: value changes + back navigation

After changing control values, navigating, and going back, the plugin restores values from URL state:

![History restore QuerySyncState state](img/image2.png)

## Direct observer root

To scope this plugin MutationObserver:

```html
<section data-pp-observe-root-query-sync-state>
  ...
</section>
```

Root priority:

1. `data-pp-observe-root-query-sync-state`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro