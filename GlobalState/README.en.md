# GlobalState

Micro-plugin for global state management and pub/sub event system in native JavaScript.
Allows you to share data and react to state changes or custom events between views, components, or plugins, with no external dependencies.

## What is it for?
- Share global data between different parts of the app (SPA, multipage, plugins).
- Communicate decoupled components via custom events.
- Facilitate integration between plugins and complex views.

## Installation

Include the file in your HTML:

```html
<script src="GlobalState/globalState.js"></script>
```

## API

### Global state (key/value)
- `GlobalState.set(key, value)` — Stores a global value and notifies subscribers of the key.
- `GlobalState.get(key)` — Gets the value of a global key.
- `GlobalState.subscribe(key, callback)` — Subscribes a function to changes of a key.
- `GlobalState.unsubscribe(key, callback)` — Removes a subscription to a key.

### Custom events (pub/sub)
- `GlobalState.publish(event, payload)` — Publishes a global event with data.
- `GlobalState.on(event, callback)` — Subscribes a function to a custom event.
- `GlobalState.off(event, callback)` — Removes a subscription to a custom event.

### Utility
- `GlobalState.clear()` — Clears all state and subscriptions (for testing or reset).

## Usage example

```js
// Store and read global state
window.Plugins.GlobalState.set('user', {name: 'Ana'});
const user = window.Plugins.GlobalState.get('user');

// Subscribe to changes of a key
window.Plugins.GlobalState.subscribe('user', (newValue) => {
  console.log('User updated', newValue);
});

// Publish a custom event
window.Plugins.GlobalState.publish('notification', {message: 'Hello!'});

// Subscribe to a custom event
window.Plugins.GlobalState.on('notification', (payload) => {
  alert(payload.message);
});
```

## Difference with NotificationPush

Although both allow global and decoupled communication, their purpose is different:

- **GlobalState**: manages global data (key/value) and generic pub/sub events, with no UI logic. It's ideal for sharing information or triggering events between any part of the app, but does not show visual messages to the user.
- **NotificationPush**: focused on showing visual notifications (toast) and sending messages to a receiver or endpoint. Its goal is immediate user feedback and visual integration.

They can complement each other: for example, you can trigger a visual notification with NotificationPush when an important value changes in GlobalState.

## Recommendations
- Use it to share data or events between plugins, views, or components that do not communicate directly.
- Do not abuse global state for everything; use it only when you really need to share information or events.

---

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro