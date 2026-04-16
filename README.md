# Plugins

## Introduccion

Todos hemos tenido que resolver alguna vez tareas como abrir un modal, eliminar un elemento del DOM o moverlo de lugar.
Este repositorio es una coleccion de plugins utiles en JavaScript nativo para facilitar ese trabajo sin depender de librerias externas ni escribir demasiado codigo repetitivo.

Cada plugin incluye su version fuente (`.js`) para que puedas adaptarlo a tu gusto, y su version minificada (`.min.js`) para usarla directamente.
Puede servirte para POC, SPA o proyectos empresariales, trabajando solo con JavaScript nativo y atributos HTML.

Si es tu primera vez aqui, te recomiendo revisar al menos el README de cada plugin para conocer rapidamente que problema resuelve y como integrarlo.

Coleccion de plugins JavaScript para manipulacion del DOM organizados por carpeta.
Sin dependencias externas!!.
Estos se inicializan solos al detectar los atributos HTML necesarios, asi que no tienes que preocuparte por escribir JS, tambien puedes optar por la inicializacion manual.

## Plugins Disponibles

- `ChildSelect`: carga opciones dependientes en un select hijo a partir del valor del select padre.
- `FormRequest`: extiende formularios nativos con envio asincrono via `fetch`, manejo de errores por campo, seguridad y control de retries/timeouts.
- `ImgUploadPreview`: previsualiza imagenes seleccionadas desde un input file en un elemento `<img>`.
- `InputSwitchFriendly`: muestra etiquetas amigables segun el estado de un switch/checkbox.
- `ItemMover`: mueve elementos de una lista hacia arriba o hacia abajo usando triggers con atributos `data-*`.
- `ItemRemover`: elimina elementos contenedores desde un trigger de borrado.
- `Modal`: abre y cierra modales usando triggers HTML con atributos `data-*` y API opcional.
- `ModalSteps`: ejecuta flujos de modal por pasos, con carga remota de contenido, soporte `POST`/`GET` y eventos para controlar cada etapa.
- `ReplaceMe`: reemplaza un trigger por HTML remoto obtenido mediante `POST` o `GET`.
- `TemplateRenderizer`: renderiza plantillas HTML reemplazando placeholders como `{{propiedad}}` y rutas anidadas.
- `UIState`: permite previsualizar estados de UI como loading, empty, error o success en componentes para QA y diseno.
- `VideoUrlPreview`: previsualiza videos de YouTube en un `<iframe>` a partir de una URL.

## Requisitos Generales

- JavaScript con sintaxis ECMAScript 2020 (ECMA-2020)

Plugins funcionales en JavaScript nativo.
ECMAScript 2020 esta soportado por la mayoria de navegadores modernos.

## Versiones Minificadas

Cada plugin incluye su version minificada (`*.min.js`) dentro de su propia carpeta.
Si no necesitas leer o depurar el codigo fuente, usa el archivo minificado para una integracion mas ligera en produccion.


## Estructura del Repositorio

Cada plugin vive en su propia carpeta y debe incluir su documentacion:

```text
PluginsPublicos/
  NombreDelPlugin/
    plugin.js
    plugin.min.js
    README.md
    test-pluginName.html
```

Ejemplo actual:

```text
PluginsPublicos/
  VideoUrlPreview/
    VideoUrlPreview.js
    VideoUrlPreview.min.js
    README.md
    README.en.md
    test-video-url-preview.html
```

## Convencion Recomendada Para Nuevos Plugins

En cada carpeta de plugin:

1. Archivo principal del plugin (`.js`).
2. `README.md` explicando:
   - Que hace el plugin.
   - Requisitos.
   - Como incluirlo en HTML.
   - Ejemplo minimo de uso.
   - Opciones y `data-*` disponibles (si aplica).
3. Un archivo de prueba HTML opcional para validar rapidamente el funcionamiento.

## Objetivo

Mantener una biblioteca de plugins simple, reutilizable y bien documentada para que cualquier persona pueda integrarlos rapido en sus proyectos copiando solamente el JS(pluginName.js) o su version .min e incorporandolos en sus proyectos o vistas necesarias de una forma muy simple y liviana.
