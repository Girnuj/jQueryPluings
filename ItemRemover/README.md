# ItemRemover

Plugin JavaScript nativo para remover elementos HTML de una lista o coleccion.

## Requisitos

- Un navegador moderno con soporte para `MutationObserver`, `WeakMap` y `queueMicrotask`
- Un trigger con `data-role="remove-item"`
- Un selector objetivo opcional con `data-remove-target` o por opcion `targetItemSelector`

## Instalacion

Incluye solo el plugin:

```html
<script src="./itemRemover.js"></script>
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
