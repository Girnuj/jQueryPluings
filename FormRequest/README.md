# FormRequest

Plugin JavaScript nativo para enviar formularios con `fetch` usando atributos `data-*`, con soporte para respuestas HTML o JSON.

## Aclaracion importante

Con HTML nativo, un formulario con `method` y `action` ya puede enviar datos sin este plugin.

Este plugin aporta una capa adicional para escenarios modernos:

- Evitar recarga completa de pagina con envio asincrono por `fetch`.
- Renderizar respuesta HTML en un target sin codigo repetitivo.
- Gestionar errores por campo cuando el backend responde JSON con `errors`.
- Aplicar loading, eventos de ciclo de vida y cancelacion de requests concurrentes.
- Agregar seguridad y resiliencia (same-origin, CSRF, timeout, retry, debounce GET).

## Requisitos

- Navegador moderno con soporte para `fetch`, `FormData`, `CustomEvent`, `AbortController` y `MutationObserver`.
- Formularios con atributo `data-form-request`.

## Instalacion

```html
<script src="./formRequest.min.js"></script>
```

Para produccion, usa `formRequest.min.js`. Si necesitas depurar, puedes usar `formRequest.js`.

## Uso Basico

```html
<form
  data-form-request
  action="/api/users"
  method="post"
  data-form-target="#result"
>
  <input name="name" required />
  <button type="submit">Guardar</button>
</form>

<div id="result"></div>
```

## Como Funciona

- Intercepta el `submit` del formulario y evita recarga de pagina.
- Construye la solicitud con `fetch` segun `method` (`GET`, `POST`, etc.).
- Si el metodo es `GET`, serializa campos en query string.
- Si el metodo es distinto de `GET`, envia `FormData` en el body.
- Si se configura `debounceGetMs`, retrasa requests GET para reducir llamadas repetidas.
- Si se configura `timeoutMs`, aborta solicitudes lentas automaticamente.
- Si se configura `retryCount`, reintenta en errores transitorios/estados configurados.
- Agrega token CSRF automaticamente en metodos no GET/HEAD cuando encuentra meta o token configurado.
- Procesa respuesta HTML o JSON y emite eventos del ciclo de vida.

## Atributos `data-*` soportados

- `data-form-request`: activa el plugin. Estado: **requerido**.
- `data-form-target="#selector"`: destino para render HTML de respuesta. Estado: **opcional**.
- `data-form-method="GET|POST|PUT|PATCH|DELETE"`: override de metodo HTTP. Estado: **opcional**.
- `data-form-response="auto|html|json"`: fuerza tipo de respuesta esperado. Estado: **opcional**.
- `data-form-reset-on-success="true|false"`: limpia el form en respuestas exitosas. Estado: **opcional**.
- `data-form-loading-class="clase"`: clase aplicada durante carga. Estado: **opcional**.
- `data-form-same-origin="true|false"`: restringe origen de URL. Estado: **opcional**.
- `data-form-allowed-methods="GET,POST"`: lista de metodos permitidos. Estado: **opcional**.
- `data-form-credentials="same-origin|include|omit"`: valor de credenciales para fetch. Estado: **opcional**.
- `data-form-prevent-concurrent="true|false"`: cancela solicitud previa antes de enviar una nueva. Estado: **opcional**.
- `data-form-timeout="15000"`: timeout en milisegundos por solicitud. Estado: **opcional**.
- `data-form-retry-count="1"`: numero de reintentos ante fallo. Estado: **opcional**.
- `data-form-retry-delay="300"`: espera en ms entre reintentos. Estado: **opcional**.
- `data-form-retry-statuses="408,429,500,502,503,504"`: estados HTTP para reintento. Estado: **opcional**.
- `data-form-debounce-get="300"`: debounce en ms para solicitudes GET. Estado: **opcional**.
- `data-form-csrf-meta="csrf-token"`: nombre del meta que contiene token CSRF. Estado: **opcional**.
- `data-form-csrf-header="X-CSRF-Token"`: nombre del header CSRF. Estado: **opcional**.
- `data-form-csrf-token="token"`: token CSRF explicito por atributo. Estado: **opcional**.

## API publica

```html
<script>
  const form = document.querySelector('form[data-form-request]');

  const instance = window.FormRequest.init(form, {
    sameOrigin: true,
    allowedMethods: ['GET', 'POST'],
    responseType: 'auto',
    resetOnSuccess: false,
    timeoutMs: 15000,
    retryCount: 1,
    retryDelayMs: 300,
    retryOnStatuses: [408, 429, 500, 502, 503, 504],
    debounceGetMs: 300,
    csrfMetaName: 'csrf-token',
    csrfHeaderName: 'X-CSRF-Token',
    csrfToken: '',
    beforeSend: function (url, requestInit, formEl) {
      console.log('before', url, requestInit, formEl);
    },
    onSuccess: function (data, response, formEl) {
      console.log('success', data, response.status, formEl);
    },
    onError: function (data, response, error, formEl) {
      console.log('error', data, response, error, formEl);
    },
    onComplete: function (formEl) {
      console.log('complete', formEl);
    }
  });

  window.FormRequest.getInstance(form);
  window.FormRequest.destroy(form);
  window.FormRequest.initAll(document);
  window.FormRequest.destroyAll(document);
</script>
```

## Eventos del plugin

- `before.plugin.formRequest`: antes de ejecutar `fetch` (cancelable).
- `success.plugin.formRequest`: cuando la respuesta fue exitosa.
- `error.plugin.formRequest`: cuando la respuesta fue de error o hubo excepcion.
- `complete.plugin.formRequest`: al finalizar cualquier resultado.

## Seguridad

- Bloquea protocolos no seguros (solo `http`/`https`).
- Puede bloquear cross-origin con `sameOrigin` en `true`.
- Limita metodos HTTP segun `allowedMethods`.
- Agrega CSRF automaticamente en metodos no GET/HEAD cuando hay token disponible.
- Permite timeout y retry para robustecer formularios frente a red inestable.

## Demo

- `test-form-request.html`
