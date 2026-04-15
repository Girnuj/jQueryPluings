# ImgUploadPreview

Plugin JavaScript nativo para previsualizar imagenes en un `<img>` a partir de un `<input type="file">`.

## Requisitos

- Un navegador moderno con soporte para `FileReader`, `MutationObserver` y `WeakMap`
- Un `<input>` con el atributo `data-img-upload-preview-target`
- Un `<img>` de destino

## Instalacion

Incluye solo el plugin:

```html
<script src="./imgUploadPreview.js"></script>
```

## Uso Basico

```html
<input
  type="file"
  accept="image/*"
  data-img-upload="input"
  data-img-upload-preview-target="#imgPreview1" />

<img id="imgPreview1" alt="Vista previa" />
```

Con eso basta. El plugin se inicializa automaticamente al cargar el DOM.

## Como Funciona

- Lee el selector del `<img>` desde `data-img-upload-preview-target`.
- En evento `change`, toma el archivo seleccionado y genera previsualizacion con `FileReader`.
- Si no hay archivo seleccionado, limpia el `src` del `<img>`.
- Si el archivo no cumple validaciones de tipo o tamano, limpia la vista previa y resetea el input.

## Validaciones

El plugin incluye validaciones internas:

- Tipo MIME permitido (`allowedMimeTypes`)
- Tamano maximo (`maxFileSize`)

Por defecto:

- `allowedMimeTypes`: `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`
- `maxFileSize`: `2 * 1024 * 1024` (2 MB)

Estas opciones se pueden modificar a gusto segun tu caso de uso. Son una validacion fiel/confiable a nivel de plugin y complementan el `accept="image/*"` del input.

## Opciones (configurables)

```html
<script>
  ImgUploadPreview.init(document.querySelector('#miInput'), {
    targetItemSelector: '#imgPreview1',
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxFileSize: 5 * 1024 * 1024 // 5 MB
  });
</script>
```

## Inicializacion Automatica

El plugin se auto-inicializa sobre:

- `input[data-img-upload="input"]`
- `input[data-img-upload-preview-target]`

Ademas, usa `MutationObserver` para inicializar inputs agregados dinamicamente al DOM y desmontar instancias cuando esos nodos salen realmente del documento.

## Inicializacion Manual (opcional)

Si necesitas inicializar manualmente un bloque concreto:

```html
<script>
  ImgUploadPreview.init(document.querySelector('#miInput'));
  // o sobre un contenedor completo
  ImgUploadPreview.initAll(document.querySelector('#miFormulario'));
</script>
```

## API publica

```html
<script>
  const input = document.querySelector('#miInput')
      , instance = ImgUploadPreview.init(input);

  ImgUploadPreview.getInstance(input);
  ImgUploadPreview.destroy(input, { clearPreview: true });
  ImgUploadPreview.destroyAll(document.querySelector('#miFormulario'));

  instance.destroy();
</script>
```

- `ImgUploadPreview.init(element, options)`: crea o reutiliza una instancia.
- `ImgUploadPreview.getInstance(element)`: devuelve la instancia actual o `null`.
- `ImgUploadPreview.destroy(element, options)`: desmonta una instancia concreta.
- `ImgUploadPreview.destroyAll(root, options)`: desmonta todas las instancias dentro de un contenedor.
- `instance.destroy(options)`: elimina listeners de la instancia actual.
- `clearPreview: true`: opcion para limpiar el `src` del `<img>` al destruir.

En uso normal no hace falta llamar `destroy()`: si el nodo se elimina del DOM, el plugin intenta desmontarlo automaticamente.

## Errores comunes

- Falta `data-img-upload-preview-target`: se lanza error.
- El selector no existe: muestra `console.warn`.
- El selector no apunta a un `<img>`: se lanza error.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-img-upload-preview.html`
