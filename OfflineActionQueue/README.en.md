# OfflineActionQueue

## What it does

OfflineActionQueue queues user actions when network fails or connectivity is unavailable, then retries them in order when connection comes back.

## Problem it solves

In mobile scenarios, corporate VPNs, or unstable networks, create/edit/delete actions may be lost.
The browser does not provide a persistent queue with ordered replay and retry policy for this flow.

## Benefits

- Persistent queue in `localStorage`.
- Ordered replay (FIFO) to preserve action sequence.
- Exponential backoff retries.
- Declarative `data-*` integration plus public API.
- Hooks and events for telemetry, UI, and conflict handling.

## Requirements

- JavaScript using ECMAScript 2020 syntax.

## Include in HTML

```html
<script src="./offlineActionQueue.js"></script>
```

## Minimal usage

```html
<section data-oaq-config='{"storageKey":"queue:tasks","maxRetries":5,"baseRetryDelayMs":900,"queueOnHttpErrors":true,"tryImmediate":true}'>
<button
  data-offline-action-queue
  data-oaq-endpoint="/api/tasks"
  data-oaq-method="POST"
  data-oaq-name-title="New task"
  data-oaq-name-priority="high">
  Create resilient task
</button>
</section>
```

## Compact configuration and inheritance

You can reduce per-element attributes using JSON config and reusable profiles:

- `data-oaq-config='{"maxRetries":6,...}'`: block JSON options.
- `data-oaq-profile="profileName"`: applies a profile registered via API.
- Parent inheritance: if an ancestor defines `data-oaq-config` or `data-oaq-profile`, its options are inherited by child triggers.
- Merge priority: defaults -> ancestors -> element (`data-oaq-profile`/`data-oaq-config`) -> direct `data-oaq-*` overrides -> `init` options.

Profile example:

```html
<section data-oaq-profile="ordersCreate">
  <form
    data-offline-action-queue
    data-oaq-endpoint="/api/orders"
    data-oaq-method="POST"
    data-oaq-payload-mode="form">
    ...
  </form>
</section>

<script>
  OfflineActionQueue.registerProfile('ordersCreate', {
    storageKey: 'queue:orders',
    maxRetries: 6,
    baseRetryDelayMs: 800,
    maxRetryDelayMs: 12000,
    queueOnHttpErrors: true,
    tryImmediate: true
  });
</script>
```

## data-* attributes

- `data-offline-action-queue`: enables the plugin.
- `data-oaq-endpoint="/api/..."`: action target endpoint.
- `data-oaq-method="POST|PUT|PATCH|DELETE|GET"`: HTTP method.
- `data-oaq-action-type="create|edit|delete|..."`: functional action label.
- `data-oaq-payload-mode="auto|form|json|dataset"`: payload source mode.
- `data-oaq-payload-json='{"foo":"bar"}'`: inline JSON payload.
- `data-oaq-name-*="value"`: dataset payload entries.
- `data-oaq-headers='{"X-Tenant":"acme"}'`: JSON headers.
- `data-oaq-config='{"maxRetries":6,...}'`: compact JSON config on element/container.
- `data-oaq-profile="ordersCreate"`: applies a reusable profile registered via API.
- `data-oaq-storage-key="offlineActionQueue:items"`: persistence key.
- `data-oaq-timeout="12000"`: request timeout in ms.
- `data-oaq-max-retries="5"`: retry limit.
- `data-oaq-base-retry-delay="1000"`: retry backoff base in ms.
- `data-oaq-max-retry-delay="60000"`: retry backoff max in ms.
- `data-oaq-auto-flush-on-online="true|false"`: auto flush on `online` event.
- `data-oaq-auto-flush-on-init="true|false"`: auto flush on init.
- `data-oaq-flush-interval="0"`: periodic flush in ms (`0` disables).
- `data-oaq-queue-on-http-errors="true|false"`: whether HTTP failures are queued.
- `data-oaq-conflict-statuses="409,412"`: statuses treated as conflict.
- `data-oaq-try-immediate="true|false"`: try immediate send when online.
- `data-oaq-prevent-default="true|false"`: prevents native click behavior.

## Public API

- `window.Plugins.OfflineActionQueue.init(element, options)`
- `window.Plugins.OfflineActionQueue.getInstance(element)`
- `window.Plugins.OfflineActionQueue.destroy(element)`
- `window.Plugins.OfflineActionQueue.initAll(root)`
- `window.Plugins.OfflineActionQueue.destroyAll(root)`
- `window.Plugins.OfflineActionQueue.registerProfile(name, options)`
- `window.Plugins.OfflineActionQueue.getProfile(name)`
- `window.Plugins.OfflineActionQueue.hasProfile(name)`
- `window.Plugins.OfflineActionQueue.unregisterProfile(name)`
- `window.Plugins.OfflineActionQueue.listProfiles()`

Instance methods:

- `instance.flush()`
- `instance.clearQueue()`
- `instance.getQueueSnapshot()`
- `instance.getQueueSize()`
- `instance.enqueueFromEvent(evt)`

## Events

- `queued.plugin.offlineActionQueue`: action queued.
- `sent.plugin.offlineActionQueue`: action sent successfully.
- `failed.plugin.offlineActionQueue`: action discarded after final failure.
- `conflict.plugin.offlineActionQueue`: conflict detected (e.g. 409/412).
- `drained.plugin.offlineActionQueue`: queue empty after flush.

## Hooks (options)

- `onQueued(action, element)`
- `onSent(action, result, element)`
- `onFailed(action, result, element)`
- `onConflict(context, element)`
- `onDrained(element)`
- `customBuildAction({ event, element, options })`
- `customSendAction(action, element)`

## Demo

- `test-offline-action-queue.html`

## Plugin Observer Configuration

Optional direct root for this plugin:

```html
<section data-pp-observe-root-offline-action-queue>...</section>
```

Root priority:

1. `data-pp-observe-root-offline-action-queue`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro