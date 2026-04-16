# FormValidate

## Que hace

FormValidate agrega validaciones extendidas por `data-*` para formularios.
No reemplaza la validacion HTML nativa: la complementa con reglas de negocio que normalmente no existen en atributos estandar.

## Que viene a solucionar

Cuando un formulario necesita reglas como comparar dos campos, volver obligatorio un campo segun otra seleccion o validar archivos por tamano/tipo, la validacion nativa se queda corta.

## Beneficios

- Permite reglas de negocio declarativas solo con `data-*`.
- Convive con FormRequest y bloquea envio cuando hay errores.
- Muestra mensajes por campo y resumen global configurable.
- Incluye auto-init y API publica para control manual.

## Requisitos

- JavaScript con sintaxis ECMAScript 2020.

## Incluir en HTML

```html
<script src="./formValidate.js"></script>
```

## Integracion con FormRequest

Si usas ambos plugins en el mismo formulario, FormValidate valida primero y solo deja continuar si no hay errores.

```html
<form data-form-validate data-form-request action="/api/endpoint" method="post">
  ...
</form>
```

No necesitas FormRequest para usar FormValidate.
Las validaciones funcionan con un formulario HTML normal usando solo `data-form-validate` y las reglas `data-fv-*`.

```html
<form data-form-validate action="#" method="post">
  ...
</form>
```

## Reglas extendidas (data-*)

Estas reglas no duplican atributos nativos como `required`, `minlength` o `pattern`.

- `data-fv-equals="#selector"`: el valor debe coincidir con otro campo.
- `data-fv-required-if="#selector:valor"`: exige valor cuando otro campo tiene un valor especifico.
- `data-fv-required-any="#selectorA,#selectorB"`: exige que al menos uno de los campos referenciados tenga valor.
- `data-fv-number-range="min:max"`: valida que el valor numerico del campo este dentro de un rango.
- `data-fv-no-whitespace="true"`: no permite espacios en blanco.
- `data-fv-min-checked="2"`: minimo de checks seleccionados en un grupo (mismo `name`).
- `data-fv-max-files="1"`: limite de archivos seleccionados en input file.
- `data-fv-file-max-mb="2"`: tamano maximo por archivo en MB.
- `data-fv-file-types="image/jpeg,image/png,.pdf"`: tipos/extensiones permitidos.

## Mensajes

- `data-fv-message="..."`: mensaje generico para el campo.
- `data-fv-message-required-if="..."`
- `data-fv-message-required-any="..."`
- `data-fv-message-equals="..."`
- `data-fv-message-number-range="..."`
- `data-fv-message-no-whitespace="..."`
- `data-fv-message-min-checked="..."`
- `data-fv-message-max-files="..."`
- `data-fv-message-file-max-mb="..."`
- `data-fv-message-file-types="..."`
- `data-fv-message-target="#selector"`: renderiza mensaje en un elemento especifico.

Tambien puedes usar un target por clave de campo con `data-fv-message-for="nameOId"`.

## Resumen global

Puedes renderizar errores en bloque con:

```html
<div data-form-validate-summary hidden></div>
```

## Ejemplo minimo

```html
<form data-form-validate>
  <input id="pass" type="password" />

  <input
    name="passConfirm"
    type="password"
    data-fv-equals="#pass"
    data-fv-message-equals="La confirmacion no coincide."
  />
  <div data-fv-message-for="passConfirm"></div>

  <button type="submit">Enviar</button>
</form>
```
## API publica

```html
<script>
  var form = document.querySelector('form[data-form-validate]');

  var instance = window.FormValidate.init(form, {
    focusFirstInvalid: true,
    validateOnInput: true,
    validateOnBlur: true,
    invalidClass: 'is-invalid',
    validClass: 'is-valid',
    summarySelector: '[data-form-validate-summary]',
    beforeValidate: function (formEl) {
      console.log('before validate', formEl);
    },
    afterValidate: function (errors, formEl) {
      console.log('after validate', errors, formEl);
    }
  });

  instance.validateForm({ emitEvents: true, focusFirst: true });

  window.FormValidate.getInstance(form);
  window.FormValidate.destroy(form);
  window.FormValidate.initAll(document);
  window.FormValidate.destroyAll(document);
</script>
```

## Ejemplo unificado (todas las validaciones)

```html
<form data-form-validate action="#" method="post">
  <div data-form-validate-summary hidden></div>

  <!-- VALIDACION: no-whitespace -->
  <label for="username">Usuario (sin espacios)</label>
  <input
    id="username"
    name="username"
    type="text"
    data-fv-no-whitespace="true"
    data-fv-message-no-whitespace="El usuario no puede tener espacios."
  />
  <div data-fv-message-for="username"></div>

  <!-- VALIDACION: required-if -->
  <label for="accountType">Tipo de cuenta</label>
  <select id="accountType" name="accountType">
    <option value="person">Persona</option>
    <option value="business">Empresa</option>
  </select>

  <label for="companyId">ID empresa (solo si tipo=business)</label>
  <input
    id="companyId"
    name="companyId"
    type="text"
    data-fv-required-if="#accountType:business"
    data-fv-message-required-if="Debes completar ID empresa para cuenta empresa."
  />
  <div data-fv-message-for="companyId"></div>

  <!-- VALIDACION: required-any -->
  <label for="phone">Telefono</label>
  <input id="phone" name="phone" type="text" />

  <label for="email">Email (telefono o email)</label>
  <input
    id="email"
    name="email"
    type="text"
    data-fv-required-any="#phone,#email"
    data-fv-message-required-any="Debes completar telefono o email."
  />
  <div data-fv-message-for="email"></div>

  <!-- VALIDACION: number-range -->
  <label for="age">Edad (18 a 65)</label>
  <input
    id="age"
    name="age"
    type="text"
    data-fv-number-range="18:65"
    data-fv-message-number-range="La edad debe estar entre 18 y 65."
  />
  <div data-fv-message-for="age"></div>

  <!-- VALIDACION: equals -->
  <label for="password">Password</label>
  <input id="password" name="password" type="password" />

  <label for="passwordConfirm">Confirmar password</label>
  <input
    id="passwordConfirm"
    name="passwordConfirm"
    type="password"
    data-fv-equals="#password"
    data-fv-message-equals="La confirmacion no coincide."
  />
  <div data-fv-message-for="passwordConfirm"></div>

  <!-- VALIDACION: min-checked -->
  <label>Intereses (minimo 2)</label>
  <label><input type="checkbox" name="interest" value="ux" data-fv-min-checked="2" /> UX</label>
  <label><input type="checkbox" name="interest" value="frontend" data-fv-min-checked="2" /> Frontend</label>
  <label><input type="checkbox" name="interest" value="backend" data-fv-min-checked="2" /> Backend</label>
  <div data-fv-message-for="interest"></div>

  <!-- VALIDACION: max-files + file-max-mb + file-types -->
  <label for="avatar">Avatar (max 1 archivo, max 2MB, jpg/png)</label>
  <input
    id="avatar"
    name="avatar"
    type="file"
    data-fv-max-files="1"
    data-fv-file-max-mb="2"
    data-fv-file-types="image/jpeg,image/png"
    data-fv-message-max-files="Solo puedes subir 1 archivo."
    data-fv-message-file-max-mb="El archivo no debe superar 2MB."
    data-fv-message-file-types="Solo JPG o PNG."
  />
  <div data-fv-message-for="avatar"></div>

  <button type="submit">Enviar</button>
</form>
```

Metodos principales:

- `window.FormValidate.init(element, options)`: crea o reutiliza una instancia.
- `instance.validateForm(config)`: ejecuta validacion completa y devuelve `true/false`.
- `window.FormValidate.getInstance(element)`: devuelve la instancia actual o `null`.
- `window.FormValidate.destroy(element)`: destruye una instancia concreta.
- `window.FormValidate.initAll(root)`: inicializa formularios compatibles en un contenedor.
- `window.FormValidate.destroyAll(root)`: destruye instancias en un contenedor.

## Eventos

- `before.plugin.formValidate`: antes de validar (cancelable).
- `invalid.plugin.formValidate`: cuando hay errores.
- `valid.plugin.formValidate`: cuando todo es valido.

## Demo

- `test-form-validate.html`
