# OfflineActionQueue

## Que hace

OfflineActionQueue encola acciones del usuario cuando la red falla o no hay conectividad, y las reintenta en orden cuando la conexion vuelve.

## Que viene a solucionar

En escenarios moviles, VPN corporativa o redes inestables, acciones de crear/editar/borrar pueden perderse.
El navegador no ofrece una cola persistente con replay ordenado y politica de reintentos para este caso.

## Beneficios

- Cola persistente en `localStorage`.
- Replay ordenado (FIFO) para mantener coherencia de acciones.
- Reintentos con backoff exponencial.
- Integracion declarativa por `data-*` y API publica.
- Hooks y eventos para telemetria, UI y manejo de conflicto.

## Requisitos

- JavaScript con sintaxis ECMAScript 2020.

## Incluir en HTML

```html
<script src="./offlineActionQueue.js"></script>
```

## Uso minimo

```html
<section data-oaq-config='{"storageKey":"queue:tasks","maxRetries":5,"baseRetryDelayMs":900,"queueOnHttpErrors":true,"tryImmediate":true}'>
<button
  data-offline-action-queue
  data-oaq-endpoint="/api/tasks"
  data-oaq-method="POST"
  data-oaq-name-title="Nueva tarea"
  data-oaq-name-priority="high">
  Crear tarea resiliente
</button>
</section>
```

## Configuracion compacta y herencia

Puedes reducir atributos por elemento usando configuracion en JSON y perfiles reutilizables:

- `data-oaq-config='{"maxRetries":6,...}'`: define opciones en bloque.
- `data-oaq-profile="nombrePerfil"`: aplica un perfil registrado via API.
- Herencia por contenedor: si un ancestro tiene `data-oaq-config` o `data-oaq-profile`, sus opciones se aplican a los triggers hijos.
- Prioridad de merge: defaults -> ancestros -> elemento (`data-oaq-profile`/`data-oaq-config`) -> overrides puntuales por `data-oaq-*` -> `options` de `init`.

Ejemplo con perfil:

```html
<section data-oaq-profile="ordersCreate">
  <form
    data-offline-action-queue
    data-oaq-endpoint="/api/orders"
    data-oaq-method="POST"
    data-oaq-payload-mode="form">
    ...
  </form>
</section>

<script>
  OfflineActionQueue.registerProfile('ordersCreate', {
    storageKey: 'queue:orders',
    maxRetries: 6,
    baseRetryDelayMs: 800,
    maxRetryDelayMs: 12000,
    queueOnHttpErrors: true,
    tryImmediate: true
  });
</script>
```

## Atributos data-*

- `data-offline-action-queue`: activa el plugin.
- `data-oaq-endpoint="/api/..."`: endpoint destino de la accion.
- `data-oaq-method="POST|PUT|PATCH|DELETE|GET"`: metodo HTTP.
- `data-oaq-action-type="create|edit|delete|..."`: etiqueta funcional de la accion.
- `data-oaq-payload-mode="auto|form|json|dataset"`: fuente de payload.
- `data-oaq-payload-json='{"foo":"bar"}'`: payload JSON directo.
- `data-oaq-name-*="valor"`: payload por atributos (modo dataset/auto).
- `data-oaq-headers='{"X-Tenant":"acme"}'`: headers JSON.
- `data-oaq-config='{"maxRetries":6,...}'`: configuracion compacta JSON por elemento/contenedor.
- `data-oaq-profile="ordersCreate"`: aplica perfil reutilizable registrado por API.
- `data-oaq-storage-key="offlineActionQueue:items"`: clave de persistencia.
- `data-oaq-timeout="12000"`: timeout de request en ms.
- `data-oaq-max-retries="5"`: maximo de reintentos.
- `data-oaq-base-retry-delay="1000"`: base del backoff en ms.
- `data-oaq-max-retry-delay="60000"`: tope del backoff en ms.
- `data-oaq-auto-flush-on-online="true|false"`: flush automatico al evento `online`.
- `data-oaq-auto-flush-on-init="true|false"`: flush automatico al iniciar.
- `data-oaq-flush-interval="0"`: flush periodico en ms (`0` desactiva).
- `data-oaq-queue-on-http-errors="true|false"`: decide si errores HTTP entran a cola.
- `data-oaq-conflict-statuses="409,412"`: estados tratados como conflicto.
- `data-oaq-try-immediate="true|false"`: intenta enviar de inmediato si hay red.
- `data-oaq-prevent-default="true|false"`: previene accion nativa en click.

## API publica

- `window.Plugins.OfflineActionQueue.init(element, options)`
- `window.Plugins.OfflineActionQueue.getInstance(element)`
- `window.Plugins.OfflineActionQueue.destroy(element)`
- `window.Plugins.OfflineActionQueue.initAll(root)`
- `window.Plugins.OfflineActionQueue.destroyAll(root)`
- `window.Plugins.OfflineActionQueue.registerProfile(name, options)`
- `window.Plugins.OfflineActionQueue.getProfile(name)`
- `window.Plugins.OfflineActionQueue.hasProfile(name)`
- `window.Plugins.OfflineActionQueue.unregisterProfile(name)`
- `window.Plugins.OfflineActionQueue.listProfiles()`

Metodos de instancia:

- `instance.flush()`
- `instance.clearQueue()`
- `instance.getQueueSnapshot()`
- `instance.getQueueSize()`
- `instance.enqueueFromEvent(evt)`

## Eventos

- `queued.plugin.offlineActionQueue`: accion encolada.
- `sent.plugin.offlineActionQueue`: accion enviada correctamente.
- `failed.plugin.offlineActionQueue`: accion descartada por error final.
- `conflict.plugin.offlineActionQueue`: conflicto detectado (ej. 409/412).
- `drained.plugin.offlineActionQueue`: cola vacia despues de flush.

## Hooks (options)

- `onQueued(action, element)`
- `onSent(action, result, element)`
- `onFailed(action, result, element)`
- `onConflict(context, element)`
- `onDrained(element)`
- `customBuildAction({ event, element, options })`
- `customSendAction(action, element)`

## Demo

- `test-offline-action-queue.html`

## Configuracion Del Observer Del Plugin

Root directo opcional para este plugin:

```html
<section data-pp-observe-root-offline-action-queue>...</section>
```

Prioridad de root:

1. `data-pp-observe-root-offline-action-queue`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro