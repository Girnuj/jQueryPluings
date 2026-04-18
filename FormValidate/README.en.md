# FormValidate

## What it does

FormValidate adds extended form validation rules through `data-*` attributes.
It does not replace native HTML validation: it complements it with business rules that standard attributes usually do not cover.
In addition to built-in rules, it also allows creating and registering custom validation rules for project-specific needs.

## Problem it solves

When a form needs rules like matching two fields, making one field required only under a condition, or validating file size/type, native validation is often not enough.

## Benefits

- Declarative business rules with `data-*` attributes.
- Extensible validation engine with custom rules beyond the built-in ones.
- Works together with FormRequest and blocks submit when invalid.
- Field-level messages plus optional global summary.
- Auto-init and public API for manual control.

## Requirements

- JavaScript with ECMAScript 2020 syntax.

## Include in HTML

```html
<script src="./formValidate.js"></script>
```

## Integration with FormRequest

If both plugins are used in the same form, FormValidate runs first and only lets FormRequest continue when validation passes.

```html
<form data-form-validate data-form-request action="/api/endpoint" method="post">
  ...
</form>
```

You do not need FormRequest to use FormValidate.
Validations work with a regular HTML form using only `data-form-validate` and `data-fv-*` rules.

```html
<form data-form-validate action="#" method="post">
  ...
</form>
```

## Extended rules (data-*)

These rules avoid duplicating native attributes such as `required`, `minlength`, or `pattern`.

- `data-fv-equals="#selector"`: value must match another field.
- `data-fv-required-if="#selector:value"`: field becomes required if another field matches a value.
- `data-fv-required-any="#selectorA,#selectorB"`: requires at least one referenced field to have a value.
- `data-fv-number-range="min:max"`: validates that the numeric value stays inside a range.
- `data-fv-no-whitespace="true"`: disallows whitespace.
- `data-fv-min-checked="2"`: minimum checked items in a checkbox group (same `name`).
- `data-fv-max-files="1"`: max selected files in a file input.
- `data-fv-file-max-mb="2"`: max file size per file in MB.
- `data-fv-file-types="image/jpeg,image/png,.pdf"`: allowed mime types/extensions.
- `data-fv-custom="ruleNameA,ruleNameB"`: runs custom rules registered via API.

## Messages

- `data-fv-message="..."`: generic field message.
- `data-fv-message-required-if="..."`
- `data-fv-message-required-any="..."`
- `data-fv-message-equals="..."`
- `data-fv-message-number-range="..."`
- `data-fv-message-no-whitespace="..."`
- `data-fv-message-min-checked="..."`
- `data-fv-message-max-files="..."`
- `data-fv-message-file-max-mb="..."`
- `data-fv-message-file-types="..."`
- `data-fv-message-custom="..."`: generic message for custom rules.
- `data-fv-message-custom-rule-name="..."`: rule-specific message for a custom rule.
- `data-fv-message-target="#selector"`: render message in a specific element.

You can also target by field key using `data-fv-message-for="nameOrId"`.

## Global summary

You can render all validation errors in one block:

```html
<div data-form-validate-summary hidden></div>
```

## Minimal example

```html
<form data-form-validate>
  <input id="pass" type="password" />

  <input
    name="passConfirm"
    type="password"
    data-fv-equals="#pass"
    data-fv-message-equals="Confirmation does not match."
  />
  <div data-fv-message-for="passConfirm"></div>

  <button type="submit">Send</button>
</form>
```

## Public API

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

## Quick examples for new rules

### `required-any`

```html
<input id="phone" name="phone" type="text" />

<input
  id="email"
  name="email"
  type="text"
  data-fv-required-any="#phone,#email"
  data-fv-message-required-any="Provide phone or email."
/>
```

### `number-range`

```html
<input
  id="amount"
  name="amount"
  type="text"
  data-fv-number-range="100:1000"
  data-fv-message-number-range="Amount must be between 100 and 1000."
/>
```

## Unified example (all validations)

```html
<form data-form-validate action="#" method="post">
  <div data-form-validate-summary hidden></div>

  <!-- VALIDATION: no-whitespace -->
  <label for="username">Username (no whitespace)</label>
  <input
    id="username"
    name="username"
    type="text"
    data-fv-no-whitespace="true"
    data-fv-message-no-whitespace="Username cannot contain spaces."
  />
  <div data-fv-message-for="username"></div>

  <!-- VALIDATION: required-if -->
  <label for="accountType">Account type</label>
  <select id="accountType" name="accountType">
    <option value="person">Person</option>
    <option value="business">Business</option>
  </select>

  <label for="companyId">Company ID (only if type=business)</label>
  <input
    id="companyId"
    name="companyId"
    type="text"
    data-fv-required-if="#accountType:business"
    data-fv-message-required-if="Company ID is required for business accounts."
  />
  <div data-fv-message-for="companyId"></div>

  <!-- VALIDATION: required-any -->
  <label for="phone">Phone</label>
  <input id="phone" name="phone" type="text" />

  <label for="email">Email (phone or email)</label>
  <input
    id="email"
    name="email"
    type="text"
    data-fv-required-any="#phone,#email"
    data-fv-message-required-any="You must provide phone or email."
  />
  <div data-fv-message-for="email"></div>

  <!-- VALIDATION: number-range -->
  <label for="age">Age (18 to 65)</label>
  <input
    id="age"
    name="age"
    type="text"
    data-fv-number-range="18:65"
    data-fv-message-number-range="Age must be between 18 and 65."
  />
  <div data-fv-message-for="age"></div>

  <!-- VALIDATION: equals -->
  <label for="password">Password</label>
  <input id="password" name="password" type="password" />

  <label for="passwordConfirm">Confirm password</label>
  <input
    id="passwordConfirm"
    name="passwordConfirm"
    type="password"
    data-fv-equals="#password"
    data-fv-message-equals="Confirmation does not match."
  />
  <div data-fv-message-for="passwordConfirm"></div>

  <!-- VALIDATION: min-checked -->
  <label>Interests (minimum 2)</label>
  <label><input type="checkbox" name="interest" value="ux" data-fv-min-checked="2" /> UX</label>
  <label><input type="checkbox" name="interest" value="frontend" data-fv-min-checked="2" /> Frontend</label>
  <label><input type="checkbox" name="interest" value="backend" data-fv-min-checked="2" /> Backend</label>
  <div data-fv-message-for="interest"></div>

  <!-- VALIDATION: max-files + file-max-mb + file-types -->
  <label for="avatar">Avatar (max 1 file, max 2MB, jpg/png)</label>
  <input
    id="avatar"
    name="avatar"
    type="file"
    data-fv-max-files="1"
    data-fv-file-max-mb="2"
    data-fv-file-types="image/jpeg,image/png"
    data-fv-message-max-files="You can upload only 1 file."
    data-fv-message-file-max-mb="File size must not exceed 2MB."
    data-fv-message-file-types="JPG or PNG only."
  />
  <div data-fv-message-for="avatar"></div>

  <button type="submit">Send</button>
</form>
```

Main methods:

- `window.FormValidate.init(element, options)`: creates or reuses an instance.
- `instance.validateForm(config)`: runs full validation and returns `true/false`.
- `window.FormValidate.getInstance(element)`: returns current instance or `null`.
- `window.FormValidate.destroy(element)`: destroys a specific instance.
- `window.FormValidate.initAll(root)`: initializes compatible forms in a container.
- `window.FormValidate.destroyAll(root)`: destroys instances in a container.
- `window.FormValidate.registerCustomRule(name, validator)`: registers a global custom rule.
- `window.FormValidate.getCustomRule(name)`: gets a global custom rule.
- `window.FormValidate.hasCustomRule(name)`: checks if a custom rule exists.
- `window.FormValidate.unregisterCustomRule(name)`: removes a global custom rule.
- `window.FormValidate.listCustomRules()`: lists registered custom rule names.

### Custom rules (API)

You can register global custom rules and reference them in fields via `data-fv-custom`.

```html
<input
  id="username"
  name="username"
  type="text"
  data-fv-custom="username-safe"
  data-fv-message-custom-username-safe="Only letters, numbers, dot and underscore."
/>

<script>
  window.FormValidate.registerCustomRule('username-safe', function (ctx) {
    var value = String(ctx.value || '').trim();
    if (!value) return true;
    return /^[a-zA-Z0-9._]+$/.test(value);
  });
</script>
```

Recommended validator signature:

- Input: `{ field, form, value, normalizeFieldValue, hasMeaningfulValue, resolveReferenceField, splitCsv, parseBoolean, parseNumber }`
- Valid return values:
  - `true | undefined | null`: valid.
  - `false`: invalid with attribute/default message.
  - `string`: invalid using that message.
  - `{ valid: false, message?: string, detail?: object }`: structured invalid.
  - `{ valid: true }`: explicit valid.

## Events

- `before.plugin.formValidate`: before validation (cancelable).
- `invalid.plugin.formValidate`: when errors exist.
- `valid.plugin.formValidate`: when all validations pass.

## Demo

- `test-form-validate.html`

## Plugin Observer Configuration

If you want to scope this plugin `MutationObserver` to a specific container, define a direct root:

```html
<section data-pp-observe-root-form-validate>...</section>
```

Plugin root priority:

1. `
data-pp-observe-root-form-validate
`
2. `data-pp-observe-root` on `<html>`
3. `document.body`

