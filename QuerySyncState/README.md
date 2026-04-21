# QuerySyncState

Plugin nativo para sincronizar controles UI con query params de la URL en tiempo real.

Resuelve una necesidad comun en SPAs y vistas con filtros: compartir estado por URL sin reescribir codigo de `history`, `popstate`, parseo y rehidratacion manual.

## Que problema resuelve

- Mantener filtros, busquedas y orden visibles en la URL.
- Restaurar el estado de controles al abrir un link compartido.
- Soportar navegacion atras/adelante del navegador sin perder coherencia.
- Evitar bucles de sincronizacion UI <-> URL.

## Requisitos

- JavaScript ECMAScript 2020.

## Inclusión

```html
<script src="querySyncState.js"></script>
```

## Uso minimo

```html
<input
  type="search"
  data-role="query-sync-state"
  data-qss-key="q"
  data-qss-type="string"
  data-qss-history="replace"
  data-qss-debounce="250"
  placeholder="Buscar..."
/>
```

Con eso:

- El valor del input se sincroniza en `?q=...`.
- Al recargar la pagina o usar atras/adelante, el input se rehidrata desde la URL.

## Atributos disponibles

- `data-role="query-sync-state"`: marca el control como sujeto del plugin.
- `data-qss-key="q"`: nombre del query param a sincronizar.
- `data-qss-type="string|number|boolean|csv|json"`: tipo para parseo/serializacion.
- `data-qss-history="replace|push"`: estrategia de historial al escribir URL.
- `data-qss-debounce="250"`: debounce en ms para sincronizacion desde UI.
- `data-qss-default="valor"`: valor por defecto cuando el param no existe.
- `data-qss-omit-default="true|false"`: si es `true`, omite el param cuando coincide con default.
- `data-qss-reset-page-key="page"`: borra ese param cuando cambia este filtro.
- `data-qss-sync-on-init="true|false"`: aplica rehidratacion desde URL al iniciar.
- `data-qss-trim="true|false"`: recorta espacios en inputs de texto.

## API publica

- `window.Plugins.QuerySyncState.init(element, options)`
- `window.Plugins.QuerySyncState.getInstance(element)`
- `window.Plugins.QuerySyncState.destroy(element)`
- `window.Plugins.QuerySyncState.initAll(root)`
- `window.Plugins.QuerySyncState.destroyAll(root)`

Metodos de instancia:

- `instance.syncFromUrl(source?, event?)`
- `instance.syncToUrl(source?, event?)`
- `instance.reset({ syncToUrl?: boolean })`

## Eventos custom

- `before.plugin.querySyncState` (cancelable)
- `sync.plugin.querySyncState`
- `error.plugin.querySyncState`
- `complete.plugin.querySyncState`

## Demo

- [test-query-sync-state.html](test-query-sync-state.html)

### Escenario 1: HTML inicial

Estado inicial del demo sin query params y con valores por defecto:

![Estado inicial QuerySyncState](img/image.png)

### Escenario 2: cambio de valores + volver atras

Despues de cambiar valores en los controles, navegar y volver atras, el plugin restaura los valores desde la URL:

![Restauracion por historial QuerySyncState](img/image2.png)

## Root directo para observer

Si quieres limitar el `MutationObserver` para este plugin:

```html
<section data-pp-observe-root-query-sync-state>
  ...
</section>
```

Prioridad de root:

1. `data-pp-observe-root-query-sync-state`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro