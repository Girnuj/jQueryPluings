# ReplaceMe

Native JavaScript plugin to replace an element with remote HTML or JSON on click.

## Problem it solves

It resolves the partial loading of remote HTML on specific areas of the view without requiring a complete rendering framework. Compatible with over-the-wire HTML architectures and microservices that return HTML fragments or JSON responses with embedded HTML.

## Benefits

- Enables low-cost, partial UI updates.
- Avoids full reloads for minor changes.
- Simplifies integration with endpoints that return HTML or JSON.
- Supports replacing any DOM element, not just the trigger.
- Full lifecycle with cancelable events.
- Native protection against double-clicks and concurrent requests.
- Reduces boilerplate size for dynamic placeholders.

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

1. Finds elements with `data-role="replace-me"`.
2. On click, emits `replace-me:before` (cancelable). If canceled, stops.
3. Prevents double click while the request is in progress.
4. Sends an HTTP request with `fetch` to the configured endpoint.
5. Resolves the target node: `data-replace-me-target` or the trigger itself.
6. In `html` mode: injects the response directly.
7. In `json` mode: extracts HTML from the configured key, or redirects if a redirect key is present.
8. Destroys the instance before touching the DOM (avoids orphaned references).
9. Emits `replace-me:success` or `replace-me:error` as appropriate.
10. Always emits `replace-me:after` at the end.

## Options

- `replaceSourceUrl`: URL used to request remote HTML.
- `requestMethod`: HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Default: `POST`.
- `responseMode`: Response mode (`html` or `json`). Default: `html`.
- `targetSelector`: CSS selector for the element to replace. Default: the trigger itself.
- `jsonHtmlKey`: Key in the JSON object containing the HTML to inject. Default: `html`.
- `jsonRedirectKey`: Key in the JSON object indicating a redirect URL. Default: `redirect`.

You can configure it by attribute or manual initialization:

- attribute: `data-replace-me-src="/path"`
- optional attribute: `data-replace-me-method="GET"`
- optional attribute: `data-replace-me-mode="html"`
- optional attribute: `data-replace-me-target="#myElement"`
- JS option: `{ replaceSourceUrl: '/path', requestMethod: 'GET', responseMode: 'html', targetSelector: '#myElement' }`

## Supported `data-*` attributes

- `data-role="replace-me"`: marks the trigger to be replaced by remote HTML in auto-init. **Required**.
- `data-replace-me-src`: source URL for the remote HTML. **Required**.
- `data-replace-me-method`: HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Optional (default: `POST`).
- `data-replace-me-mode`: response mode (`html` | `json`). Optional (default: `html`).
- `data-replace-me-target`: CSS selector for the element to replace. Optional (default: the trigger itself).
- `data-replace-me-json-html`: Key in the JSON object containing the HTML to inject. Optional (default: `html`).
- `data-replace-me-json-redirect`: Key in the JSON object indicating a redirect URL. Optional (default: `redirect`).
## Lifecycle Events

- `replace-me:before`: Fired before fetch. Cancelable with evt.preventDefault(). detail: { trigger, target, options }
- `replace-me:success`: Fired after successful replacement. detail: { trigger, target, html, raw } (raw = text or JSON depending on mode)
- `replace-me:error`: Fired if an error occurs during replacement. detail: { trigger, target, error }
- `replace-me:after`: Always fired at the end, regardless of result. detail: { trigger, target }

You can listen to these events to integrate custom logic:

```html
<script>
  // Conditionally cancel an operation
  document.addEventListener('replace-me:before', (e) => {
    if (!confirm('Do you confirm this action?')) e.preventDefault();
  });
 
  // React to success
  document.addEventListener('replace-me:success', (e) => {
    console.log('Injected HTML:', e.detail.html);
  });
 
  // Handle errors visually
  document.addEventListener('replace-me:error', (e) => {
    console.error('Failed:', e.detail.error.message);
  });
</script>
```

## Security and Microfrontends

- Remote HTML is sanitized before injection (using the native Sanitizer API if available).
- Compatible with microfrontend architectures: after replacement, all plugins are automatically re-initialized on the new node.
- If the remote HTML has a single root node, `replaceWith` is used for maximum security and Web Components compatibility.
- If there is more than one root node, `outerHTML` is used (classic mode, less secure but compatible).

## Automatic Initialization

The plugin auto-initializes on:

- `[data-role="replace-me"]`

It also uses `MutationObserver` to initialize triggers added dynamically to the DOM and tear down instances when those nodes actually leave the document.

## Manual Initialization (optional)

```html
<script>
  window.Plugins.ReplaceMe.init(document.querySelector('#myTrigger'));
  window.Plugins.ReplaceMe.initAll(document.querySelector('#myContainer'));
</script>
```

## Public API

```html
<script>
  const trigger = document.querySelector('#myTrigger')
      , instance = window.Plugins.ReplaceMe.init(trigger);

  window.Plugins.ReplaceMe.getInstance(trigger);
  window.Plugins.ReplaceMe.destroy(trigger);
  window.Plugins.ReplaceMe.destroyAll(document.querySelector('#myContainer'));

  instance.destroy();
</script>
```

- `window.Plugins.ReplaceMe.init(element, options)`: creates or reuses an instance.
- `window.Plugins.ReplaceMe.getInstance(element)`: returns the current instance or `null`.
- `window.Plugins.ReplaceMe.destroy(element)`: tears down a specific instance.
- `window.Plugins.ReplaceMe.destroyAll(root)`: tears down all instances inside a container.
- `instance.destroy()`: removes listeners for the current instance.

In normal usage you do not need to call `destroy()`: if the node is removed from the DOM, the plugin attempts to tear it down automatically.

## Common Errors

- Missing both `data-replace-me-src` and `replaceSourceUrl`: `init` throws.
- Invalid HTTP method: `init` throws (only `GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
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