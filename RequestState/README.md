# RequestState

## Que hace

RequestState gestiona estados visuales de acciones asincronas en triggers HTML (`button`, `a`, `form`, etc.) usando `data-*`.
Permite manejar `idle`, `loading`, `success` y `error` sin repetir logica en cada vista.

## Que viene a solucionar

En la mayoria de proyectos se repite codigo para:

- deshabilitar botones durante una accion,
- mostrar feedback de exito o error,
- resetear estados visuales,
- probar UI de estados sin backend real.

RequestState unifica ese flujo en un plugin declarativo y reusable.

## Origen y alcance

RequestState se inicio principalmente con la idea de ejecutar peticiones y mostrar contenido de forma declarativa en la interfaz, evitando repetir logica de `fetch` y feedback visual en cada vista.

Con el tiempo evoluciono a un plugin bastante completo: ademas de manejar request/respuesta, hoy cubre estados de ciclo (`idle/loading/success/error`), mensajes, clases por estado, retries, timeout, modo mock para QA, payload dinamico y eventos para integrarse con otros plugins como `FormRequest` y `FormValidate`.

## Beneficios

- Flujo declarativo por HTML con `data-request-state`.
- Estados UI estandar (`idle/loading/success/error`) para cualquier framework.
- Simulacion de exito/error (`data-rs-mock`) para QA y pruebas visuales.
- Request opcional real via `fetch` con timeout y `cache: 'no-store'`.
- Reintentos configurables para errores transitorios.
- Soporte directo para `submit` en formularios con `data-request-state`.
- Render declarativo de respuesta en un nodo objetivo (`response target`).
- API publica para integracion manual y hooks por evento.

## Integracion con FormRequest y FormValidate

Este plugin se integra perfectamente con:

- `FormValidate`: valida reglas y bloquea envio si hay errores.
- `FormRequest`: ejecuta el envio real por `fetch`.
- `RequestState`: muestra estados visuales (`idle/loading/success/error`) y controla UX del trigger.

Recomendacion para evitar doble envio:

- Deja un solo responsable del request real (normalmente `FormRequest`).
- Usa `RequestState` para estado visual del boton/form y feedback de interfaz.

## Requisitos

- JavaScript con sintaxis ECMAScript 2020.

## Incluir en HTML

```html
<script src="./requestState.min.js"></script>
```

Para depuracion o desarrollo puedes usar `requestState.js`.

## Atributos principales

- `data-request-state`: activa plugin en trigger.
- `data-rs-target="#selector"`: nodo donde aplicar clases/estado principal.
- `data-rs-message-target="#selector"`: nodo donde escribir mensajes de estado.
- `data-rs-loading-text="Procesando..."`: texto en `loading`.
- `data-rs-success-text="Listo"`: texto en `success`.
- `data-rs-error-text="Error"`: texto en `error`.
- `data-rs-loading-class="mi-loading"`: clase CSS para estado `loading`.
- `data-rs-success-class="mi-success"`: clase CSS para estado `success`.
- `data-rs-error-class="mi-error"`: clase CSS para estado `error`.
- `data-rs-idle-class="mi-idle"`: clase CSS para estado `idle`.
- `data-rs-delay="700"`: retardo previo en ms.
- `data-rs-auto-reset="1800"`: vuelve a `idle` tras ese tiempo.
- `data-rs-disable-on-loading="true|false"`: cuando es `true`, bloquea interaccion mientras el estado no sea `idle` (`loading`, `success`, `error`).
- `data-rs-mock="success|error"`: fuerza resultado simulado.
- `data-rs-send="true|false"`: habilita request real.
- `data-rs-endpoint="/api/action"`: endpoint para request.
- `data-rs-method="GET|POST|..."`: metodo HTTP.
- `data-rs-timeout="12000"`: timeout en ms.
- `data-rs-retry-count="2"`: cantidad de reintentos.
- `data-rs-retry-delay="350"`: espera entre reintentos en ms.
- `data-rs-retry-statuses="408,429,500,502,503,504"`: estados HTTP reintentables.
- `data-rs-headers-json='{"X-Key":"value"}'`: headers extra.
- `data-rs-payload-json='{"id":10}'`: payload JSON base para metodos con body.
- `data-rs-response-target="#selector"`: nodo donde renderizar respuesta/error.
- `data-rs-response-mode="auto|text|json|html"`: modo de render en response target.
- `data-rs-name-*`: payload dinamico (ej. `data-rs-name-item-id="P-100"`).

## Submit en formularios

Si `data-request-state` se define sobre un `<form>`, el plugin intercepta `submit` automaticamente.

```html
<form
  data-request-state
  data-rs-send="true"
  data-rs-endpoint="/api/profile"
  data-rs-method="POST"
  data-rs-loading-text="Guardando..."
  data-rs-success-text="Perfil actualizado"
  data-rs-error-text="No se pudo guardar"
>
  <input type="text" name="name" value="Samuel" />
  <button type="submit">Guardar</button>
</form>
```

El payload incluye campos del formulario + `data-rs-name-*` + `data-rs-payload-json`.

## Bloqueo de multiples clics

Para evitar dobles envios, el plugin solo permite ejecutar cuando el estado es `idle`.

- Si esta en `loading`, `success` o `error`, ignora nuevos clics/submits.
- Con `data-rs-disable-on-loading="true"`, el trigger se deshabilita visual y funcionalmente fuera de `idle`.
- Si quieres volver a habilitar automaticamente, define `data-rs-auto-reset` (ms) para regresar a `idle`.

## Response target

Puedes renderizar la respuesta (o error) en un nodo declarativo:

```html
<button
  data-request-state
  data-rs-send="true"
  data-rs-endpoint="/api/demo"
  data-rs-method="GET"
  data-rs-response-target="#serverResponse"
  data-rs-response-mode="json"
>
  Consultar
</button>

<pre id="serverResponse"></pre>
```

## Clases CSS por atributo

Tambien puedes pasar nombres de clases CSS por atributo para controlar el estilo de cada estado.

Nombres exactos de atributos:

- `data-rs-loading-class`
- `data-rs-success-class`
- `data-rs-error-class`
- `data-rs-idle-class`

Ejemplo:

```html
<button
  data-request-state
  data-rs-target="#boxA"
  data-rs-loading-class="u-loading"
  data-rs-success-class="u-success"
  data-rs-error-class="u-error"
  data-rs-idle-class="u-idle"
  data-rs-mock="success"
>
  Ejecutar
</button>
```

## Ejemplo minimo

```html
<button
  data-request-state
  data-rs-target="#saveState"
  data-rs-message-target="#saveMessage"
  data-rs-loading-text="Guardando..."
  data-rs-success-text="Guardado"
  data-rs-error-text="No se pudo guardar"
  data-rs-mock="success"
  data-rs-auto-reset="1400"
>
  Guardar cambios
</button>

<div id="saveState" data-rs-state="idle">
  <span id="saveMessage"></span>
</div>
```

## API publica

```html
<script>
  const trigger = document.querySelector('[data-request-state]');

  const instance = window.RequestState.init(trigger, {
    delayMs: 500,
    autoResetMs: 1800,
    retryCount: 1,
    retryDelayMs: 350,
    retryStatuses: [408, 429, 500, 502, 503, 504],
    disableOnLoading: true,
    sendRequest: false,
    endpoint: '',
    method: 'GET',
    timeoutMs: 12000,
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'RequestState' },
    loadingClass: 'is-loading',
    successClass: 'is-success',
    errorClass: 'is-error',
    idleClass: 'is-idle',
    loadingText: 'Procesando...',
    successText: 'Completado.',
    errorText: 'Ocurrio un error.',
    responseTarget: '',
    responseMode: 'auto',
    mockResult: '',
    onBefore: function (ctx) {
      console.log('before', ctx);
    },
    onStateChange: function (state, ctx) {
      console.log('state', state, ctx);
    },
    onSuccess: function (ctx) {
      console.log('success', ctx);
    },
    onError: function (ctx) {
      console.log('error', ctx);
    },
    onComplete: function (ctx) {
      console.log('complete', ctx);
    }
  });

  window.RequestState.getInstance(trigger);
  window.RequestState.destroy(trigger);
  window.RequestState.initAll(document);
  window.RequestState.destroyAll(document);
</script>
```

Metodos principales:

- `window.RequestState.init(element, options)`: crea o reutiliza instancia.
- `window.RequestState.getInstance(element)`: devuelve la instancia o `null`.
- `window.RequestState.destroy(element)`: destruye una instancia concreta.
- `window.RequestState.initAll(root)`: inicializa todos los triggers compatibles.
- `window.RequestState.destroyAll(root)`: destruye instancias dentro de un contenedor.

## Eventos

- `before.plugin.requestState`: antes del flujo (cancelable).
- `state.plugin.requestState`: cada cambio de estado (`idle/loading/success/error`).
- `success.plugin.requestState`: cuando termina en exito.
- `error.plugin.requestState`: cuando termina en error.
- `complete.plugin.requestState`: fin del ciclo.

## Demo

- `test-request-state.html`
