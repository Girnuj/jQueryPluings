# ReplaceMe

Plugin JavaScript nativo para reemplazar un elemento por HTML remoto al hacer clic.

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

## Como Funciona

- Busca elementos con `data-role="replace-me"`.
- En click, hace una solicitud `GET` o `POST` (configurable) con `fetch` a `replaceSourceUrl`.
- Si responde OK, reemplaza el trigger con el HTML recibido.
- Si falla, deshabilita el trigger cuando aplica.

## Opciones

- `replaceSourceUrl`: URL para solicitar el HTML remoto.
- `requestMethod`: metodo HTTP (`GET` o `POST`). Por defecto: `POST`.

Puedes configurarlo por atributo o por inicialización manual:

- atributo: `data-replace-me-src="/ruta"`
- atributo opcional: `data-replace-me-method="GET"`
- opcion JS: `{ replaceSourceUrl: '/ruta', requestMethod: 'GET' }`

## Inicializacion Automatica

El plugin se auto-inicializa sobre:

- `[data-role="replace-me"]`

Ademas, usa `MutationObserver` para inicializar triggers agregados dinamicamente al DOM y desmontar instancias cuando esos nodos salen realmente del documento.

## Inicializacion Manual (opcional)

```html
<script>
  ReplaceMe.init(document.querySelector('#miTrigger'));
  ReplaceMe.initAll(document.querySelector('#miContenedor'));
</script>
```

## API publica

```html
<script>
  const trigger = document.querySelector('#miTrigger')
      , instance = ReplaceMe.init(trigger);

  ReplaceMe.getInstance(trigger);
  ReplaceMe.destroy(trigger);
  ReplaceMe.destroyAll(document.querySelector('#miContenedor'));

  instance.destroy();
</script>
```

- `ReplaceMe.init(element, options)`: crea o reutiliza una instancia.
- `ReplaceMe.getInstance(element)`: devuelve la instancia actual o `null`.
- `ReplaceMe.destroy(element)`: desmonta una instancia concreta.
- `ReplaceMe.destroyAll(root)`: desmonta todas las instancias dentro de un contenedor.
- `instance.destroy()`: elimina listeners de la instancia actual.

En uso normal no hace falta llamar `destroy()`: si el nodo se elimina del DOM, el plugin intenta desmontarlo automaticamente.

## Errores comunes

- Falta `data-replace-me-src` y `replaceSourceUrl`: `init` lanza error.
- Metodo HTTP invalido: `init` lanza error (solo `GET` o `POST`).
- Endpoint responde error HTTP: el trigger queda deshabilitado (si aplica).

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-replace-me.html`
