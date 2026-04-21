# Plugin Integration

This directory contains a practical example of how to orchestrate multiple plugins on a single screen without turning them into a monolithic plugin.

Main file:
- test-plugin-integration.html

Additional file (network resiliency):
- test-plugin-integration-offline-action-queue.html

## Combined Plugins

- Modal: UI container for confirmation flows or data capture.
- FormValidate: validates rules declared with `data-fv-*` attributes and blocks submit when errors exist.
- ConfirmAction: asks for confirmation before executing sensitive actions (submit/click).
- FormRequest: runs the async request and renders response in the target.
- RequestState: displays visual lifecycle states (loading/success/error/idle).
- NotificationPush: triggers a visual push and tracking payload.

## Recommended Principle

Assign a clear role to each plugin:
- Request owner: FormRequest.
- Validation owner: FormValidate.
- Confirmation owner: ConfirmAction.
- Visual state owner: RequestState.
- Notification owner: NotificationPush.

This approach avoids duplicated responsibilities and makes debugging easier.

## Suggested Flow Order

1. User attempts to submit the form.
2. FormValidate validates and cancels submit if there are errors.
3. ConfirmAction asks for confirmation (if enabled).
4. FormRequest performs the request.
5. RequestState reflects the lifecycle state.
6. NotificationPush communicates the result to the user.

## Tips For Combining Plugins

- Avoid having two plugins sending the same request.
- Use custom events as bridges between plugins (`before/success/error/complete`).
- Keep separate UI targets for state, response, and notifications.
- In local demos, use fetch mocks to avoid backend dependency.

## Observer Strategy Per Plugin

When multiple plugins coexist in the same view, it is recommended to define direct roots per plugin to limit each `MutationObserver` scope and improve performance.

Important:

- Plugins can also be used without declaring direct roots; in that case they use normal fallback (`data-pp-observe-root` on `<html>` or `document.body`).
- You can declare multiple observer attributes on the same element if that container is shared by multiple plugin responsibilities.

Recommended example:

```html
<main id="integration-root">
	<section data-pp-observe-root-form-request>...</section>
	<section data-pp-observe-root-request-state>...</section>
	<section data-pp-observe-root-notification-push>...</section>
	<section data-pp-observe-root-form-validate>...</section>
	<section data-pp-observe-root-confirm-action>...</section>
</main>
```

It is also valid to concentrate multiple attributes on a single node:

```html
<section
	data-pp-observe-root-form-request
	data-pp-observe-root-request-state
	data-pp-observe-root-notification-push
>
	...
</section>
```

Plugin root priority rule:

1. `data-pp-observe-root-{plugin}`
2. `data-pp-observe-root` declared on `<html>`
3. `document.body`

If you prefer fully manual initialization for tightly controlled scenarios:

```html
<html data-pp-observe-global="false"></html>
<script>
	window.Modal.initAll(document);
	window.FormValidate.initAll(document);
	window.ConfirmAction.initAll(document);
	window.FormRequest.initAll(document);
	window.RequestState.initAll(document);
	window.NotificationPush.initAll(document);
</script>
```
#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## Note

This example is intended for learning and integration testing. You can copy this pattern and adapt it by module or screen in your real project.
