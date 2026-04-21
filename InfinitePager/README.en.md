# InfinitePager

## What it does

InfinitePager loads paginated content with `fetch` in two modes:

- "load more" button (`mode="button"`)
- infinite scroll with `IntersectionObserver` (`mode="scroll"`)

## Problem it solves

For product lists, tables, or feeds, it avoids full page reloads and loads results in chunks.

## Benefits

- Smoother UX for paginated data.
- `button` and `infinite scroll` support.
- `data-*` auto-init and public API.
- Lifecycle events for integrations.
- Compatible with repository observer root pattern.

## Requirements

- JavaScript ECMAScript 2020.
- Browser with `fetch` and `IntersectionObserver`.

## Include in HTML

```html
<script src="./infinitePager.min.js"></script>
```

## Basic usage

```html
<ul id="productsList"></ul>

<button
  data-role="infinite-pager"
  data-pager-endpoint="/api/products"
  data-pager-target="#productsList"
  data-pager-mode="button"
  data-pager-page-size="12"
>
  Load more
</button>
```

## Main attributes

- `data-role="infinite-pager"`: enables plugin on trigger.
- `data-pager-endpoint="/url"`: paginated endpoint.
- `data-pager-target="#selector"`: container where HTML is appended.
- `data-pager-mode="button|scroll"`: loading mode.
- `data-pager-method="GET|POST"`: HTTP method.
- `data-pager-headers-json='{"Authorization":"Bearer token"}'`: extra headers in JSON format.
- `data-pager-initial-page="1"`: initial page.
- `data-pager-page-size="10"`: page size.
- `data-pager-page-param="page"`: page query param name.
- `data-pager-page-size-param="pageSize"`: page size query param name.
- `data-pager-response-mode="auto|html|json"`: response parsing mode.
- `data-pager-html-path="html"`: HTML path when response is JSON.
- `data-pager-items-path="items"`: items path when response is JSON.
- `data-pager-has-more-path="hasMore"`: boolean path for more pages.
- `data-pager-next-page-path="nextPage"`: next page path.
- `data-pager-auto-load="true|false"`: auto-load on init.
- `data-pager-stop-on-empty="true|false"`: stop when response is empty.
- `data-pager-root-margin="300px 0px"`: observer `rootMargin` in scroll mode.
- `data-pager-threshold="0"`: observer threshold.
- `data-pager-sentinel="#selector"`: custom sentinel for scroll mode.
- `data-pager-same-origin="true|false"`: restrict requests to same origin.

Compatibility: `data-ip-*` is still supported temporarily for backward compatibility.

## Public API

```html
<script>
  const trigger = document.querySelector('[data-role="infinite-pager"]');

  const instance = window.Plugins.InfinitePager.init(trigger, {
    mode: 'button',
    endpoint: '/api/products',
    targetSelector: '#productsList'
  });

  instance.loadNext();
  instance.reset({ clearTarget: false });

  window.Plugins.InfinitePager.getInstance(trigger);
  window.Plugins.InfinitePager.destroy(trigger);
  window.Plugins.InfinitePager.initAll(document);
  window.Plugins.InfinitePager.destroyAll(document);
</script>
```

## Events

- `before.plugin.infinitePager`: before request (cancelable).
- `success.plugin.infinitePager`: request succeeded and content appended.
- `error.plugin.infinitePager`: request or parsing error.
- `complete.plugin.infinitePager`: load cycle finished.
- `end.plugin.infinitePager`: no more pages available.

## Demo

- `test-infinite-pager.html`
- `test-infinite-pager-scroll.html`

## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-infinite-pager>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-infinite-pager`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro