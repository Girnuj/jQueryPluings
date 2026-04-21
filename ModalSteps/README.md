# ModalSteps

Plugin JavaScript nativo para manejar modales por pasos con carga remota de HTML y submit progresivo usando `fetch`.

## Que viene a solucionar

Resuelve flujos tipo wizard en modal (varios pasos, validacion y navegacion) sin reconstruir toda la logica de estado y solicitudes en cada proyecto.

## Beneficios

- Estandariza wizards de pasos en una sola implementacion.
- Soporta flujos mixtos GET/POST de forma uniforme.
- Mejora mantenibilidad de formularios complejos.
- Facilita evolucion del flujo sin rehacer la base.

## Requisitos

- Un navegador moderno con soporte para `fetch`, `MutationObserver`, `WeakMap`, `FormData` y `CustomEvent`.
- Un modal con `data-dialog="steps"` y contenedor interno `data-dialog="main"`.
- Un trigger que abra el modal y opcionalmente aporte `data-dialog-src`.

## Instalacion

Incluye el plugin:

```html
<script src="./modalSteps.min.js"></script>
```

Para produccion, usa `modalSteps.min.js`. Si necesitas depurar, puedes usar `modalSteps.js`.

## Uso Basico

```html
<button type="button" data-dialog-src="/steps/start" id="btnOpenWizard">
  Abrir wizard
</button>

<div id="stepsModal" role="dialog" data-dialog="steps" aria-hidden="true">
  <section data-dialog="main"></section>
</div>
```

El plugin se auto-inicializa sobre modales que cumplan:

- `[role="dialog"][data-dialog="steps"]`
- `dialog[data-dialog="steps"]`

## Como Funciona

- Escucha `shown.plugin.modalStep` para cargar el primer HTML del flujo.
- Inserta el contenido del paso en `data-dialog="main"`.
- Intercepta el `submit` de formularios dentro del modal.
- Los steps pueden trabajar con formularios `POST` para envio de datos y con solicitudes `GET` para consultar informacion de APIs.
- Envia datos con `fetch` y procesa respuestas por estado (`200`, `201`, `204`, `400`, `418`).
- Limpia el contenido en `hidden.plugin.modalStep`.

## Atributos `data-*` soportados

- `data-dialog="steps"`: marca el modal como sujeto del plugin. Estado: **requerido en auto-inicializacion**.
- `data-dialog="main"`: contenedor donde se renderiza cada step. Estado: **requerido**.
- `data-dialog-src`: URL del primer step en el trigger que abre el modal. Estado: **opcional/condicional** (si no se usa, puedes proveer `getFirstStepRequest` por API).
- `data-dialog-reload-on-no-content="true|false"`: controla recarga automatica en `201/204` sin contenido. Estado: **opcional**.

## API publica

```html
<script>
  const modal = document.querySelector('#stepsModal');

  const instance = window.Plugins.ModalSteps.init(modal, {
    reloadOnNoContent: true,
    jsonResponseHandler: function (data, status, subject) {
      console.log('JSON', status, data, subject);
    },
    after201: function (content, response, subject) {
      console.log('after201', content, response, subject);
    },
    after204: function (response, subject) {
      console.log('after204', response, subject);
    }
  });

  instance.bind(function getFirstStepRequest() {
    return fetch('/steps/start', { credentials: 'same-origin' });
  });

  // Carga manual de contenido en el contenedor de pasos.
  instance.load('<form action="/steps/submit"><button type="submit">Enviar</button></form>');

  window.Plugins.ModalSteps.getInstance(modal);
  window.Plugins.ModalSteps.destroy(modal);
  window.Plugins.ModalSteps.initAll(document);
  window.Plugins.ModalSteps.destroyAll(document);
</script>
```

Metodos principales:

- window.Plugins.ModalSteps.init(element, options): crea o reutiliza una instancia.
- instance.bind(getFirstStepRequest): enlaza listeners y callback opcional para primer step.
- instance.load(html, submitDataGetter): carga contenido manual en el contenedor principal.
- window.Plugins.ModalSteps.getInstance(element): devuelve la instancia actual o null.
- window.Plugins.ModalSteps.destroy(element): destruye una instancia concreta.
- window.Plugins.ModalSteps.initAll(root): inicializa todas las coincidencias dentro de un contenedor.
- window.Plugins.ModalSteps.destroyAll(root): destruye todas las coincidencias dentro de un contenedor.

## Eventos del plugin

- `shown.plugin.modalStep`: evento esperado para disparar carga del primer step.
- `hidden.plugin.modalStep`: evento esperado para limpiar contenido del flujo.

## Opciones de seguridad

- `strictSameOrigin` (default: `true`): bloquea URLs de otros origenes para carga de steps y submit.
- `allowedSubmitMethods` (default: `['GET', 'POST']`): limita los metodos HTTP permitidos en el submit.

Notas:

- Si el formulario es `GET`, el plugin serializa campos a query string (sin body).
- Si el formulario es `POST`, el plugin envia `FormData` en el body.
- Solo se permiten URLs `http`/`https`.

## Errores comunes

- Falta `data-dialog="main"`: no hay contenedor para renderizar steps.
- El trigger no tiene `data-dialog-src` y no se define `getFirstStepRequest`: no se carga contenido.
- Respuesta HTTP inesperada: el plugin intenta cerrar el modal como fallback.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-modal-steps.html`

## Vista previa del ejemplo

Estado inicial del HTML:

![ModalSteps ejemplo inicial](./img/image.png)

Primer popup del flujo:

![ModalSteps primer popup](./img/image2.png)

Segundo paso del flujo:

![ModalSteps segundo paso](./img/image3.png)

Ultimo modal del flujo:

![ModalSteps ultimo modal](./img/image4.png)

## Configuracion Del Observer Del Plugin

Si quieres limitar el `MutationObserver` de este plugin a un contenedor especifico, define un root directo:

```html
<section data-pp-observe-root-modal-steps>...</section>
```

Prioridad de root para el plugin:

1. `data-pp-observe-root-modal-steps`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro