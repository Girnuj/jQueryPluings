# ReplaceMe

Native JavaScript plugin to replace an element with remote HTML on click.

## Problem it solves

Solves partial remote HTML updates for specific UI areas without requiring a full client-side rendering framework.

## Benefits

- Enables lightweight partial UI updates.
- Avoids full reloads for localized changes.
- Simplifies integration with HTML-returning endpoints.
- Reduces boilerplate for dynamic placeholders.

## Requirements

- A modern browser with support for `fetch`, `MutationObserver`, `WeakMap`, and `queueMicrotask`
- A trigger with `data-role="replace-me"`
- A source URL via `data-replace-me-src` or `replaceSourceUrl`
- Configurable HTTP method (`GET` or `POST`)

## Installation

Include only the plugin:

```html
<script src="./replaceMe.js"></script>
```

For production usage, if you do not need to read the source code, you can include the minified file:

```html
<script src="./replaceMe.min.js"></script>
```

## Basic Usage

```html
<button
  type="button"
  data-role="replace-me"
  data-replace-me-src="/my-html-endpoint">
  Load content
</button>
```

That is enough. The plugin initializes automatically when the DOM is ready.

## GET Method Usage

```html
<button
  type="button"
  data-role="replace-me"
  data-replace-me-src="/my-html-endpoint"
  data-replace-me-method="GET">
  Load content via GET
</button>
```

## How It Works

- Finds elements with `data-role="replace-me"`.
- On click, sends a configurable `GET` or `POST` request with `fetch` to `replaceSourceUrl`.
- If the response is OK, replaces the trigger with returned HTML.
- If it fails, disables the trigger when possible.

## Options

- `replaceSourceUrl`: URL used to request remote HTML.
- `requestMethod`: HTTP method (`GET` or `POST`). Default: `POST`.

You can configure it by attribute or manual initialization:

- attribute: `data-replace-me-src="/path"`
- optional attribute: `data-replace-me-method="GET"`
- JS option: `{ replaceSourceUrl: '/path', requestMethod: 'GET' }`

## Supported `data-*` attributes

- `data-role="replace-me"`: marks the trigger that will be replaced by remote HTML in auto-init. Status: **required for auto-initialization**.
- `data-replace-me-src`: source URL used to request remote HTML. Status: **required**.
- `data-replace-me-method`: HTTP method for the request (`GET` or `POST`). Status: **optional** (default is `POST`).

## Automatic Initialization

The plugin auto-initializes on:

- `[data-role="replace-me"]`

It also uses `MutationObserver` to initialize triggers added dynamically to the DOM and tear down instances when those nodes actually leave the document.

## Manual Initialization (optional)

```html
<script>
  ReplaceMe.init(document.querySelector('#myTrigger'));
  ReplaceMe.initAll(document.querySelector('#myContainer'));
</script>
```

## Public API

```html
<script>
  const trigger = document.querySelector('#myTrigger')
      , instance = ReplaceMe.init(trigger);

  ReplaceMe.getInstance(trigger);
  ReplaceMe.destroy(trigger);
  ReplaceMe.destroyAll(document.querySelector('#myContainer'));

  instance.destroy();
</script>
```

- `ReplaceMe.init(element, options)`: creates or reuses an instance.
- `ReplaceMe.getInstance(element)`: returns the current instance or `null`.
- `ReplaceMe.destroy(element)`: tears down a specific instance.
- `ReplaceMe.destroyAll(root)`: tears down all instances inside a container.
- `instance.destroy()`: removes listeners for the current instance.

In normal usage you do not need to call `destroy()`: if the node is removed from the DOM, the plugin attempts to tear it down automatically.

## Common Errors

- Missing both `data-replace-me-src` and `replaceSourceUrl`: `init` throws.
- Invalid HTTP method: `init` throws (only `GET` or `POST`).
- Endpoint returns HTTP error: trigger is disabled (when possible).

## Demo

You can open the test file included in this project:

- `test-replace-me.html`

## Example Preview

Initial HTML state:

![ReplaceMe initial example](./img/image.png)

State after replacing content by clicking buttons in the HTML:

![ReplaceMe with replaced content](./img/image2.png)


## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-replace-me>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-replace-me`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro