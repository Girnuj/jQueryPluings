# VideoUrlPreview

Plugin JavaScript nativo para previsualizar videos de YouTube en un `<iframe>` a partir de una URL ingresada en un `<input>`.

## Requisitos

- Un navegador moderno con soporte para `MutationObserver`, `WeakMap` y `queueMicrotask`
- Un `<input>` con el atributo `data-video-preview-target-frame`
- Un `<iframe>` de destino

## Instalacion

Incluye solo el plugin:

```html
<script src="./VideoUrlPreview.js"></script>
```

Para uso en produccion, si no necesitas leer el codigo fuente, puedes incluir la version minificada:

```html
<script src="./VideoUrlPreview.min.js"></script>
```

## Uso Basico

```html
<input
  type="text"
  data-role="video-preview"
  data-video-preview-target-frame="#previewFrame1"
  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />

<iframe id="previewFrame1" allowfullscreen></iframe>
```

Con eso basta. El plugin se inicializa automaticamente al cargar el DOM.

## Como Funciona

- Lee el selector del iframe desde `data-video-preview-target-frame`.
- En evento `input`: actualiza la vista previa solo si detecta un ID valido de YouTube.
- En evento `change` (blur/enter): si el valor queda invalido, limpia el `src` del iframe.
- Si el input ya tiene valor al inicializar, intenta renderizar la vista previa.

## Atributos `data-*` soportados

- `data-role="video-preview"`: marca el input de URL para auto-inicializacion. Estado: **requerido**.
- `data-video-preview-target-frame`: selector CSS del `<iframe>` donde se mostrara el video. Estado: **requerido**.

## Inicializacion Automatica

El plugin se auto-inicializa sobre:

- `input[data-role="video-preview"]`
- `input[data-video-preview-target-frame]`

Ademas, usa `MutationObserver` para inicializar inputs agregados dinamicamente al DOM y desmontar instancias cuando esos nodos salen realmente del documento.

## Inicializacion Manual (opcional)

Si necesitas inicializar manualmente un bloque concreto:

```html
<script>
  VideoUrlPreview.init(document.querySelector('#miInput'));
  // o sobre un contenedor completo
  VideoUrlPreview.initAll(document.querySelector('#miFormulario'));
</script>
```

## API publica

```html
<script>
  const input = document.querySelector('#miInput')
      , instance = VideoUrlPreview.init(input);

  VideoUrlPreview.getInstance(input);
  VideoUrlPreview.destroy(input, { clearPreview: true });
  VideoUrlPreview.destroyAll(document.querySelector('#miFormulario'));

  instance.destroy();
</script>
```

- `VideoUrlPreview.init(element, options)`: crea o reutiliza una instancia.
- `VideoUrlPreview.getInstance(element)`: devuelve la instancia actual o `null`.
- `VideoUrlPreview.destroy(element, options)`: desmonta una instancia concreta.
- `VideoUrlPreview.destroyAll(root, options)`: desmonta todas las instancias dentro de un contenedor.
- `instance.destroy(options)`: elimina listeners de la instancia actual.
- `clearPreview: true`: opcion para limpiar el `src` del `<iframe>` al destruir.

En uso normal no hace falta llamar `destroy()`: si el nodo se elimina del DOM, el plugin intenta desmontarlo automaticamente.

## Formatos de URL soportados

Se aceptan formatos comunes de YouTube, por ejemplo:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

## Errores comunes

- Falta `data-video-preview-target-frame`: se lanza error.
- El selector no existe: muestra `console.warn`.
- El selector no apunta a un `<iframe>`: se lanza error.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-video-url-preview.html`

## Vista previa del ejemplo

Estado inicial del HTML:

![VideoUrlPreview ejemplo inicial](./img/image.png)

Estado con un link de YouTube cargado (mostrando la preview):

![VideoUrlPreview con preview cargada](./img/image2.png)

