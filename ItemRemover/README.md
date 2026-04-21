# ItemRemover

Plugin JavaScript nativo para remover elementos HTML de una lista o coleccion.

## Que viene a solucionar

Resuelve eliminaciones de items en interfaces dinamicas sin repetir codigo de busqueda de contenedor y limpieza de nodos.

## Beneficios

- Acelera acciones de borrado en UI.
- Evita codigo duplicado de handlers de eliminacion.
- Permite configuracion flexible por atributos u opciones.
- Mejora mantenibilidad en componentes repetitivos.

## Requisitos

- Un navegador moderno con soporte para `MutationObserver`, `WeakMap` y `queueMicrotask`
- Un trigger con `data-role="remove-item"`
- Un selector objetivo opcional con `data-remove-target` o por opcion `targetItemSelector`

## Instalacion

Incluye solo el plugin:

```html
<script src="./itemRemover.js"></script>
```

Para uso en produccion, si no necesitas leer el codigo fuente, puedes incluir la version minificada:

```html
<script src="./itemRemover.min.js"></script>
```

## Uso Basico

```html
<ul>
  <li class="task-item" data-remove-item="item">
    <span>Tarea 1</span>
    <button type="button" data-role="remove-item">Eliminar</button>
  </li>
</ul>
```

Con eso basta. El plugin se inicializa automaticamente al cargar el DOM.

## Como Funciona

- Busca elementos con `data-role="remove-item"`.
- Resuelve el objetivo a eliminar con `closest`.
- Por defecto usa `targetItemSelector = [data-remove-item="item"]`.
- Si encuentra el objetivo, lo elimina del DOM en click.

## Opciones

- `targetItemSelector`: selector del nodo contenedor a eliminar.

Puedes configurarlo por inicializacion manual o por atributo:

- atributo sugerido: `data-remove-target=".mi-item"`
- opcion JS: `{ targetItemSelector: '.mi-item' }`

## Atributos `data-*` soportados

- `data-role="remove-item"`: marca el trigger que dispara la eliminacion por auto-init. Estado: **requerido en auto-inicializacion**.
- `data-remove-target`: selector para definir el contenedor a eliminar con `closest(...)`. Estado: **opcional**.
- `data-remove-item="item"`: marca sugerida para el contenedor eliminable por defecto. Estado: **opcional** (recomendado si no usas `data-remove-target`).

## Inicializacion Automatica

El plugin se auto-inicializa sobre:

- `[data-role="remove-item"]`

Ademas, usa `MutationObserver` para inicializar triggers agregados dinamicamente al DOM y desmontar instancias cuando esos nodos salen realmente del documento.

## Inicializacion Manual (opcional)

```html
<script>
  ItemRemover.init(document.querySelector('#btnEliminar'));
  ItemRemover.initAll(document.querySelector('#miLista'));
</script>
```

## API publica

```html
<script>
  const trigger = document.querySelector('#btnEliminar')
      , instance = ItemRemover.init(trigger);

  ItemRemover.getInstance(trigger);
  ItemRemover.destroy(trigger);
  ItemRemover.destroyAll(document.querySelector('#miLista'));

  instance.destroy();
</script>
```

- `ItemRemover.init(element, options)`: crea o reutiliza una instancia.
- `ItemRemover.getInstance(element)`: devuelve la instancia actual o `null`.
- `ItemRemover.destroy(element)`: desmonta una instancia concreta.
- `ItemRemover.destroyAll(root)`: desmonta todas las instancias dentro de un contenedor.
- `instance.destroy()`: elimina listeners de la instancia actual.

En uso normal no hace falta llamar `destroy()`: si el nodo se elimina del DOM, el plugin intenta desmontarlo automaticamente.

## Errores comunes

- Trigger no es un `HTMLElement`: `init` lanza error.
- Selector de destino no encuentra contenedor: el click no elimina nada.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-item-remover.html`

## Vista previa del ejemplo

Estado inicial del HTML:

![ItemRemover ejemplo inicial](./img/image.png)

Estado despues de agregar algunos items y eliminar otros:

![ItemRemover con items agregados y eliminados](./img/image2.png)


## Configuracion Del Observer Del Plugin

Si quieres limitar el `MutationObserver` de este plugin a un contenedor especifico, define un root directo:

```html
<section data-pp-observe-root-item-remover>...</section>
```

Prioridad de root para el plugin:

1. `data-pp-observe-root-item-remover`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro