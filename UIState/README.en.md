# UIState

Native JavaScript plugin to preview and switch UI states (loading, empty, error, success, disabled) without rewriting component logic.

## Problem it solves

In real projects, teams need to validate multiple visual states of the same component (loading, empty, error, success), and that often leads to repetitive code or manual HTML edits.

UIState centralizes that workflow into a single API and `data-*` attributes, so development, QA, and design can iterate states quickly and consistently.

## Benefits

- Reduces repetitive state-handling code in each component.
- Improves design-development collaboration by previewing real UI states.
- Speeds up visual QA with live state switching through triggers or API.
- Preserves visual consistency with per-state classes and templates.
- Simplifies demos and handoff without relying on backend responses.

## Requirements

- Modern browser with support for `CustomEvent`, `WeakMap`, and `MutationObserver`.
- Components marked with `data-ui-state-host`.

## Installation

```html
<script src="./uiState.min.js"></script>
```

For production, use `uiState.min.js`. If you need debugging or customization, use `uiState.js`.

## Basic Usage

```html
<div id="cardA" data-ui-state-host data-ui-template-loading="#tplLoading" data-ui-template-error="#tplError">
  <h3>My component</h3>
  <p>Initial content.</p>
</div>

<button data-ui-state-trigger data-ui-state-target="#cardA" data-ui-state="loading">Loading</button>
<button data-ui-state-trigger data-ui-state-target="#cardA" data-ui-state="error" data-ui-state-message="Could not load data">Error</button>
<button data-ui-state-trigger data-ui-state-target="#cardA" data-ui-state="restore">Restore</button>

<template id="tplLoading"><p>Loading...</p></template>
<template id="tplError"><p>Error: {{message}}</p></template>
```

## How It Works

- Initializes components with `data-ui-state-host`.
- Listens to triggers with `data-ui-state-trigger` and applies state to target.
- Can render templates for each state.
- Emits events for metrics, debug, and custom flows.
- Can restore original component HTML.

## Supported `data-*` attributes

On host:

- `data-ui-state-host`: enables plugin on the component. Status: **required**.
- `data-ui-state-base="default"`: base state used on restore. Status: **optional**.
- `data-ui-state-class-prefix="is-state-"`: prefix for state classes. Status: **optional**.
- `data-ui-state-disable-on="loading,disabled"`: states that disable inner controls. Status: **optional**.
- `data-ui-state-interactive-selector="button,a,input,select,textarea"`: interactive controls selector. Status: **optional**.
- `data-ui-template-loading="#tplLoading"`: template for loading state. Status: **optional**.
- `data-ui-template-empty="#tplEmpty"`: template for empty state. Status: **optional**.
- `data-ui-template-error="#tplError"`: template for error state. Status: **optional**.
- `data-ui-template-success="#tplSuccess"`: template for success state. Status: **optional**.
- `data-ui-state-class-loading="class1 class2"`: class(es) for loading state. Status: **optional**.
- `data-ui-state-class-empty="class1 class2"`: class(es) for empty state. Status: **optional**.
- `data-ui-state-class-error="class1 class2"`: class(es) for error state. Status: **optional**.
- `data-ui-state-class-success="class1 class2"`: class(es) for success state. Status: **optional**.

On trigger:

- `data-ui-state-trigger`: marks the trigger. Status: **required on trigger**.
- `data-ui-state-target="#idHost"`: target host selector. Status: **required on trigger**.
- `data-ui-state="loading|error|success|restore"`: state to apply. Status: **required on trigger**.
- `data-ui-state-message="text"`: optional message for template interpolation. Status: **optional**.
- `data-ui-state-html="<div>..."`: optional direct HTML to render. Status: **optional**.

## Public API

```html
<script>
  const host = document.querySelector('#cardA');

  const instance = window.Plugins.UIState.init(host, {
    baseState: 'default',
    classPrefix: 'is-state-',
    disableOnStates: ['loading', 'disabled'],
    templates: {
      loading: '<p>Loading module...</p>'
    },
    beforeChange: function (detail) {
      console.log('before', detail);
    },
    afterChange: function (detail) {
      console.log('changed', detail);
    },
    afterRestore: function (detail) {
      console.log('restored', detail);
    }
  });

  instance.setState('loading', { message: 'Processing' });
  instance.setState('error', { message: 'Not available' });
  instance.restore();

  window.Plugins.UIState.getInstance(host);
  window.Plugins.UIState.destroy(host);
  window.Plugins.UIState.initAll(document);
  window.Plugins.UIState.destroyAll(document);
</script>
```

Main methods:

- window.Plugins.UIState.init(element, options): creates or reuses a host instance.
- instance.setState(state, payload): applies a visual state with optional payload.
- instance.restore(): restores original content and base state.
- window.Plugins.UIState.getInstance(element): returns current instance or null.
- window.Plugins.UIState.destroy(element): destroys a specific instance.
- window.Plugins.UIState.initAll(root): initializes all compatible hosts in a container.
- window.Plugins.UIState.destroyAll(root): destroys all instances in a container.

### Multiple classes per state

You can define multiple classes separated by spaces directly on host data attributes:

```html
<article
  id="cardA"
  data-ui-state-host
  data-ui-state-class-loading="is-state-loading u-glow u-fade"
  data-ui-state-class-error="is-state-error u-outline-error u-border-strong"
  data-ui-state-class-success="is-state-success u-glow"
></article>
```

You can also configure it through JS initialization using `stateClassMap`:

```html
<script>
  window.UIState.init(document.querySelector('#cardA'), {
    stateClassMap: {
      loading: 'is-state-loading u-glow u-fade',
      error: 'is-state-error u-outline-error u-border-strong',
      success: 'is-state-success u-glow'
    }
  });
</script>
```

## Plugin Events

- `before.plugin.uiState`: before changing state (cancelable).
- `changed.plugin.uiState`: after state is applied.
- `restored.plugin.uiState`: when base state is restored.

## Demo

- `test-ui-state.html`
- Includes a floating designer panel to apply states and messages live.

## Preview

![UIState demo](./img/image.png)

## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-ui-state>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-ui-state`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro