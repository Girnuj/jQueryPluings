# ImgUploadPreview

Plugin JavaScript nativo para previsualizar imagenes en un `<img>` a partir de un `<input type="file">`.

## Que viene a solucionar

Evita el ciclo de prueba y error al subir imagenes, permitiendo validar visualmente el archivo antes de enviar el formulario.

## Beneficios

- Mejora UX con feedback inmediato de la imagen seleccionada.
- Disminuye errores de carga de archivos incorrectos.
- Elimina codigo repetitivo de `FileReader` por vista.
- Se integra rapido con atributos `data-*`.

## Requisitos

- Un navegador moderno con soporte para `FileReader`, `MutationObserver` y `WeakMap`
- Un `<input>` con el atributo `data-img-upload-preview-target`
- Un `<img>` de destino

## Instalacion

Incluye solo el plugin:

```html
<script src="./imgUploadPreview.js"></script>
```

Para uso en produccion, si no necesitas leer el codigo fuente, puedes incluir la version minificada:

```html
<script src="./imgUploadPreview.min.js"></script>
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

## Atributos `data-*` soportados

- `data-img-upload="input"`: marca el `<input type="file">` como sujeto de auto-inicializacion. Estado: **requerido**.
- `data-img-upload-preview-target`: selector CSS del `<img>` donde se renderiza la vista previa. Estado: **requerido**.

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

## Vista previa del ejemplo

Estado inicial del HTML (sin archivo seleccionado):

![ImgUploadPreview ejemplo inicial](./img/image.png)

Estado con una imagen seleccionada en el input (se muestra la vista previa):

![ImgUploadPreview con imagen seleccionada](./img/image2.png)

## Configuracion Del Observer Del Plugin

Si quieres limitar el `MutationObserver` de este plugin a un contenedor especifico, define un root directo:

```html
<section data-pp-observe-root-img-upload-preview>...</section>
```

Prioridad de root para el plugin:

1. `data-pp-observe-root-img-upload-preview`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro