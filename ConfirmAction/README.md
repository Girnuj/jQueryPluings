# ConfirmAction

Plugin JavaScript nativo para pedir confirmacion antes de ejecutar acciones destructivas o sensibles.

## Que viene a solucionar

En paneles admin, eCommerce o backoffice hay acciones con impacto alto (eliminar, cancelar, resetear, publicar).
Sin confirmacion, un click accidental puede generar perdida de datos o cambios no deseados.

## Beneficios

- Estandariza confirmaciones en toda la app con `data-*`.
- Evita confirmaciones duplicadas o logica repetida por vista.
- Funciona en botones, links y formularios.
- Permite desactivar/activar por atributo y escuchar eventos.
- Soporta confirmacion personalizada con contenedor propio o adapter async.
- Agrega control de UX: textos/clases de botones, Escape/outside click, `deny` y `preConfirm` async.

## Requisitos

- Navegador moderno con soporte para `CustomEvent` y `MutationObserver`.

## Instalacion

```html
<script src="./confirmAction.min.js"></script>
```

Para produccion, usa `confirmAction.min.js`. Para depurar, usa `confirmAction.js`.

## Uso Basico

### En un boton o link

```html
<button
  data-confirm-action
  data-ca-title="Eliminar producto"
  data-ca-message="Esta accion no se puede deshacer."
>
  Eliminar
</button>
```

### En un formulario

```html
<form
  data-confirm-action
  data-ca-title="Publicar cambios"
  data-ca-message="Se publicara el contenido en vivo."
  action="/api/publish"
  method="post"
>
  <button type="submit">Publicar</button>
</form>
```

## Atributos `data-*` soportados

- `data-confirm-action`: activa el plugin. Estado: **requerido**.
- `data-ca-title="Texto"`: titulo opcional mostrado en la confirmacion. Estado: **opcional**.
- `data-ca-message="Texto"`: mensaje principal de confirmacion. Estado: **opcional**.
- `data-ca-enabled="true|false"`: habilita o deshabilita la confirmacion. Estado: **opcional**.
- `data-ca-dialog="#selector"`: contenedor/dialog personalizado para confirmar. Estado: **opcional**.
- `data-ca-confirm-text="Texto"`: texto del boton confirmar. Estado: **opcional**.
- `data-ca-cancel-text="Texto"`: texto del boton cancelar. Estado: **opcional**.
- `data-ca-deny-text="Texto"`: texto del boton deny (si existe `[data-ca-deny]`). Estado: **opcional**.
- `data-ca-confirm-class="clase"`: clase(s) extra para boton confirmar. Estado: **opcional**.
- `data-ca-cancel-class="clase"`: clase(s) extra para boton cancelar. Estado: **opcional**.
- `data-ca-deny-class="clase"`: clase(s) extra para boton deny. Estado: **opcional**.
- `data-ca-loading-class="clase"`: clase aplicada durante `preConfirm`. Estado: **opcional**.
- `data-ca-allow-escape="true|false"`: permite cerrar con Escape. Estado: **opcional**.
- `data-ca-allow-outside-click="true|false"`: permite cerrar por click fuera del dialog custom. Estado: **opcional**.
- `data-ca-focus-confirm="true|false"`: enfoca el boton confirmar al abrir dialog custom. Estado: **opcional**.

## API publica

```html
<script>
  const subject = document.querySelector('[data-confirm-action]');

  const instance = window.Plugins.ConfirmAction.init(subject, {
    title: 'Eliminar registro',
    message: 'Esta accion no se puede deshacer.',
    enabled: true,
    dialogSelector: '#confirmDialog',
    preConfirm: async function () {
      await new Promise(function (resolve) { setTimeout(resolve, 600); });
      return true;
    },
    confirmAdapter: function (detail) {
      return window.confirm(detail.message);
    },
    beforeConfirm: function (detail, element) {
      console.log('before', detail.actionType, element);
    },
    onConfirm: function (detail, element) {
      console.log('confirmed', detail.actionType, element);
    },
    onCancel: function (detail, element) {
      console.log('cancelled', detail.actionType, element);
    }
  });

  window.Plugins.ConfirmAction.getInstance(subject);
  window.Plugins.ConfirmAction.destroy(subject);
  window.Plugins.ConfirmAction.initAll(document);
  window.Plugins.ConfirmAction.destroyAll(document);
</script>
```

## Confirmacion personalizada

Si defines `data-ca-dialog`, el plugin usa ese contenedor en vez de `window.confirm`.

El contenedor debe incluir:

- `[data-ca-dialog-title]`: titulo (opcional).
- `[data-ca-dialog-message]`: mensaje de confirmacion.
- `[data-ca-confirm]`: boton confirmar.
- `[data-ca-cancel]`: boton cancelar.
- `[data-ca-deny]`: boton deny (opcional).

Si no existe o falla, el plugin vuelve a `window.confirm` como fallback.

`preConfirm` permite validaciones async antes de confirmar (por ejemplo, una llamada al backend).
Si devuelve `false`, la accion no continua.

## Eventos

- `before.plugin.confirmAction`: antes de mostrar confirmacion (cancelable).
- `confirmed.plugin.confirmAction`: cuando el usuario confirma.
- `cancelled.plugin.confirmAction`: cuando el usuario cancela.
- `denied.plugin.confirmAction`: cuando el usuario selecciona deny.

## Casos recomendados

- Eliminar producto, categoria o usuario.
- Cancelar pedido o reembolso.
- Resetear configuracion o datos.
- Publicar contenido en produccion.

## Demo

- `test-confirm-action.html`

## Configuracion Del Observer Del Plugin

Si quieres limitar el `MutationObserver` de este plugin a un contenedor especifico, define un root directo:

```html
<section data-pp-observe-root-confirm-action>...</section>
```

Prioridad de root para el plugin:

1. `data-pp-observe-root-confirm-action`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro