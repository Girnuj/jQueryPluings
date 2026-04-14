# ImgUploadPreview

Plugin jQuery para previsualizar imagenes en un `<img>` a partir de un `<input type="file">`.

## Requisitos

- jQuery 3.x o superior
- Un `<input>` con el atributo `data-img-upload-preview-target`
- Un `<img>` de destino

## Instalacion

Incluye jQuery y luego el plugin:

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
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
  $('#miInput').imgUploadPreview({
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

Ademas, usa `MutationObserver` para inicializar inputs agregados dinamicamente al DOM.

## Inicializacion Manual (opcional)

Si necesitas inicializar manualmente un bloque concreto:

```html
<script>
  $('#miInput').imgUploadPreview();
  // o por selector
  $('input[data-img-upload-preview-target]').imgUploadPreview();
</script>
```

## Errores comunes

- Falta `data-img-upload-preview-target`: se lanza error.
- El selector no existe: muestra `console.warn`.
- El selector no apunta a un `<img>`: se lanza error.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-img-upload-preview.html`
