# My Family: documentación de notificaciones

Resumen de todo lo relacionado con avisos y notificaciones push: arquitectura, flujo, datos, reglas, configuración y resolución de problemas.

## 1. Arquitectura

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Interfaz y estado local | `app.js`, `index.html` | Centro de avisos, estado de lectura, registro del dispositivo, sincronización. |
| Service worker | `sw.js` | Muestra la notificación con la app cerrada y gestiona el clic. |
| Backend | `Codigo.gs` (Google Apps Script) | Genera recordatorios, los programa, los envía por FCM y guarda lecturas. |
| Base de datos | Google Sheets | Hojas `notificaciones`, `notificaciones_lecturas`, `dispositivos_push`, `envios_push`. |
| Envío push | Firebase Cloud Messaging (FCM) | Entrega al móvil o navegador. |
| Configuración | `firebase-config.js` | Configuración Firebase y clave VAPID. |

## 2. Tipos de aviso

1. **Recordatorios de evento** (programados): `event-reminder-<eventId>-<fecha>-<minutos>`.
2. **Nueva receta**: `recipe-created-<recipeId>`, al crear una receta nueva.
3. **Nuevo documento**: `document-created-<documentId>`, al crear un documento.
4. **Prueba** (`pushTest` / `sendTestPush`): tipo `system`.

No existen avisos programados por vencimiento de documentos.

## 3. Recordatorios de evento

### Reglas
- Solo se avisa si la cita tiene **recordatorio activado** (`reminderEnabled`) y un valor en `reminderMinutesBefore`.
- Opciones de la app: *A la hora del evento* (0), *10 minutos antes*, *1 hora antes* y *1 día antes* (1440).
- Se genera **un** aviso por ocurrencia con los minutos que eligió la cita. No hay avisos adicionales.
- La hora del evento sale de `eventTime`; si no hay hora se usa `00:00`.
- Se calcula la próxima ocurrencia (incluye repeticiones, hasta unos 370 días).
- No se crea un aviso cuyo momento ya pasó hace más de 15 minutos.
- Si el evento se completa, se borra o cambia, los avisos pendientes que ya no corresponden se **caducan** (`expiresAt`).

### Texto
- Título: `<categoría>: <nombre del evento>`.
- Mensaje: `Hoy/Mañana/El dd-MM-yyyy a las HH:mm · <lugar> · Para <miembro>`.

## 4. Programación y envío (backend)

1. `installNotificationTrigger()` instala un activador **cada minuto** para `processScheduledNotifications`. Debe ejecutarse una vez en el editor de Apps Script.
2. `processScheduledNotifications()`:
   - toma un bloqueo (`LockService`) para evitar ejecuciones simultáneas;
   - `ensureSchema_()` crea las columnas que falten;
   - `syncEventReminders_()` crea los recordatorios de cada evento;
   - `sendDueNotifications_()` envía los que han vencido.
3. `sendDueNotifications_()` **solo envía** avisos que:
   - tienen `scheduledAt` ya pasado,
   - no tienen `sentAt`,
   - no están caducados.
   Se caducan sin enviar los avisos con más de 1 hora de retraso y los de eventos que ya no existen o no están pendientes.
4. `sendNotification_()`:
   - `claimNotification_()` guarda `sentAt` **antes** de enviar y verifica que se escribió; si no puede, no envía. Esto evita repeticiones cada minuto.
   - Selecciona dispositivos activos con `fcmToken`, excluyendo los que ya leyeron el aviso (o cualquier aviso de la misma cita y fecha).
   - Envía por FCM v1 y registra cada intento en `envios_push`.
   - Marca el dispositivo como inactivo si FCM indica token no válido.
5. FCM: prioridad alta y `TTL` de 24 horas.

## 5. Estado de lectura

- Se guarda **por dispositivo** (`recipientId` = ID del dispositivo) en `notificaciones_lecturas`.
- Al marcar un aviso como leído en el Centro de avisos:
  - desaparece de la lista y del contador;
  - no se vuelve a enviar a ese dispositivo;
  - se silencian los demás avisos de la misma cita y fecha (`notificationReadGroupKey` en `app.js`, `eventReminderReadGroup_` en `Codigo.gs`);
  - el evento sigue visible en Inicio hasta su fecha.
- Al sincronizar, el estado local se combina con el del servidor y se reenvían al servidor las lecturas locales que faltaran.

## 6. Interfaz (app)

- Botón de campana con contador de avisos sin leer del día.
- **Centro de avisos**: solo muestra los avisos de **hoy** que están **sin leer**. Pulsar uno lo marca como leído; hay botón *Marcar todas como leídas*.
- Botón *Activar avisos*: pide permiso, registra el dispositivo en FCM (`pushSubscribe`) y muestra una notificación de confirmación.
- Ajuste *Notificaciones*: si se desactiva, se cierra el centro y se da de baja el dispositivo (`pushUnsubscribe`).
- Las notificaciones usan `tag = notificationId`, de modo que una copia reemplaza a la anterior en el móvil.
- Estado local: `localStorage` (`my-family-notifications`, `my-family-push-device-id`).

## 7. API de Apps Script

| Acción | Uso |
|---|---|
| `bootstrap` (con `deviceId`) | Devuelve datos, avisos y las lecturas de ese dispositivo (`notificationReads`). |
| `notificationRead` | Marca un aviso como leído para un dispositivo. |
| `pushSubscribe` | Registra o renueva el `fcmToken`. |
| `pushUnsubscribe` | Desactiva el dispositivo. |
| `pushTest` | Aviso de prueba; exige `PUSH_API_KEY`. |

URL activa: ver `SHEETS_API_URL` en `app.js` (y `FIREBASE_SETUP.md`).

## 8. Hojas de datos

- **`notificaciones`**: `notificationId`, `familyId`, `memberId`, `type`, `title`, `message`, `entityType`, `entityId`, `scheduledAt`, `sentAt`, `expiresAt`, `createdAt`, `updatedAt`.
- **`notificaciones_lecturas`**: `notificationId`, `recipientId`, `read`, `readAt`, `createdAt`, `updatedAt`.
- **`dispositivos_push`**: `deviceId`, `familyId`, `platform`, `browser`, `fcmToken`, `permission`, `active`, `lastSeenAt`, `createdAt`, `updatedAt`.
- **`envios_push`**: `pushDeliveryId`, `notificationId`, `deviceId`, `status` (`queued`, `sent`, `failed`, `invalid_subscription`), `attempts`, `lastError`, `queuedAt`, `sentAt`, `updatedAt`.

## 9. Configuración necesaria

En **Script Properties** de Apps Script:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `PUSH_API_KEY` (para `pushTest`)

En `firebase-config.js`: configuración Firebase y `vapidKey`. Más detalle en `FIREBASE_SETUP.md`.

## 10. Funciones de diagnóstico (Apps Script)

- `diagnoseNotifications()`: activadores, dispositivos, últimos recordatorios y últimos envíos.
- `sendTestPush()`: aviso de prueba a la familia.
- `installNotificationTrigger()`: (re)instala el activador de cada minuto; elimina los anteriores.

## 11. Limitaciones conocidas

- Un aviso ya enviado no se retira al editar el evento.
- Una cita creada con menos antelación que su recordatorio no genera aviso.
- Los ajustes *recordatorios de eventos* y *de documentos* se guardan, pero el envío programado no los aplica.
- Los eventos de varios días se tratan por su fecha de inicio.
- Con la app cerrada, Android puede bloquear el aviso por ahorro de batería (ver sección 12).

## 12. Resolución de problemas

**No llegan avisos con la app cerrada (p. ej. Samsung Galaxy A14)**
1. Activar avisos desde el Centro de avisos y aceptar el permiso.
2. Permitir notificaciones para el navegador y para el sitio.
3. Chrome: *Batería* en **Sin restricciones**; añadirlo a *Aplicaciones que nunca se suspenden*.
4. Desactivar temporalmente el ahorro de energía y probar con el móvil bloqueado.

**Se repiten avisos**
1. Publicar la versión actual de `Codigo.gs` como nueva versión de la implementación.
2. Confirmar que `SHEETS_API_URL` apunta a esa implementación.
3. Comprobar con `diagnoseNotifications()` que existe **un solo** activador.
4. Verificar que la hoja `notificaciones` tiene `sentAt` y `expiresAt`.

**Un aviso de una cita eliminada sigue saliendo**
- Con la versión actual se caduca solo en la siguiente pasada. Si persiste, hay una implementación antigua en uso.
