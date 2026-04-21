# InfinitePager

## Que hace

InfinitePager carga contenido paginado con `fetch` en dos modos:

- boton "ver mas" (`mode="button"`)
- infinite scroll con `IntersectionObserver` (`mode="scroll"`)

## Que resuelve

En listados de productos, tablas o feeds, evita recargas completas de pagina y permite cargar resultados por bloques.

## Beneficios

- UX mas fluida para datos paginados.
- Soporte `button` e `infinite scroll`.
- Auto-init por `data-*` y API publica.
- Eventos para integrar estados externos.
- Compatible con observer root del repositorio.

## Requisitos

- JavaScript ECMAScript 2020.
- Navegador con `fetch` e `IntersectionObserver`.

## Incluir en HTML

```html
<script src="./infinitePager.min.js"></script>
```

## Uso basico

```html
<ul id="productsList"></ul>

<button
  data-role="infinite-pager"
  data-pager-endpoint="/api/products"
  data-pager-target="#productsList"
  data-pager-mode="button"
  data-pager-page-size="12"
>
  Ver mas
</button>
```

## Atributos principales

- `data-role="infinite-pager"`: activa plugin en el trigger.
- `data-pager-endpoint="/url"`: endpoint paginado.
- `data-pager-target="#selector"`: contenedor donde se agrega el HTML.
- `data-pager-mode="button|scroll"`: modo de carga.
- `data-pager-method="GET|POST"`: metodo HTTP.
- `data-pager-headers-json='{"Authorization":"Bearer token"}'`: headers extra en formato JSON.
- `data-pager-initial-page="1"`: pagina inicial.
- `data-pager-page-size="10"`: tamano de pagina.
- `data-pager-page-param="page"`: nombre de query param de pagina.
- `data-pager-page-size-param="pageSize"`: nombre de query param de tamano.
- `data-pager-response-mode="auto|html|json"`: modo de parseo de respuesta.
- `data-pager-html-path="html"`: ruta del HTML cuando la respuesta es JSON.
- `data-pager-items-path="items"`: ruta de items cuando respuesta es JSON.
- `data-pager-has-more-path="hasMore"`: ruta booleana para saber si hay mas.
- `data-pager-next-page-path="nextPage"`: ruta para siguiente pagina.
- `data-pager-auto-load="true|false"`: carga inicial automatica.
- `data-pager-stop-on-empty="true|false"`: finaliza si no llega contenido.
- `data-pager-root-margin="300px 0px"`: `rootMargin` en modo scroll.
- `data-pager-threshold="0"`: threshold del observer.
- `data-pager-sentinel="#selector"`: sentinel custom para modo scroll.
- `data-pager-same-origin="true|false"`: restringe requests al mismo origen.

Compatibilidad: `data-ip-*` sigue soportado temporalmente por retrocompatibilidad.

## API publica

```html
<script>
  const trigger = document.querySelector('[data-role="infinite-pager"]');

  const instance = window.Plugins.InfinitePager.init(trigger, {
    mode: 'button',
    endpoint: '/api/products',
    targetSelector: '#productsList'
  });

  instance.loadNext();
  instance.reset({ clearTarget: false });

  window.Plugins.InfinitePager.getInstance(trigger);
  window.Plugins.InfinitePager.destroy(trigger);
  window.Plugins.InfinitePager.initAll(document);
  window.Plugins.InfinitePager.destroyAll(document);
</script>
```

## Eventos

- `before.plugin.infinitePager`: antes del request (cancelable).
- `success.plugin.infinitePager`: request exitoso y contenido agregado.
- `error.plugin.infinitePager`: error en request o parseo.
- `complete.plugin.infinitePager`: fin de ciclo de carga.
- `end.plugin.infinitePager`: no hay mas paginas.

## Demo

- `test-infinite-pager.html`
- `test-infinite-pager-scroll.html`

## Configuracion Del Observer Del Plugin

Si quieres limitar el `MutationObserver` de este plugin a un contenedor especifico, define un root directo:

```html
<section data-pp-observe-root-infinite-pager>...</section>
```

Prioridad de root para el plugin:

1. `data-pp-observe-root-infinite-pager`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro