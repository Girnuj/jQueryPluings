# ReplaceMe

Native JavaScript plugin to replace an element with remote HTML on click.

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
