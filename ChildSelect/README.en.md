# ChildSelect

Native JavaScript plugin for dependent selects (parent-child) with dynamic option loading via `fetch`.

## Requirements

- A modern browser with support for `fetch`, `MutationObserver`, `WeakMap`, and `URL`
- A parent `<select>` with `data-role="parent-select"`
- A child `<select>` selector with `data-child-select`
- A data endpoint URL with `data-children-url`

## Installation

Include only the plugin:

```html
<script src="./childselect.js"></script>
```

## Usage 1: Simple Parent-Child with `fetch`

```html
<select
  id="categorySelect"
  data-role="parent-select"
  data-child-select="#subcategorySelect"
  data-children-url="/api/subcategories"
  data-value-property="id"
  data-text-property="name">
  <option value="">Select category</option>
  <option value="frontend">Frontend</option>
  <option value="backend">Backend</option>
</select>

<select id="subcategorySelect">
  <option value="">-------</option>
</select>
```

## Usage 2: Chained Parent-Child (3 levels)

```html
<select
  id="categorySelect"
  data-role="parent-select"
  data-child-select="#subcategorySelect"
  data-children-url="/api/subcategories"
  data-value-property="id"
  data-text-property="name">
  <option value="">Select category</option>
  <option value="frontend">Frontend</option>
  <option value="backend">Backend</option>
</select>

<select
  id="subcategorySelect"
  data-role="parent-select"
  data-child-select="#technologySelect"
  data-children-url="/api/technologies"
  data-value-property="id"
  data-text-property="name">
  <option value="">-------</option>
</select>

<select id="technologySelect">
  <option value="">-------</option>
</select>
```

In both cases, the plugin uses `fetch` to load data and initializes automatically when the DOM is ready.

## How It Works

- Listens for changes on parent select (`data-role="parent-select"`).
- Calls `fetch` on `data-children-url` with params from `getParamsForChildren(parentValue)`.
- Clears and rebuilds child select options.
- Supports multi-level chaining (example: category -> subcategory -> technology).
- Supports flat and grouped data (`grouped`).
- Can retain child value, auto-select when a single option is returned, and disable child select when empty.

## Supported `data-*` attributes

- `data-child-select`
- `data-children-url`
- `data-value-property`
- `data-text-property`
- `data-group-options-property`
- `data-group-text-property`
- `data-grouped`
- `data-empty-text`
- `data-auto-select-single`
- `data-disable-when-empty`
- `data-loading-class`

## Manual Initialization (optional)

```html
<script>
  ChildSelect.init(document.querySelector('#countrySelect'));
  ChildSelect.initAll(document.querySelector('#formFilters'));
</script>
```

## Public API

```html
<script>
  const parentSelect = document.querySelector('#countrySelect')
      , instance = ChildSelect.init(parentSelect, {
          childrenUrl: '/api/cities',
          childSelectSelector: '#citySelect'
        });

  ChildSelect.getInstance(parentSelect);
  ChildSelect.destroy(parentSelect);
  ChildSelect.destroyAll(document.querySelector('#formFilters'));

  instance.destroy();
</script>
```

- `ChildSelect.init(element, options)`: creates or reuses an instance.
- `ChildSelect.getInstance(element)`: returns current instance or `null`.
- `ChildSelect.destroy(element)`: tears down a specific instance.
- `ChildSelect.destroyAll(root)`: tears down all instances inside a container.
- `instance.destroy()`: removes listeners for the current instance.

## Common Errors

- Missing `data-child-select`: throws an error.
- Missing `data-children-url`: throws an error.
- Child selector does not exist in DOM: logs a warning and skips updates.

## Demo

You can open the test file included in this project:

- `test-child-select.html`
