# InputSwitchFriendly

Plugin JavaScript nativo para mostrar un texto amigable segun el estado de un input tipo switch/checkbox.

## Requisitos

- Un navegador moderno con soporte para `MutationObserver`, `WeakMap` y `queueMicrotask`
- Un input con `data-role="friendly-switch"`
- Atributos para textos de estado (`data-friendly-switch-checked` y `data-friendly-switch-unchecked`)

## Instalacion

Incluye solo el plugin:

```html
<script src="./inputSwitchFriendly.js"></script>
```

## Uso Basico

```html
<input
  id="termsSwitch"
  type="checkbox"
  data-role="friendly-switch"
  data-friendly-switch-checked="Aceptado"
  data-friendly-switch-unchecked="Pendiente" />

<label for="termsSwitch"></label>
```

Con eso basta. El plugin se inicializa automaticamente al cargar el DOM.

## Como Funciona

- Busca inputs con `data-role="friendly-switch"`.
- Lee los textos desde:
  - `data-friendly-switch-checked`
  - `data-friendly-switch-unchecked`
- Usa como destino:
  - `data-friendly-switch-target` si existe.
  - Si no existe, intenta `label[for="idDelInput"]`.
- En cada `change`, actualiza el texto objetivo segun el estado del switch.

## Inicializacion Automatica

El plugin se auto-inicializa sobre:

- `[data-role="friendly-switch"]`

Ademas, usa `MutationObserver` para inicializar nodos agregados dinamicamente y desmontar instancias cuando esos nodos salen realmente del documento.

## Inicializacion Manual (opcional)

```html
<script>
  InputSwitchFriendly.init(document.querySelector('#termsSwitch'));
  InputSwitchFriendly.initAll(document.querySelector('#myForm'));
</script>
```

## API publica

```html
<script>
  const input = document.querySelector('#termsSwitch')
      , instance = InputSwitchFriendly.init(input);

  InputSwitchFriendly.getInstance(input);
  InputSwitchFriendly.destroy(input);
  InputSwitchFriendly.destroyAll(document.querySelector('#myForm'));

  instance.destroy();
</script>
```

- `InputSwitchFriendly.init(element, options)`: crea o reutiliza una instancia.
- `InputSwitchFriendly.getInstance(element)`: devuelve la instancia actual o `null`.
- `InputSwitchFriendly.destroy(element)`: desmonta una instancia concreta.
- `InputSwitchFriendly.destroyAll(root)`: desmonta todas las instancias dentro de un contenedor.
- `instance.destroy()`: elimina listeners de la instancia actual.

## Errores comunes

- Falta `id` y tambien falta `data-friendly-switch-target`: no encuentra destino para mostrar texto.
- Falta `data-friendly-switch-checked` o `data-friendly-switch-unchecked`: no se vincula el evento de cambio.

## Demo

Puedes abrir el archivo de prueba incluido en este proyecto:

- `test-input-switch-friendly.html`
