# ItemMover

Plugin JavaScript nativo para mover elementos HTML dentro de una lista o coleccion.

## Requisitos

- Un navegador moderno con soporte para `MutationObserver`, `WeakMap` y `queueMicrotask`
- Un disparador con `data-role="move-item"`
- Un selector objetivo con `data-move-target`

## Instalacion

Incluye solo el plugin:

```html
<script src="./itemMover.js"></script>
```

## Uso Basico

```html
<ul>
  <li class="task-item">
    <button
      type="button"
      data-role="move-item"
      data-move-target=".task-item"
      data-move-direction="previous">
      Subir
    </button>
    Item A
  </li>

  <li class="task-item">
    <button
      type="button"
      data-role="move-item"
      data-move-target=".task-item"
      data-move-direction="next">
      Bajar
    </button>
    Item B
  </li>
</ul>
```

Con eso basta. El plugin se inicializa automaticamente al cargar el DOM.

## Como Funciona

- Busca elementos con `data-role="move-item"`.
- Toma `data-move-target` para ubicar el item actual (`closest`).
- Usa `data-move-direction` para decidir si mover contra el elemento anterior o siguiente.
- Intercambia ambos nodos en el DOM.

## Direcciones Soportadas

- `previous`
- `next`

## Inicializacion Automatica

El plugin se auto-inicializa sobre:

- `[data-role="move-item"]`

Ademas, usa `MutationObserver` para inicializar triggers agregados dinamicamente al DOM y desmontar instancias cuando esos nodos salen realmente del documento.

## Inicializacion Manual (opcional)

```html
<script>
  ItemMover.init(document.querySelector('#btnMover'));
  ItemMover.initAll(document.querySelector('#miLista'));
</script>
```

## API publica

```html
<script>
  const trigger = document.querySelector('#btnMover')
      , instance = ItemMover.init(trigger);

  ItemMover.getInstance(trigger);
  ItemMover.destroy(trigger);
  ItemMover.destroyAll(document.querySelector('#miLista'));

  instance.destroy();
</script>
```

- `ItemMover.init(element, options)`: crea o reutiliza una instancia.
- `ItemMover.getInstance(element)`: devuelve la instancia actual o `null`.
- `ItemMover.destroy(element)`: desmonta una instancia concreta.
- `ItemMover.destroyAll(root)`: desmonta todas las instancias dentro de un contenedor.
- `instance.destroy()`: elimina listeners de la instancia actual.

En uso normal no hace falta llamar `destroy()`: si el nodo se elimina del DOM, el plugin intenta desmontarlo automaticamente.

## Errores comunes

- Falta `data-move-target`: se lanza error.
- `data-move-direction` invalido: se lanza error.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-item-mover.html`
