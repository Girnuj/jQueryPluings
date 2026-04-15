# Plugins

A collection of JavaScript plugins for DOM manipulation, organized by folder.
No external dependencies.
These are automatically initialized when they detect the necessary HTML attributes, so you don't have to worry about writing JS; you can also opt for manual initialization.

## General Requirements

- JavaScript using ECMAScript 2020 (ECMA-2020) syntax

Functional plugins in native JavaScript.
ECMAScript 2020 is supported by most modern browsers.

## Available Plugins

- `ImgUploadPreview`: previews selected image files in an `<img>` element.
- `VideoUrlPreview`: previews YouTube videos in an `<iframe>` from a URL.
- `ItemMover`: moves list elements up or down using `data-*` trigger attributes.
- `ItemRemover`: removes container elements from a delete trigger.
- `ReplaceMe`: replaces a trigger with remote HTML fetched through `POST`.

## Repository Structure

Each plugin lives in its own folder and should include its documentation:

```text
PluginsPublicos/
  PluginName/
    plugin.js
    README.md
    test-pluginName.html
```

Current example:

```text
PluginsPublicos/
  VideoUrlPreview/
    VideoUrlPreview.js
    README.md
    test-video-url-preview.html
```

## Recommended Convention For New Plugins

Inside each plugin folder:

1. Main plugin file (`.js`).
2. `README.md` explaining:
   - What the plugin does.
   - Requirements.
   - How to include it in HTML.
   - Minimal usage example.
   - Available options and `data-*` attributes (if applicable).
3. Optional test HTML file for quick validation.

## Goal

Maintain a simple, reusable, and well-documented plugin library so that anyone can quickly integrate them into their projects by simply copying the JS(pluginName.js) and incorporating them into their projects or necessary views.
