# ReplaceMe

Plugin JavaScript nativo para reemplazar un elemento por HTML o JSON remoto al hacer clic.

## Que viene a solucionar

Resuelve la carga parcial de HTML remoto sobre zonas concretas de la vista sin tener que montar un framework completo de rendering. Compatible con arquitecturas HTML over the wire y microservicios que devuelven fragmentos HTML o respuestas JSON con HTML embebido.

## Beneficios

- Permite updates parciales de UI con bajo costo.
- Evita recargas completas para cambios puntuales.
- Simplifica integracion con endpoints que devuelven HTML o JSON.
- Soporta reemplazo de cualquier elemento del DOM, no solo el trigger.
- Ciclo de vida completo con eventos cancelables.
- Protección nativa contra doble click y peticiones concurrentes.
- Reduce boilerplate para placeholders dinamicos.

## Requisitos

- Un navegador moderno con soporte para `fetch`, `MutationObserver`, `WeakMap` y `queueMicrotask`
- Un trigger con `data-role="replace-me"`
- Una URL de origen con `data-replace-me-src` o por opción `replaceSourceUrl`
- Metodo HTTP configurable (`GET` o `POST`)

## Instalacion

Incluye solo el plugin:

```html
<script src="./replaceMe.js"></script>
```

Para uso en produccion, si no necesitas leer el codigo fuente, puedes incluir la version minificada:

```html
<script src="./replaceMe.min.js"></script>
```

## Uso Basico

```html
<button
  type="button"
  data-role="replace-me"
  data-replace-me-src="/mi-endpoint-html">
  Cargar contenido
</button>
```

Con eso basta. El plugin se inicializa automaticamente al cargar el DOM.

## Uso Con Metodo GET

```html
<button
  type="button"
  data-role="replace-me"
  data-replace-me-src="/mi-endpoint-html"
  data-replace-me-method="GET">
  Cargar contenido por GET
</button>
```

## Cómo Funciona

1. Busca elementos con `data-role="replace-me"`.
2. En click, emite `replace-me:before` (cancelable). Si se cancela, se detiene.
3. Bloquea doble click mientras la petición está en curso.
4. Hace una solicitud HTTP con `fetch` al endpoint configurado.
5. Resuelve el nodo destino: `data-replace-me-target` o el propio trigger.
6. En modo `html`: inyecta la respuesta directamente.
7. En modo `json`: extrae el HTML de la clave configurada, o redirige si hay clave de redirect.
8. Destruye la instancia antes de tocar el DOM (evita referencias huérfanas).
9. Emite `replace-me:success` o `replace-me:error` según corresponda.
10. Emite siempre `replace-me:after` al finalizar.

## Opciones

- `replaceSourceUrl`: URL para solicitar el HTML remoto.
- `requestMethod`: método HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Por defecto: `POST`.

Puedes configurarlo por atributo o por inicialización manual:

- atributo: `data-replace-me-src="/ruta"`
- atributo opcional: `data-replace-me-method="GET"`
- atributo opcional: `data-replace-me-mode="html"`
- atributo opcional: `data-replace-me-target="#miElemento"`
- opcion JS: `{ replaceSourceUrl: '/ruta', requestMethod: 'GET', responseMode: 'html', targetSelector: '#miElemento' }`


## Atributos `data-*` soportados

- `data-role="replace-me"`: marca el trigger que será reemplazado por HTML remoto en auto-init. Estado: **requerido**.
- `data-replace-me-src`: URL origen desde donde se solicita el HTML. Estado: **requerido**.
- `data-replace-me-method`: método HTTP de la solicitud (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Estado: **opcional** (por defecto `POST`).
- `data-replace-me-mode`: modo de respuesta (`html` | `json`). Estado: **opcional** (por defecto `html`).
- `data-replace-me-target`: Selector CSS del elemento a reemplazar. Estado: **opcional** (por defecto el trigger mismo).
- `data-replace-me-json-html`: Clave del objeto JSON que contiene el HTML a inyectar. Estado: **opcional** (por defecto `"html"`).
- `data-replace-me-json-redirect`: Clave del objeto JSON que indica una URL de redirección. Estado: **opcional** (por defecto `"redirect"`).

## Eventos del ciclo de vida

- `replace-me:before`: Disparado antes del fetch. Cancelable con evt.preventDefault(). detail: { trigger, target, options }
- `replace-me:success`: Disparado tras reemplazo exitoso. detail: { trigger, target, html, raw } (raw = texto o JSON según el modo)
- `replace-me:error`: Disparado si ocurre un error durante el reemplazo. detail: { trigger, target, error }
- `replace-me:after`: Disparado siempre al terminar, sin importar el resultado. detail: { trigger, target }

Puedes escuchar estos eventos para integrar lógica personalizada:

```html
<script>
  // Cancelar una operación condicionalmente
  document.addEventListener('replace-me:before', (e) => {
    if (!confirm('¿Confirmas la acción?')) e.preventDefault();
  });
 
  // Reaccionar al éxito
  document.addEventListener('replace-me:success', (e) => {
    console.log('HTML inyectado:', e.detail.html);
  });
 
  // Manejar errores visualmente
  document.addEventListener('replace-me:error', (e) => {
    console.error('Falló:', e.detail.error.message);
  });
</script>
```

## Seguridad y microfrontends

- El HTML remoto es sanitizado antes de inyectarse (usando el API nativo Sanitizer si está disponible).
- Compatible con arquitecturas microfrontend: tras el reemplazo, todos los plugins se reinicializan automáticamente en el nuevo nodo.
- Si el HTML remoto tiene un solo nodo raíz, se usa `replaceWith` para máxima seguridad y compatibilidad con Web Components.
- Si hay más de un nodo raíz, se usa `outerHTML` (modo clásico, menos seguro pero compatible).

## Inicializacion Automatica

El plugin se auto-inicializa sobre:

- `[data-role="replace-me"]`

Ademas, usa `MutationObserver` para inicializar triggers agregados dinamicamente al DOM y desmontar instancias cuando esos nodos salen realmente del documento.

## Inicializacion Manual (opcional)

```html
<script>
  window.Plugins.ReplaceMe.init(document.querySelector('#miTrigger'));
  window.Plugins.ReplaceMe.initAll(document.querySelector('#miContenedor'));
</script>
```

## API publica

```html
<script>
  const trigger = document.querySelector('#miTrigger')
      , instance = window.Plugins.ReplaceMe.init(trigger);

  window.Plugins.ReplaceMe.getInstance(trigger);
  window.Plugins.ReplaceMe.destroy(trigger);
  window.Plugins.ReplaceMe.destroyAll(document.querySelector('#miContenedor'));

  instance.destroy();
</script>
```

- `window.Plugins.ReplaceMe.init(element, options)`: crea o reutiliza una instancia.
- `window.Plugins.ReplaceMe.getInstance(element)`: devuelve la instancia actual o `null`.
- `window.Plugins.ReplaceMe.destroy(element)`: desmonta una instancia concreta.
- `window.Plugins.ReplaceMe.destroyAll(root)`: desmonta todas las instancias dentro de un contenedor.
- `instance.destroy()`: elimina listeners de la instancia actual.

En uso normal no hace falta llamar `destroy()`: si el nodo se elimina del DOM, el plugin intenta desmontarlo automaticamente.

## Errores comunes

- Falta `data-replace-me-src` y `replaceSourceUrl`: `init` lanza error.
- Metodo HTTP invalido: `init` lanza error (solo `GET` o `POST`).
- Endpoint responde error HTTP: se emite replace-me:error.
- `data-replace-me-target` apunta a un selector que no existe: se emite replace-me:error.
- Respuesta JSON sin la clave configurada en `data-replace-me-json-html`: se emite replace-me:error.
- Respuesta JSON mal formada: se emite replace-me:error.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-replace-me.html`

## Vista previa del ejemplo

Estado inicial del HTML:

![ReplaceMe ejemplo inicial](./img/image.png)

Estado despues de reemplazar contenido al hacer click en botones del HTML:

![ReplaceMe con contenido reemplazado](./img/image2.png)


## Configuracion Del Observer Del Plugin

Si quieres limitar el `MutationObserver` de este plugin a un contenedor especifico, define un root directo:

```html
<section data-pp-observe-root-replace-me>...</section>
```

Prioridad de root para el plugin:

1. `data-pp-observe-root-replace-me`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro