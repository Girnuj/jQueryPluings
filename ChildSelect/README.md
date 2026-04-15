# ChildSelect

Plugin JavaScript nativo para selects dependientes (parent-child) con carga dinamica de opciones via `fetch`.

## Requisitos

- Un navegador moderno con soporte para `fetch`, `MutationObserver`, `WeakMap` y `URL`
- Un `<select>` padre con `data-role="parent-select"`
- Un selector al `<select>` hijo con `data-child-select`
- Una URL de datos con `data-children-url`

## Instalacion

Incluye solo el plugin:

```html
<script src="./childselect.js"></script>
```

## Uso 1: Parent-Child simple con `fetch`

```html
<select
  id="categorySelect"
  data-role="parent-select"
  data-child-select="#subcategorySelect"
  data-children-url="/api/subcategories"
  data-value-property="id"
  data-text-property="name">
  <option value="">Seleccione categoria</option>
  <option value="frontend">Frontend</option>
  <option value="backend">Backend</option>
</select>

<select id="subcategorySelect">
  <option value="">-------</option>
</select>
```

## Uso 2: Parent-Child encadenado (3 niveles)

```html
<select
  id="categorySelect"
  data-role="parent-select"
  data-child-select="#subcategorySelect"
  data-children-url="/api/subcategories"
  data-value-property="id"
  data-text-property="name">
  <option value="">Seleccione categoria</option>
  <option value="frontend">Frontend</option>
  <option value="backend">Backend</option>
</select>

<select
  id="subcategorySelect"
  data-role="parent-select"
  data-child-select="#technologySelect"
  data-children-url="/api/technologies"
  data-value-property="id"
  data-text-property="name">
  <option value="">-------</option>
</select>

<select id="technologySelect">
  <option value="">-------</option>
</select>
```

En ambos casos, el plugin usa `fetch` para cargar datos y se inicializa automaticamente al cargar el DOM.

## Como Funciona

- Escucha cambios en el select padre (`data-role="parent-select"`).
- Llama `fetch` a `data-children-url` con los parametros devueltos por `getParamsForChildren(parentValue)`.
- Limpia y reconstruye el select hijo.
- Permite encadenar multiples niveles (ejemplo: categoria -> subcategoria -> tecnologia).
- Soporta listas planas y agrupadas (`grouped`).
- Puede retener valor previo del hijo, auto-seleccionar cuando solo hay una opcion y deshabilitar si queda vacio.

## Atributos `data-*` soportados

- `data-child-select`
- `data-children-url`
- `data-value-property`
- `data-text-property`
- `data-group-options-property`
- `data-group-text-property`
- `data-grouped`
- `data-empty-text`
- `data-auto-select-single`
- `data-disable-when-empty`
- `data-loading-class`

## Inicializacion Manual (opcional)

```html
<script>
  ChildSelect.init(document.querySelector('#countrySelect'));
  ChildSelect.initAll(document.querySelector('#formFilters'));
</script>
```

## API publica

```html
<script>
  const parentSelect = document.querySelector('#countrySelect')
      , instance = ChildSelect.init(parentSelect, {
          childrenUrl: '/api/cities',
          childSelectSelector: '#citySelect'
        });

  ChildSelect.getInstance(parentSelect);
  ChildSelect.destroy(parentSelect);
  ChildSelect.destroyAll(document.querySelector('#formFilters'));

  instance.destroy();
</script>
```

- `ChildSelect.init(element, options)`: crea o reutiliza una instancia.
- `ChildSelect.getInstance(element)`: devuelve la instancia actual o `null`.
- `ChildSelect.destroy(element)`: desmonta una instancia concreta.
- `ChildSelect.destroyAll(root)`: desmonta todas las instancias dentro de un contenedor.
- `instance.destroy()`: elimina listeners de la instancia actual.

## Errores comunes

- Falta `data-child-select`: se lanza error.
- Falta `data-children-url`: se lanza error.
- El selector hijo no existe en el DOM: muestra warning y no procesa cambios.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-child-select.html`
