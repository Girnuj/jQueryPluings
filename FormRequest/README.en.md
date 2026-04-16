# FormRequest

Native JavaScript plugin to submit forms with `fetch` using `data-*` attributes, with HTML or JSON response handling.

## Important note

With plain HTML, a form with `method` and `action` can already submit data without this plugin.

This plugin adds an extra layer for modern scenarios:

- Avoid full page reload with async `fetch` submission.
- Render HTML responses into a target without repetitive custom code.
- Handle field-level errors when backend returns JSON with `errors`.
- Apply loading state, lifecycle events, and concurrent request cancellation.
- Add security and resilience controls (same-origin, CSRF, timeout, retry, GET debounce).

## Requirements

- Modern browser with support for `fetch`, `FormData`, `CustomEvent`, `AbortController`, and `MutationObserver`.
- Forms with `data-form-request` attribute.

## Installation

```html
<script src="./formRequest.min.js"></script>
```

For production, use `formRequest.min.js`. If you need debugging, you can use `formRequest.js`.

## Basic Usage

```html
<form
  data-form-request
  action="/api/users"
  method="post"
  data-form-target="#result"
>
  <input name="name" required />
  <button type="submit">Save</button>
</form>

<div id="result"></div>
```

## How It Works

- Intercepts form `submit` and prevents full page reload.
- Builds a `fetch` request based on `method` (`GET`, `POST`, etc.).
- If method is `GET`, fields are serialized into query string.
- If method is not `GET`, data is sent as `FormData` in body.
- If `debounceGetMs` is configured, GET requests are delayed to reduce repeated calls.
- If `timeoutMs` is configured, slow requests are aborted automatically.
- If `retryCount` is configured, transient failures/configured statuses are retried.
- Automatically adds CSRF token on non-GET/HEAD methods when meta/token is available.
- Processes HTML or JSON responses and emits lifecycle events.

## Supported `data-*` attributes

- `data-form-request`: enables the plugin. Status: **required**.
- `data-form-target="#selector"`: target to render HTML responses. Status: **optional**.
- `data-form-method="GET|POST|PUT|PATCH|DELETE"`: HTTP method override. Status: **optional**.
- `data-form-response="auto|html|json"`: forces expected response type. Status: **optional**.
- `data-form-reset-on-success="true|false"`: resets form on successful responses. Status: **optional**.
- `data-form-loading-class="class"`: class applied while request is in progress. Status: **optional**.
- `data-form-same-origin="true|false"`: URL origin restriction. Status: **optional**.
- `data-form-allowed-methods="GET,POST"`: allowed HTTP methods list. Status: **optional**.
- `data-form-credentials="same-origin|include|omit"`: fetch credentials mode. Status: **optional**.
- `data-form-prevent-concurrent="true|false"`: abort previous request before sending a new one. Status: **optional**.
- `data-form-timeout="15000"`: request timeout in milliseconds. Status: **optional**.
- `data-form-retry-count="1"`: retry attempts on failure. Status: **optional**.
- `data-form-retry-delay="300"`: delay in ms between retries. Status: **optional**.
- `data-form-retry-statuses="408,429,500,502,503,504"`: HTTP statuses eligible for retry. Status: **optional**.
- `data-form-debounce-get="300"`: debounce in ms for GET requests. Status: **optional**.
- `data-form-csrf-meta="csrf-token"`: meta name containing CSRF token. Status: **optional**.
- `data-form-csrf-header="X-CSRF-Token"`: CSRF header name. Status: **optional**.
- `data-form-csrf-token="token"`: explicit CSRF token via attribute. Status: **optional**.

## Public API

```html
<script>
  const form = document.querySelector('form[data-form-request]');

  const instance = window.FormRequest.init(form, {
    sameOrigin: true,
    allowedMethods: ['GET', 'POST'],
    responseType: 'auto',
    resetOnSuccess: false,
    timeoutMs: 15000,
    retryCount: 1,
    retryDelayMs: 300,
    retryOnStatuses: [408, 429, 500, 502, 503, 504],
    debounceGetMs: 300,
    csrfMetaName: 'csrf-token',
    csrfHeaderName: 'X-CSRF-Token',
    csrfToken: '',
    beforeSend: function (url, requestInit, formEl) {
      console.log('before', url, requestInit, formEl);
    },
    onSuccess: function (data, response, formEl) {
      console.log('success', data, response.status, formEl);
    },
    onError: function (data, response, error, formEl) {
      console.log('error', data, response, error, formEl);
    },
    onComplete: function (formEl) {
      console.log('complete', formEl);
    }
  });

  window.FormRequest.getInstance(form);
  window.FormRequest.destroy(form);
  window.FormRequest.initAll(document);
  window.FormRequest.destroyAll(document);
</script>
```

## Plugin Events

- `before.plugin.formRequest`: before running `fetch` (cancelable).
- `success.plugin.formRequest`: when response is successful.
- `error.plugin.formRequest`: when response fails or an exception occurs.
- `complete.plugin.formRequest`: when request lifecycle ends.

## Security

- Blocks unsafe protocols (only `http`/`https`).
- Can block cross-origin URLs with `sameOrigin: true`.
- Restricts HTTP methods with `allowedMethods`.
- Adds CSRF header automatically for non-GET/HEAD methods when token is available.
- Supports timeout and retry for better reliability on unstable networks.

## Demo

- `test-form-request.html`
