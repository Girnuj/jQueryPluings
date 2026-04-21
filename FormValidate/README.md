# FormValidate

## Que hace

FormValidate agrega validaciones extendidas por `data-*` para formularios.
No reemplaza la validacion HTML nativa: la complementa con reglas de negocio que normalmente no existen en atributos estandar.
Ademas de las reglas incluidas por defecto, permite crear y registrar reglas personalizadas (custom) para casos especificos del proyecto.

## Que viene a solucionar

Cuando un formulario necesita reglas como comparar dos campos, volver obligatorio un campo segun otra seleccion o validar archivos por tamano/tipo, la validacion nativa se queda corta.

## Beneficios

- Permite reglas de negocio declarativas solo con `data-*`.
- Permite extender el motor con reglas custom propias, ademas de las validaciones incorporadas.
- Convive con FormRequest y bloquea envio cuando hay errores.
- Muestra mensajes por campo y resumen global configurable.
- Incluye auto-init y API publica para control manual.

## Requisitos

- JavaScript con sintaxis ECMAScript 2020.

## Incluir en HTML

```html
<script src="./formValidate.min.js"></script>
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
- `data-fv-custom="nombreReglaA,nombreReglaB"`: ejecuta reglas custom registradas por API.


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
- `data-fv-message-custom="..."`: mensaje generico para reglas custom.
- `data-fv-message-custom-nombre-regla="..."`: mensaje especifico por regla custom.
- `data-fv-message-target="#selector"`: renderiza mensaje en un elemento especifico.

## Compatibilidad con Razor/.NET (asp-validation-for)

FormValidate es compatible con formularios Razor/.NET: si existe un elemento con el atributo `asp-validation-for="NOMBRE"` (donde NOMBRE es el name/id del campo), el mensaje de error del plugin se mostrará automáticamente en ese contenedor, sin necesidad de agregar atributos extra del plugin.

Ejemplo:

```html
<input name="Email" ... />
<span asp-validation-for="Email"></span>
```

Esto permite integrar validaciones extendidas del plugin en formularios .NET sin modificar la estructura de mensajes de validación de Razor.

También puedes seguir usando `data-fv-message-for="nameOId"` si lo prefieres.


## Resumen global


FormValidate puede mostrar el resumen de errores en un contenedor configurable. Por defecto usa `[data-form-validate-summary]`, pero si el formulario contiene un elemento con `asp-validation-summary="ModelOnly"` o `asp-validation-summary="All"` (como en Razor/.NET), el plugin lo detecta automáticamente y muestra ahí el listado de errores.

Esto permite que el resumen de validaciones extendidas del plugin se integre de forma nativa con la estructura de validación de Razor, sin duplicar contenedores.

Ejemplo Razor:

```html
<form data-form-validate>
  ...
  <div asp-validation-summary="ModelOnly" class="text-danger"></div>
  <!-- o -->
  <div asp-validation-summary="All" class="text-danger"></div>
  ...
</form>
```

Ejemplo clásico:

```html
<form data-form-validate>
  ...
  <div data-form-validate-summary hidden></div>
  ...
</form>
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

## Ejemplo mínimo con resumen Razor

```html
<form data-form-validate>
  <div asp-validation-summary="All" class="text-danger"></div>

  <input id="email" name="email" type="text" data-fv-no-whitespace="true" data-fv-message-no-whitespace="El email no puede tener espacios." />
  <span asp-validation-for="email"></span>

  <input id="pass" type="password" />

  <input
    name="passConfirm"
    type="password"
    data-fv-equals="#pass"
    data-fv-message-equals="La confirmacion no coincide."
  />
  <span asp-validation-for="passConfirm"></span>

  <button type="submit">Enviar</button>
</form>
```

### Reglas custom (API)

Puedes registrar reglas custom globales y usarlas en cualquier campo con `data-fv-custom`.

```html
<input
  id="username"
  name="username"
  type="text"
  data-fv-custom="username-safe"
  data-fv-message-custom-username-safe="Solo letras, numeros, punto y guion bajo."
/>

<script>
  window.Plugins.FormValidate.registerCustomRule('username-safe', function (ctx) {
    const value = String(ctx.value || '').trim();
    if (!value) return true;
    return /^[a-zA-Z0-9._]+$/.test(value);
  });
</script>
```
## API publica

```html
<script>
  const form = document.querySelector('form[data-form-validate]');

  const instance = window.Plugins.FormValidate.init(form, {
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
  const errors = instance.getErrors();

  window.Plugins.FormValidate.getInstance(form);
  window.Plugins.FormValidate.destroy(form);
  window.Plugins.FormValidate.initAll(document);
  window.Plugins.FormValidate.destroyAll(document);
</script>
```

Métodos principales:

- `window.Plugins.FormValidate.init(element, options)`: crea o reutiliza una instancia.
- `instance.validateForm(config)`: ejecuta validación completa y devuelve `true/false`.
- `instance.getErrors()`: retorna los errores del último `validateForm` (array de errores, inmutable externamente).
- `window.Plugins.FormValidate.getInstance(element)`: devuelve la instancia actual o `null`.
- `window.Plugins.FormValidate.destroy(element)`: destruye una instancia concreta.
- `window.Plugins.FormValidate.initAll(root)`: inicializa formularios compatibles en un contenedor.
- `window.Plugins.FormValidate.destroyAll(root)`: destruye instancias en un contenedor.
- `window.Plugins.FormValidate.registerCustomRule(name, validator)`: registra una regla custom global.
- `window.Plugins.FormValidate.getCustomRule(name)`: obtiene una regla custom global.
- `window.Plugins.FormValidate.hasCustomRule(name)`: valida si una regla custom existe.
- `window.Plugins.FormValidate.unregisterCustomRule(name)`: elimina una regla custom global.
- `window.Plugins.FormValidate.listCustomRules()`: lista nombres de reglas custom registradas.

Firma recomendada del validator custom:

- Entrada: `{ field, form, value, normalizeFieldValue, hasMeaningfulValue, resolveReferenceField, splitCsv, parseBoolean, parseNumber }`
- Retornos validos:
  - `true | undefined | null`: valido.
  - `false`: invalido con mensaje por atributo o default.
  - `string`: invalido usando ese mensaje.
  - `{ valid: false, message?: string, detail?: object }`: invalido estructurado.
  - `{ valid: true }`: valido explicito.

## Eventos

- `before.plugin.formValidate`: antes de validar (cancelable).
- `invalid.plugin.formValidate`: cuando hay errores.
- `valid.plugin.formValidate`: cuando todo es valido.

## Demo

- `test-form-validate.html`

## Configuracion Del Observer Del Plugin

Si quieres limitar el `MutationObserver` de este plugin a un contenedor especifico, define un root directo:

```html
<section data-pp-observe-root-form-validate>...</section>
```

Prioridad de root para el plugin:

1. `data-pp-observe-root-form-validate`
2. `data-pp-observe-root` en `<html>`
3. `document.body`

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro