# ImgUploadPreview

Native JavaScript plugin to preview images in an `<img>` from an `<input type="file">`.

## Problem it solves

Avoids trial-and-error uploads by letting users validate the selected image before submitting the form.

## Benefits

- Improves UX with immediate visual feedback.
- Reduces incorrect file upload mistakes.
- Removes repetitive `FileReader` boilerplate per view.
- Integrates quickly through `data-*` attributes.

## Requirements

- A modern browser with support for `FileReader`, `MutationObserver`, and `WeakMap`
- An `<input>` with the `data-img-upload-preview-target` attribute
- A target `<img>`

## Installation

Include only the plugin:

```html
<script src="./imgUploadPreview.js"></script>
```

For production usage, if you do not need to read the source code, you can include the minified file:

```html
<script src="./imgUploadPreview.min.js"></script>
```

## Basic Usage

```html
<input
  type="file"
  accept="image/*"
  data-img-upload="input"
  data-img-upload-preview-target="#imgPreview1" />

<img id="imgPreview1" alt="Preview" />
```

That is enough. The plugin initializes automatically when the DOM is ready.

## How It Works

- Reads the `<img>` selector from `data-img-upload-preview-target`.
- On `change`, takes the selected file and generates a preview using `FileReader`.
- If no file is selected, clears the `<img>` `src`.
- If the file does not pass type or size validation, clears preview and resets the input.

## Supported `data-*` attributes

- `data-img-upload="input"`: marks the `<input type="file">` as an auto-init subject. Status: **required**.
- `data-img-upload-preview-target`: CSS selector of the `<img>` where the preview is rendered. Status: **required**.

## Validations

The plugin includes internal validations:

- Allowed MIME type (`allowedMimeTypes`)
- Maximum file size (`maxFileSize`)

Defaults:

- `allowedMimeTypes`: `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`
- `maxFileSize`: `2 * 1024 * 1024` (2 MB)

These options can be customized as needed. They provide reliable plugin-level validation and complement `accept="image/*"` on the input.

## Options (customizable)

```html
<script>
  ImgUploadPreview.init(document.querySelector('#myInput'), {
    targetItemSelector: '#imgPreview1',
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxFileSize: 5 * 1024 * 1024 // 5 MB
  });
</script>
```

## Automatic Initialization

The plugin auto-initializes on:

- `input[data-img-upload="input"]`
- `input[data-img-upload-preview-target]`

It also uses `MutationObserver` to initialize inputs added dynamically to the DOM and tear down instances when those nodes actually leave the document.

## Manual Initialization (optional)

If you need to initialize a specific block manually:

```html
<script>
  ImgUploadPreview.init(document.querySelector('#myInput'));
  // or on a full container
  ImgUploadPreview.initAll(document.querySelector('#myForm'));
</script>
```

## Public API

```html
<script>
  const input = document.querySelector('#myInput')
      , instance = ImgUploadPreview.init(input);

  ImgUploadPreview.getInstance(input);
  ImgUploadPreview.destroy(input, { clearPreview: true });
  ImgUploadPreview.destroyAll(document.querySelector('#myForm'));

  instance.destroy();
</script>
```

- `ImgUploadPreview.init(element, options)`: creates or reuses an instance.
- `ImgUploadPreview.getInstance(element)`: returns the current instance or `null`.
- `ImgUploadPreview.destroy(element, options)`: tears down a specific instance.
- `ImgUploadPreview.destroyAll(root, options)`: tears down all instances inside a container.
- `instance.destroy(options)`: removes listeners for the current instance.
- `clearPreview: true`: option to clear the `<img>` `src` on destroy.

In normal usage you do not need to call `destroy()`: if the node is removed from the DOM, the plugin attempts to tear it down automatically.

## Common Errors

- Missing `data-img-upload-preview-target`: throws an error.
- Selector not found: shows `console.warn`.
- Selector does not point to an `<img>`: throws an error.

## Demo

You can open the test file included in this project:

- `test-img-upload-preview.html`

## Example Preview

Initial HTML state (no file selected):

![ImgUploadPreview initial example](./img/image.png)

State after selecting an image in the input (preview is shown):

![ImgUploadPreview with selected image](./img/image2.png)


## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-img-upload-preview>...</section>
```

Plugin root priority:

1. `data-pp-observe-root-img-upload-preview`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

#### ℹ️ For details on the observer pattern and how to optimize automatic plugin initialization, see the section [Recommended Observer Pattern](../README.en.md#recommended-observer-pattern) in the main README.

## License

This plugin is distributed under the MIT license.
See the LICENSE file in the repository root for full terms.

Copyright (c) 2026 Samuel Montenegro