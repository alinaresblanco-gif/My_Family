# Configurar Firebase Cloud Messaging

## 1. Crear Firebase

1. En Firebase Console, crea o abre el proyecto de My Family.
2. Añade una aplicación Web y copia su objeto `firebaseConfig`.
3. En **Configuración del proyecto > Cloud Messaging > Certificados push web**, genera una pareja de claves.
4. Sustituye todos los valores `REEMPLAZAR_*` de `firebase-config.js`. Usa la clave pública como `vapidKey`.
5. En Google Cloud Console, confirma que **Firebase Cloud Messaging API (HTTP v1)** está habilitada.

La configuración web y la clave VAPID pública no son secretos. No pongas una clave privada en `firebase-config.js`.

## 2. Configurar Apps Script

En Firebase Console, abre **Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada**. Del JSON descargado toma `project_id`, `client_email` y `private_key`.

En Apps Script abre **Configuración del proyecto > Propiedades del script** y crea:

| Propiedad | Valor |
|---|---|
| `FIREBASE_PROJECT_ID` | `project_id` del JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` del JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` completa del JSON |
| `PUSH_API_KEY` | texto aleatorio largo para proteger `pushTest` |

No guardes el JSON de la cuenta de servicio en el repositorio ni en Google Sheets.

Ejecuta una vez `migrateSchema()` desde el editor de Apps Script. Esto añade `fcmToken` a `dispositivos_push` si aún no existe.

## 3. Publicar

1. Publica la PWA en HTTPS. FCM no funciona desde páginas HTTP, excepto `localhost`.
2. En Apps Script abre **Implementar > Gestionar implementaciones > Editar > Nueva versión > Implementar**.
3. Conserva la URL `/exec` actual o actualiza `SHEETS_API_URL` en `app.js` si Google genera otra.
4. Abre la PWA instalada y pulsa **Notificaciones > Activar avisos**.
5. Comprueba que aparece una fila activa con `fcmToken` en `dispositivos_push`.

## 4. Probar el envío

Desde el editor de Apps Script ejecuta `sendTestPush()`. La primera ejecución pedirá permisos para consultar servicios externos. Debe:

- crear una fila en `notificaciones`;
- enviar a todos los dispositivos activos de la familia;
- crear una fila por intento en `envios_push`;
- mostrar el aviso en el móvil.

También se puede hacer un POST a `/exec` con `action: "pushTest"`, `familyId`, `title`, `message`, `url` y la propiedad privada `apiKey`. No incluyas esa clave en la PWA.

## 5. Envíos programados

Ejecuta una vez `installNotificationTrigger()` desde el editor de Apps Script. Esta función elimina activadores duplicados de notificaciones y crea uno que ejecuta `processScheduledNotifications` cada minuto. La función envía filas de `notificaciones` cuyo `scheduledAt` ya haya llegado y cuyo `sentAt` esté vacío.

La misma función genera automáticamente los recordatorios de eventos activos según `eventDate`, `eventTime`, `reminderMinutesBefore` y `repeatFrequency`, y evita duplicarlos mediante un identificador formado por evento y fecha de repetición.
