# Plugins

Coleccion de plugins JavaScript para manipulacion del DOM organizados por carpeta.
Sin dependencias externas.
Estos se inicializan solos al detectar los atributos HTML necesarios, asi no tienes que preocuparte por escribir JS, tambien puedes optar por la inicializacion manual.

## Requisitos Generales

- JavaScript con sintaxis ECMAScript 2020 (ECMA-2020)

Plugins funcionales en JavaScript nativo.
ECMAScript 2020 esta soportado por la mayoria de navegadores modernos.

## Plugins Disponibles

- `ImgUploadPreview`: previsualiza imagenes seleccionadas desde un input file en un elemento `<img>`.
- `VideoUrlPreview`: previsualiza videos de YouTube en un `<iframe>` a partir de una URL.
- `ItemMover`: mueve elementos de una lista hacia arriba o hacia abajo usando triggers con atributos `data-*`.
- `ItemRemover`: elimina elementos contenedores desde un trigger de borrado.
- `ReplaceMe`: reemplaza un trigger por HTML remoto obtenido mediante `POST` o `GET`.
- `TemplateRenderizer`: renderiza plantillas HTML reemplazando placeholders como `{{propiedad}}` y rutas anidadas.
- `InputSwitchFriendly`: muestra etiquetas amigables segun el estado de un switch/checkbox.
- `ChildSelect`: carga opciones dependientes en un select hijo a partir del valor del select padre.

## Estructura del Repositorio

Cada plugin vive en su propia carpeta y debe incluir su documentacion:

```text
PluginsPublicos/
  NombreDelPlugin/
    plugin.js
    README.md
    test-pluginName.html
```

Ejemplo actual:

```text
PluginsPublicos/
  VideoUrlPreview/
    VideoUrlPreview.js
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

Mantener una biblioteca de plugins simple, reutilizable y bien documentada para que cualquier persona pueda integrarlos rapido en sus proyectos copiando solamente el JS(pluginName.js) e incorporandolos en sus proyectos o vistas necesarias de una forma muy simple.
