# NotificationPush

## Que hace

NotificationPush permite disparar notificaciones tipo toast desde un boton/enlace con `data-*` y construir un payload dinamico sin usar cache del navegador.

## Que viene a solucionar

En eCommerce y catalogos, normalmente hay que escribir JS repetido para tomar datos del item, mostrar un aviso y sincronizar un resumen lateral (carrito, favoritos, etc.).

## Beneficios

- Flujo declarativo por HTML con `data-notification-push`.
- Payload flexible con atributos dinamicos `data-np-name-*`.
- Permite enviar el push a otro elemento receptor en la misma vista.
- Puede mostrar toast y opcionalmente enviar la data por `fetch` con `cache: 'no-store'`.

## Requisitos

- JavaScript con sintaxis ECMAScript 2020.

## Cuando si funciona y cuando puede no funcionar

Funciona bien cuando:

- El trigger existe en el DOM y tiene `data-notification-push`.
- Si usas receptor, `data-np-target` apunta a un selector valido y presente en la vista.
- Los campos `data-np-field` existen en el alcance esperado (o configuras `data-np-field-root`).
- El endpoint permite CORS/credenciales segun tu configuracion cuando `data-np-send="true"`.

Puede no funcionar o verse incompleto cuando:

- El selector de `data-np-target` es invalido o no existe en ese momento.
- El trigger o receptor se elimina del DOM antes del click/proceso.
- Un bloqueador de red, CORS o error HTTP impide el envio al backend.
- Desactivas estilos internos (`data-np-inject-styles="false"`) y no defines CSS propio para los toasts.

## Incluir en HTML

```html
<script src="./notificationPush.min.js"></script>
```

## Concepto de receptor

El boton puede apuntar a otro elemento usando `data-np-target="#selector"`.
Ese elemento recibe la data push y dispara el evento `push.plugin.notificationPush`.

```html
<button
  data-notification-push
  data-np-target="#cartReceiver"
  data-np-name-product-id="P-1001"
>
  Agregar
</button>

<div id="cartReceiver" data-np-receiver data-np-receiver-format="json"></div>
```

## Atributos principales

- `data-notification-push`: activa el plugin en el trigger.
- `data-np-title`: titulo del toast.
- `data-np-message`: mensaje del toast.
- `data-np-type="success|info|warning|error"`: tipo visual de notificacion.
- `data-np-duration="4200"`: duracion en ms.
- `data-np-image="https://..."`: imagen opcional en toast.
- `data-np-target="#selector"`: elemento receptor de la data.
- `data-np-inject-styles="true|false"`: inyecta (o no) el CSS base del toast.
- `data-np-toast-class="clase1 clase2"`: clases extra para cada toast.
- `data-np-toast-container-class="clase1 clase2"`: clases extra para el contenedor global de toasts.

## Toasts incluidos por el plugin

El plugin trae 4 variantes visuales por defecto (cuando `data-np-inject-styles` es `true`):

- `success` -> clase `np-toast--success`
- `info` -> clase `np-toast--info`
- `warning` -> clase `np-toast--warning`
- `error` -> clase `np-toast--error`

Ejemplos:

```html
<button data-notification-push data-np-type="success" data-np-title="OK" data-np-message="Operacion correcta">Success</button>
<button data-notification-push data-np-type="info" data-np-title="Info" data-np-message="Dato informativo">Info</button>
<button data-notification-push data-np-type="warning" data-np-title="Warning" data-np-message="Revisa este punto">Warning</button>
<button data-notification-push data-np-type="error" data-np-title="Error" data-np-message="Algo salio mal">Error</button>
```

## Personalizacion de toast (tu propio estilo)

Si quieres controlar completamente el diseno, desactiva estilos internos y aplica tus clases:

```html
<button
  data-notification-push
  data-np-title="Custom"
  data-np-message="Toast con estilo propio"
  data-np-inject-styles="false"
  data-np-toast-class="mi-toast mi-toast--ok"
  data-np-toast-container-class="mi-toast-stack"
>
  Mostrar
</button>
```

Tambien puedes hacerlo por API:

```html
<script>
  NotificationPush.init(document.querySelector('[data-notification-push]'), {
    injectDefaultStyles: false,
    toastClass: 'mi-toast mi-toast--ok',
    toastContainerClass: 'mi-toast-stack'
  });
</script>
```

### Payload versatil (dinamico)

Cualquier atributo con prefijo `data-np-name-` entra al payload final.

Ejemplo:

- `data-np-name-stock="12"` -> `payload.stock = "12"`
- `data-np-name-size="42"` -> `payload.size = "42"`
- `data-np-name-currency="USD"` -> `payload.currency = "USD"`

Esto te permite enviar cualquier informacion sin cambiar el plugin.

## Envio opcional al backend (sin cache)

- `data-np-send="true|false"`
- `data-np-endpoint="/api/notify"`
- `data-np-method="POST|GET|..."`
- `data-np-headers-json='{"X-Key":"value"}'`
- `data-np-credentials="same-origin|include|omit"`

Cuando envia por `fetch`, el plugin usa `cache: 'no-store'`.

## Ejemplo minimo

```html
<button
  data-notification-push
  data-np-title="Producto agregado"
  data-np-message="Se agrego al carrito"
  data-np-type="success"
  data-np-target="#cartReceiver"
  data-np-name-product-id="P-1001"
  data-np-name-stock="12"
>
  Agregar al carrito
</button>

<div id="cartReceiver" data-np-receiver data-np-receiver-format="json"></div>
```

## API publica

```html
<script>
  const trigger = document.querySelector('[data-notification-push]');

  const instance = window.Plugins.NotificationPush.init(trigger, {
    defaultType: 'success',
    defaultDuration: 4200,
    showToast: true,
    injectDefaultStyles: true,
    toastClass: '',
    toastContainerClass: '',
    sendRequest: false,
    endpoint: '',
    requestMethod: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    onBeforePush: function (payload, triggerEl) {
      console.log('before', payload, triggerEl);
    },
    onShown: function (payload, triggerEl) {
      console.log('shown', payload, triggerEl);
    },
    onSent: function (payload, response, triggerEl) {
      console.log('sent', payload, response.status, triggerEl);
    },
    onError: function (error, payload, triggerEl) {
      console.log('error', error, payload, triggerEl);
    }
  });

  window.Plugins.NotificationPush.getInstance(trigger);
  window.Plugins.NotificationPush.destroy(trigger);
  window.Plugins.NotificationPush.initAll(document);
  window.Plugins.NotificationPush.destroyAll(document);
</script>
```

Metodos principales:

- `window.Plugins.NotificationPush.init(element, options)`: crea o reutiliza una instancia.
- `window.Plugins.NotificationPush.getInstance(element)`: devuelve la instancia actual o `null`.
- `window.Plugins.NotificationPush.destroy(element)`: destruye una instancia concreta.
- `window.Plugins.NotificationPush.initAll(root)`: inicializa todos los triggers compatibles.
- `window.Plugins.NotificationPush.destroyAll(root)`: destruye instancias dentro de un contenedor.

## Eventos

- `before.plugin.notificationPush`: antes de procesar el push (cancelable).
- `shown.plugin.notificationPush`: cuando se muestra la notificacion.
- `sent.plugin.notificationPush`: cuando el envio al backend fue exitoso.
- `error.plugin.notificationPush`: cuando ocurre error de envio/proceso.
- `push.plugin.notificationPush`: evento emitido en el receptor con el payload.

## Demo

- `test-notification-push.html`

## Vista previa

Muestra del HTML de ejemplo con algunas notificaciones:

![Vista previa NotificationPush](./img/image.png)

## Configuracion Del Observer Del Plugin

Si quieres limitar el `MutationObserver` de este plugin a un contenedor especifico, define un root directo:

```html
<section data-pp-observe-root-notification-push>...</section>
```

Prioridad de root para el plugin:

1. `data-pp-observe-root-notification-push`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro