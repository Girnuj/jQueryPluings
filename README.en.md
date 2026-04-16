# Plugins

## Introduction

At some point, we have all needed to solve tasks like opening a modal, removing a DOM element, or moving it to a different position.
This repository is a collection of useful native JavaScript plugins to make that work easier, without external libraries and without writing too much repetitive code.

Each plugin includes its source version (`.js`) so you can adapt it to your needs, and its minified version (`.min.js`) for direct usage.
It can be useful for POC, SPA, or enterprise projects, working only with native JavaScript and HTML attributes.

If this is your first time here, I recommend reviewing at least each plugin README to quickly understand what problem it solves and how to integrate it.

A collection of JavaScript plugins for DOM manipulation, organized by folder.
No external dependencies.
These are automatically initialized when they detect the necessary HTML attributes, so you don't have to worry about writing JS; you can also opt for manual initialization.

## Available Plugins

- `ImgUploadPreview`: previews selected image files in an `<img>` element.
- `VideoUrlPreview`: previews YouTube videos in an `<iframe>` from a URL.
- `ItemMover`: moves list elements up or down using `data-*` trigger attributes.
- `ItemRemover`: removes container elements from a delete trigger.
- `ReplaceMe`: replaces a trigger with remote HTML fetched through `POST` or `GET`.
- `TemplateRenderizer`: renders HTML templates by replacing placeholders like `{{property}}` and nested paths.
- `InputSwitchFriendly`: displays friendly labels based on a switch/checkbox state.
- `ChildSelect`: loads dependent options into a child select based on parent select value.
- `Modal`: opens and closes modals using HTML triggers with `data-*` attributes and optional API.

## General Requirements

- JavaScript using ECMAScript 2020 (ECMA-2020) syntax

Functional plugins in native JavaScript.
ECMAScript 2020 is supported by most modern browsers.

## Minified Versions

Each plugin includes a minified build (`*.min.js`) inside its own folder.
If you do not need to read or debug source code, use the minified file for a lighter production integration.


## Repository Structure

Each plugin lives in its own folder and should include its documentation:

```text
PluginsPublicos/
  PluginName/
    plugin.js
    plugin.min.js
    README.md
    test-pluginName.html
```

Current example:

```text
PluginsPublicos/
  VideoUrlPreview/
    VideoUrlPreview.js
    VideoUrlPreview.min.js
    README.md
    README.en.md
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

Maintain a simple, reusable, and well-documented plugin library so that anyone can quickly integrate them into their projects by copying the JS(pluginName.js) or its .min version, and adding it to the required project views in a very simple and lightweight way.
