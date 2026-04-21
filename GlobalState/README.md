# GlobalState

Micro-plugin para gestión de estado global y sistema pub/sub de eventos en JavaScript nativo.
Permite compartir datos y reaccionar a cambios de estado o eventos custom entre vistas, componentes o plugins, sin dependencias externas.

## ¿Para qué sirve?
- Compartir datos globales entre diferentes partes de la app (SPA, multipágina, plugins).
- Comunicar componentes desacoplados mediante eventos custom.
- Facilitar la integración entre plugins y vistas complejas.

## Instalación

Incluye el archivo en tu HTML:

```html
<script src="GlobalState/globalState.js"></script>
```

## API

### Estado global (clave/valor)
- `GlobalState.set(key, value)` — Guarda un valor global y notifica a los suscriptores de la clave.
- `GlobalState.get(key)` — Obtiene el valor de una clave global.
- `GlobalState.subscribe(key, callback)` — Suscribe una función a los cambios de una clave.
- `GlobalState.unsubscribe(key, callback)` — Elimina la suscripción a una clave.

### Eventos custom (pub/sub)
- `GlobalState.publish(event, payload)` — Publica un evento global con datos.
- `GlobalState.on(event, callback)` — Suscribe una función a un evento custom.
- `GlobalState.off(event, callback)` — Elimina la suscripción a un evento custom.

### Utilidad
- `GlobalState.clear()` — Limpia todo el estado y las suscripciones (para testing o reinicio).

## Ejemplo de uso

```js
// Guardar y leer estado global
window.Plugins.GlobalState.set('usuario', {nombre: 'Ana'});
const user = window.Plugins.GlobalState.get('usuario');

// Suscribirse a cambios de una clave
window.Plugins.GlobalState.subscribe('usuario', (nuevoValor) => {
  console.log('Usuario actualizado', nuevoValor);
});

// Publicar un evento custom
window.Plugins.GlobalState.publish('notificacion', {mensaje: 'Hola!'});

// Suscribirse a un evento custom
window.Plugins.GlobalState.on('notificacion', (payload) => {
  alert(payload.mensaje);
});
```


## Diferencia con NotificationPush

Aunque ambos permiten comunicación global y desacoplada, su propósito es distinto:

- **GlobalState**: gestiona datos globales (clave/valor) y pub/sub de eventos genéricos, sin lógica de UI. Es ideal para compartir información o disparar eventos entre cualquier parte de la app, pero no muestra mensajes visuales al usuario.
- **NotificationPush**: está enfocado en mostrar notificaciones visuales (tipo toast) y enviar mensajes a un receptor o endpoint. Su objetivo es el feedback inmediato al usuario y la integración visual.

Ambos pueden complementarse: por ejemplo, puedes disparar una notificación visual con NotificationPush cuando cambie un valor importante en GlobalState.

## Recomendaciones
- Úsalo para compartir datos o eventos entre plugins, vistas o componentes que no se comunican directamente.
- No abuses de estado global para todo; úsalo solo cuando realmente se requiera compartir información o eventos.

---

## Licencia

Este plugin se distribuye bajo la licencia MIT.
Consulta el archivo LICENSE en la raíz del repositorio para los términos completos.

Copyright (c) 2026 Samuel Montenegro