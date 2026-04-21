# ItemRemover

Native JavaScript plugin to remove HTML elements from a list or collection.

## Problem it solves

Solves repeated remove-item behavior in dynamic UIs without duplicating container lookup and node cleanup code.

## Benefits

- Speeds up remove actions in interfaces.
- Avoids duplicated removal handlers.
- Supports flexible targeting via attributes or options.
- Improves maintainability in repetitive components.

## Requirements

- A modern browser with support for `MutationObserver`, `WeakMap`, and `queueMicrotask`
- A trigger with `data-role="remove-item"`
- An optional target selector via `data-remove-target` or `targetItemSelector`

## Installation

Include only the plugin:

```html
<script src="./itemRemover.js"></script>
```

For production usage, if you do not need to read the source code, you can include the minified file:

```html
<script src="./itemRemover.min.js"></script>
```

## Basic Usage

```html
<ul>
  <li class="task-item" data-remove-item="item">
    <span>Task 1</span>
    <button type="button" data-role="remove-item">Remove</button>
  </li>
</ul>
```

That is enough. The plugin initializes automatically when the DOM is ready.

## How It Works

- Finds elements with `data-role="remove-item"`.
- Resolves the element to remove using `closest`.
- Uses `targetItemSelector = [data-remove-item="item"]` by default.
- If found, removes the target node from the DOM on click.

## Options

- `targetItemSelector`: selector of the container node to remove.

You can configure it from manual initialization or attribute:

- suggested attribute: `data-remove-target=".my-item"`
- JS option: `{ targetItemSelector: '.my-item' }`

## Supported `data-*` attributes

- `data-role="remove-item"`: marks the trigger that performs removal through auto-init. Status: **required for auto-initialization**.
- `data-remove-target`: selector used to define the container to remove with `closest(...)`. Status: **optional**.
- `data-remove-item="item"`: suggested marker for the default removable container. Status: **optional** (recommended if `data-remove-target` is not used).

## Automatic Initialization

The plugin auto-initializes on:

- `[data-role="remove-item"]`

It also uses `MutationObserver` to initialize triggers added dynamically to the DOM and tear down instances when those nodes actually leave the document.

## Manual Initialization (optional)

```html
<script>
  ItemRemover.init(document.querySelector('#removeBtn'));
  ItemRemover.initAll(document.querySelector('#myList'));
</script>
```

## Public API

```html
<script>
  const trigger = document.querySelector('#removeBtn')
      , instance = ItemRemover.init(trigger);

  ItemRemover.getInstance(trigger);
  ItemRemover.destroy(trigger);
  ItemRemover.destroyAll(document.querySelector('#myList'));

  instance.destroy();
</script>
```

- `ItemRemover.init(element, options)`: creates or reuses an instance.
- `ItemRemover.getInstance(element)`: returns the current instance or `null`.
- `ItemRemover.destroy(element)`: tears down a specific instance.
- `ItemRemover.destroyAll(root)`: tears down all instances inside a container.
- `instance.destroy()`: removes listeners for the current instance.

In normal usage you do not need to call `destroy()`: if the node is removed from the DOM, the plugin attempts to tear it down automatically.

## Common Errors

- Trigger is not an `HTMLElement`: `init` throws.
- Target selector does not resolve a container: click does nothing.

## Demo

You can open the test file included in this project:

- `test-item-remover.html`

## Example Preview

Initial HTML state:

![ItemRemover initial example](./img/image.png)

State after adding some items and removing others:

![ItemRemover with added and removed items](./img/image2.png)


## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-item-remover>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-item-remover`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro