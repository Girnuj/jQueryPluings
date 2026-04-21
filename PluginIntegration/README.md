# Integracion de plugins

Este directorio contiene un ejemplo practico de como orquestar varios plugins en una sola pantalla sin convertirlos en un plugin monolitico.

Archivo principal:
- test-plugin-integration.html

Archivo adicional (resiliencia de red):
- test-plugin-integration-offline-action-queue.html

## Plugins combinados

- Modal: contenedor de UI para flujos de confirmacion o captura de datos.
- FormValidate: valida reglas declaradas por atributos data-fv-* y bloquea submit cuando hay errores.
- ConfirmAction: solicita confirmacion antes de ejecutar acciones sensibles (submit/click).
- FormRequest: ejecuta el request asincrono y renderiza respuesta en el target.
- RequestState: muestra estados visuales de loading/success/error/idle.
- NotificationPush: dispara un push visual y payload de seguimiento.

## Principio recomendado

Asignar un rol claro a cada plugin:
- Owner del request: FormRequest.
- Owner de validacion: FormValidate.
- Owner de confirmacion: ConfirmAction.
- Owner de estado visual: RequestState.
- Owner de notificaciones: NotificationPush.

Con este enfoque se evita duplicar responsabilidades y es mas facil depurar.

## Orden de flujo sugerido

1. Usuario intenta enviar formulario.
2. FormValidate valida y cancela si hay errores.
3. ConfirmAction solicita confirmacion (si aplica).
4. FormRequest realiza la solicitud.
5. RequestState refleja estado del ciclo.
6. NotificationPush comunica resultado al usuario.

## Tips para combinar plugins

- Evita tener dos plugins enviando el mismo request.
- Usa eventos custom para puentes entre plugins (before/success/error/complete).
- Manten targets de UI separados para estado, respuesta y notificaciones.
- En demos locales, usa mocks de fetch para no depender de backend.

## Estrategia de observers por plugin

Cuando varios plugins conviven en una sola vista, conviene definir roots directos por plugin para limitar el alcance del `MutationObserver` y mejorar rendimiento.

Importante:

- Los plugins tambien pueden usarse sin declarar roots directos; en ese caso aplican su fallback normal (`data-pp-observe-root` en `<html>` o `document.body`).
- Puedes declarar varios observers en un mismo elemento si ese contenedor comparte responsabilidades de varios plugins.

Ejemplo recomendado:

```html
<main id="integration-root">
	<section data-pp-observe-root-form-request>...</section>
	<section data-pp-observe-root-request-state>...</section>
	<section data-pp-observe-root-notification-push>...</section>
	<section data-pp-observe-root-form-validate>...</section>
	<section data-pp-observe-root-confirm-action>...</section>
</main>
```

Tambien es valido concentrar varios atributos en un solo nodo:

```html
<section
	data-pp-observe-root-form-request
	data-pp-observe-root-request-state
	data-pp-observe-root-notification-push
>
	...
</section>
```

Regla de prioridad por plugin:

1. `data-pp-observe-root-{plugin}`
2. `data-pp-observe-root` definido en `<html>`
3. `document.body`

Si prefieres inicializacion manual total para escenarios muy controlados:

```html
<html data-pp-observe-global="false"></html>
<script>
	window.Plugins.Modal.initAll(document);
	window.Plugins.FormValidate.initAll(document);
	window.Plugins.ConfirmAction.initAll(document);
	window.Plugins.FormRequest.initAll(document);
	window.Plugins.RequestState.initAll(document);
	window.Plugins.NotificationPush.initAll(document);
</script>
```

#### ℹ️ Para detalles sobre el patrón de observers y cómo optimizar la inicialización automática de plugins, revisa la sección [Patrón Recomendado De Observers](../README.md#patron-recomendado-de-observers) en el README principal.

## Nota

Este ejemplo esta pensado para aprendizaje y pruebas de integracion. Puedes copiar el patron y ajustarlo por modulo o por pantalla en tu proyecto real.
