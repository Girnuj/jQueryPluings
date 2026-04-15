# ItemRemover

Native JavaScript plugin to remove HTML elements from a list or collection.

## Requirements

- A modern browser with support for `MutationObserver`, `WeakMap`, and `queueMicrotask`
- A trigger with `data-role="remove-item"`
- An optional target selector via `data-remove-target` or `targetItemSelector`

## Installation

Include only the plugin:

```html
<script src="./itemRemover.js"></script>
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
