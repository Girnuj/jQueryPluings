# ItemMover

Native JavaScript plugin to move HTML elements inside a list or collection.

## Requirements

- A modern browser with support for `MutationObserver`, `WeakMap`, and `queueMicrotask`
- A trigger element with `data-role="move-item"`
- A target selector with `data-move-target`

## Installation

Include only the plugin:

```html
<script src="./itemMover.js"></script>
```

For production usage, if you do not need to read the source code, you can include the minified file:

```html
<script src="./itemMover.min.js"></script>
```

## Basic Usage

```html
<ul>
  <li class="task-item">
    <button
      type="button"
      data-role="move-item"
      data-move-target=".task-item"
      data-move-direction="previous">
      Move Up
    </button>
    Item A
  </li>

  <li class="task-item">
    <button
      type="button"
      data-role="move-item"
      data-move-target=".task-item"
      data-move-direction="next">
      Move Down
    </button>
    Item B
  </li>
</ul>
```

That is enough. The plugin initializes automatically when the DOM is ready.

## How It Works

- Finds elements with `data-role="move-item"`.
- Uses `data-move-target` to resolve the current item (`closest`).
- Uses `data-move-direction` to choose previous or next sibling.
- Swaps both nodes in the DOM.

## Supported Directions

- `previous`
- `next`

## Supported `data-*` attributes

- `data-role="move-item"`: marks the trigger that performs the move through auto-init. Status: **required for auto-initialization**.
- `data-move-target`: selector used with `closest(...)` to resolve the item that will be moved. Status: **required**.
- `data-move-direction`: move direction (`previous` to move up, `next` to move down). Status: **optional** (default is `next`).

## Automatic Initialization

The plugin auto-initializes on:

- `[data-role="move-item"]`

It also uses `MutationObserver` to initialize triggers added dynamically to the DOM and tear down instances when those nodes actually leave the document.

## Manual Initialization (optional)

```html
<script>
  ItemMover.init(document.querySelector('#moveBtn'));
  ItemMover.initAll(document.querySelector('#myList'));
</script>
```

## Public API

```html
<script>
  const trigger = document.querySelector('#moveBtn')
      , instance = ItemMover.init(trigger);

  ItemMover.getInstance(trigger);
  ItemMover.destroy(trigger);
  ItemMover.destroyAll(document.querySelector('#myList'));

  instance.destroy();
</script>
```

- `ItemMover.init(element, options)`: creates or reuses an instance.
- `ItemMover.getInstance(element)`: returns the current instance or `null`.
- `ItemMover.destroy(element)`: tears down a specific instance.
- `ItemMover.destroyAll(root)`: tears down all instances inside a container.
- `instance.destroy()`: removes listeners for the current instance.

In normal usage you do not need to call `destroy()`: if the node is removed from the DOM, the plugin attempts to tear it down automatically.

## Common Errors

- Missing `data-move-target`: throws an error.
- Invalid `data-move-direction`: throws an error.

## Demo

You can open the test file included in this project:

- `test-item-mover.html`

## Example Preview

Initial HTML state:

![ItemMover initial example](./img/image.png)

State with some items moved from their original position:

![ItemMover with moved items](./img/image2.png)

