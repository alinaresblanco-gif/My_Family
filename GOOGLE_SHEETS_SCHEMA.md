# My Family: diseño de base de datos y backend

Documento de preparación para crear la base de datos en Google Sheets y conectar después la aplicación mediante Google Apps Script.

## 1. Reglas generales

- Cada pestaña del libro será una tabla.
- La primera fila de cada pestaña contiene exactamente los encabezados indicados.
- Todos los identificadores son textos únicos, preferiblemente UUID. No usar el número visible de fila como ID.
- Fechas: `YYYY-MM-DD`.
- Fechas y horas completas: ISO 8601, por ejemplo `2026-09-09T08:30:00+02:00`.
- Valores booleanos: `TRUE` o `FALSE`.
- Los campos `createdAt`, `updatedAt` y `deletedAt` permiten sincronización y borrado lógico.
- Los campos JSON se guardan como texto JSON válido dentro de la celda.
- La aplicación seguirá funcionando localmente si Google Sheets no está disponible.

## 2. Hojas que hay que crear

### 2.1 `familias`

Una fila por familia instalada en la aplicación.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `familyId` | texto | Sí | ID único de la familia. |
| `name` | texto | Sí | Nombre visible de la familia. |
| `avatar` | texto | No | Emoji, iniciales o símbolo familiar. |
| `timezone` | texto | Sí | Zona horaria, por ejemplo `Europe/Madrid`. |
| `locale` | texto | Sí | Idioma regional, por ejemplo `es-ES`. |
| `storageCapacityBytes` | número | Sí | Capacidad lógica contratada o acordada. |
| `storageUsedBytes` | número | Sí | Espacio usado calculado por el backend. |
| `syncEnabled` | booleano | Sí | Si la familia permite sincronización. |
| `createdAt` | fecha-hora | Sí | Alta de la familia. |
| `updatedAt` | fecha-hora | Sí | Última modificación. |
| `deletedAt` | fecha-hora | No | Borrado lógico. |

### 2.2 `miembros`

Fuente única para nombres, colores y perfiles usados en Inicio, Agenda, Miembros y notificaciones.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `memberId` | texto | Sí | ID estable del miembro. |
| `familyId` | texto | Sí | Relación con `familias.familyId`. |
| `name` | texto | Sí | Nombre visible actual. |
| `role` | texto | Sí | Parentesco o rol. |
| `initials` | texto | No | Iniciales o avatar textual. |
| `colorHex` | texto | Sí | Color del perfil, por ejemplo `#8EC68F`. |
| `phone` | texto | No | Teléfono, con formato internacional si se usa para avisos. |
| `email` | texto | No | Correo opcional. |
| `birthDate` | fecha | No | Fecha de nacimiento. |
| `notes` | texto | No | Notas privadas del perfil. |
| `active` | booleano | Sí | Permite ocultar sin borrar. |
| `createdAt` | fecha-hora | Sí | Alta. |
| `updatedAt` | fecha-hora | Sí | Último cambio. |
| `deletedAt` | fecha-hora | No | Borrado lógico. |

### 2.3 `eventos`

Es la tabla común de Post-it de Inicio y eventos de Agenda.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `eventId` | texto | Sí | ID único del evento. |
| `familyId` | texto | Sí | Familia propietaria. |
| `memberId` | texto | Sí | Miembro responsable o creador. |
| `name` | texto | Sí | Nombre del Post-it o evento. |
| `eventDate` | fecha | Sí | Día del evento. |
| `eventTime` | hora | No | Hora local. |
| `place` | texto | No | Lugar o detalle. |
| `category` | texto | Sí | Médico, Actividad, Ocio, Tareas u otra categoría. |
| `description` | texto | No | Descripción ampliada. |
| `status` | texto | Sí | `pending`, `done`, `cancelled`. |
| `doneAt` | fecha-hora | No | Momento en que se completó. |
| `reminderEnabled` | booleano | Sí | Si genera recordatorio. |
| `reminderMinutesBefore` | número | No | Minutos de antelación. |
| `repeatFrequency` | texto | Sí | `none`, `daily`, `weekly`, `monthly` o `yearly`. |
| `createdBy` | texto | Sí | Usuario o dispositivo que lo creó. |
| `createdAt` | fecha-hora | Sí | Alta. |
| `updatedAt` | fecha-hora | Sí | Último cambio. |
| `deletedAt` | fecha-hora | No | Borrado lógico. |

**Uso en las vistas:**

- Inicio filtra `eventDate` por el día actual.
- Semana agrupa por la semana activa.
- Mes muestra un círculo usando `miembros.colorHex`.
- Próximos filtra los eventos entre el lunes y el domingo de la semana activa.
- Los eventos pasados no se borran: dejan de aparecer en Inicio, pero siguen en Agenda.

### 2.4 `recetas`

Recetas guardadas desde «Nueva receta».

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `recipeId` | texto | Sí | ID único. |
| `familyId` | texto | Sí | Familia propietaria. |
| `createdByMemberId` | texto | No | Miembro que la creó. |
| `name` | texto | Sí | Nombre de la receta. |
| `category` | texto | Sí | Familiares, Rápidos, Saludables, Postres o Favoritas. |
| `description` | texto | No | Descripción breve. |
| `prepTimeMinutes` | número | No | Tiempo de preparación. |
| `servings` | texto | No | Raciones. |
| `coverFileId` | texto | No | ID del archivo en Google Drive. |
| `coverUrl` | texto | No | URL controlada por el backend. |
| `ingredientsText` | texto | Sí | Ingredientes separados por saltos de línea. |
| `stepsText` | texto | Sí | Elaboración separada por saltos de línea. |
| `favorite` | booleano | Sí | Si está marcada como favorita. |
| `createdAt` | fecha-hora | Sí | Alta. |
| `updatedAt` | fecha-hora | Sí | Último cambio. |
| `deletedAt` | fecha-hora | No | Borrado lógico. |

La imagen no debe guardarse como base64 en Sheets. Debe almacenarse en Google Drive y en la hoja solo se guarda `coverFileId` y, si hace falta, `coverUrl`.

### 2.5 `documentos`

Metadatos de Documentoteca. El contenido binario debe ir a Google Drive, no dentro de una celda.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `documentId` | texto | Sí | ID único. |
| `familyId` | texto | Sí | Familia propietaria. |
| `uploadedByMemberId` | texto | No | Miembro que lo subió. |
| `name` | texto | Sí | Nombre original del archivo. |
| `mimeType` | texto | Sí | Tipo MIME. |
| `extension` | texto | Sí | PDF, JPG, DOCX, etc. |
| `sizeBytes` | número | Sí | Tamaño del archivo. |
| `driveFileId` | texto | Sí | ID del archivo en Google Drive. |
| `driveUrl` | texto | No | URL generada por el backend. |
| `category` | texto | Sí | Identidad y registros, Educación, Salud, Finanzas y hogar, Vehículos, Eventos y recuerdos. |
| `uploadDate` | fecha | Sí | Fecha de subida. |
| `expiryDate` | fecha | No | Fecha de vencimiento. |
| `notes` | texto | No | Notas del documento. |
| `createdAt` | fecha-hora | Sí | Alta. |
| `updatedAt` | fecha-hora | Sí | Último cambio. |
| `deletedAt` | fecha-hora | No | Borrado lógico. |

**Regla de «Revisar pronto»:** seleccionar documentos con `expiryDate` entre hoy y hoy + 90 días, ordenados por fecha ascendente.

### 2.6 `notificaciones`

Bandeja de avisos que aparece en el rombo de la cabecera.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `notificationId` | texto | Sí | ID único. |
| `familyId` | texto | Sí | Familia destinataria. |
| `memberId` | texto | No | Miembro relacionado. |
| `type` | texto | Sí | `event`, `document`, `system`, `sync`, `update`. |
| `title` | texto | Sí | Título corto. |
| `message` | texto | Sí | Texto del aviso. |
| `entityType` | texto | No | `event`, `document`, `recipe`, `member`. |
| `entityId` | texto | No | ID del registro relacionado. |
| `scheduledAt` | fecha-hora | No | Momento programado. |
| `sentAt` | fecha-hora | No | Momento de envío al dispositivo. |
| `expiresAt` | fecha-hora | No | Caducidad del aviso. |
| `createdAt` | fecha-hora | Sí | Alta. |
| `updatedAt` | fecha-hora | Sí | Última modificación. |

El estado leído no debe ser único para toda la familia si cada móvil puede leer de forma independiente. Para eso se usa `notificaciones_lecturas`.

### 2.7 `notificaciones_lecturas`

Estado de lectura por usuario o dispositivo.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `notificationId` | texto | Sí | Relación con `notificaciones`. |
| `recipientId` | texto | Sí | Miembro, usuario o dispositivo destinatario. |
| `read` | booleano | Sí | Leída o no. |
| `readAt` | fecha-hora | No | Momento de lectura. |
| `createdAt` | fecha-hora | Sí | Alta de la relación. |
| `updatedAt` | fecha-hora | Sí | Último cambio. |

Clave recomendada: combinación `notificationId + recipientId`.

### 2.8 `dispositivos_push`

Necesaria para mandar avisos a los móviles donde esté instalada la PWA.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `deviceId` | texto | Sí | ID interno del dispositivo. |
| `familyId` | texto | Sí | Familia propietaria. |
| `memberId` | texto | No | Miembro que autorizó el dispositivo. |
| `platform` | texto | Sí | Android, iOS, escritorio u otro. |
| `browser` | texto | No | Chrome, Safari, Firefox, etc. |
| `endpoint` | texto | Sí | Endpoint Web Push. Es secreto operativo. |
| `p256dh` | texto | Sí | Clave pública de suscripción. |
| `auth` | texto | Sí | Token de autenticación de suscripción. |
| `permission` | texto | Sí | `granted`, `denied`, `default`. |
| `active` | booleano | Sí | Si el dispositivo puede recibir avisos. |
| `lastSeenAt` | fecha-hora | Sí | Último contacto. |
| `createdAt` | fecha-hora | Sí | Alta. |
| `updatedAt` | fecha-hora | Sí | Última renovación. |

Nunca guardar claves privadas VAPID en la hoja. Las claves privadas deben estar en propiedades protegidas de Apps Script o en un servicio backend seguro.

### 2.9 `envios_push`

Cola y auditoría de los avisos enviados a móviles.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `pushDeliveryId` | texto | Sí | ID único del intento. |
| `notificationId` | texto | Sí | Aviso que se intenta enviar. |
| `deviceId` | texto | Sí | Dispositivo destino. |
| `status` | texto | Sí | `queued`, `sent`, `failed`, `expired`, `invalid_subscription`. |
| `attempts` | número | Sí | Número de intentos. |
| `lastError` | texto | No | Error técnico sin secretos. |
| `queuedAt` | fecha-hora | Sí | Entrada en cola. |
| `sentAt` | fecha-hora | No | Envío correcto. |
| `updatedAt` | fecha-hora | Sí | Última actualización. |

### 2.10 `ajustes_familia`

Preferencias que actualmente se guardan en `localStorage`.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `familyId` | texto | Sí | Familia. |
| `notificationsEnabled` | booleano | Sí | Avisos generales. |
| `eventRemindersEnabled` | booleano | Sí | Recordatorios de eventos. |
| `documentRemindersEnabled` | booleano | Sí | Recordatorios de vencimientos. |
| `syncEnabled` | booleano | Sí | Sincronización con Sheets. |
| `defaultCalendarView` | texto | Sí | `month` o `week`. |
| `timeFormat` | texto | Sí | `12` o `24`. |
| `appearance` | texto | Sí | `light`, `dark` o `auto`. |
| `familyName` | texto | Sí | Nombre visible. |
| `familyAvatar` | texto | No | Emoji o símbolo. |
| `pinEnabled` | booleano | Sí | Si el bloqueo local está activo. |
| `updatedAt` | fecha-hora | Sí | Último cambio. |

El PIN no debe guardarse en texto plano en Google Sheets. Para una primera versión, mantener el bloqueo como local; para seguridad real, usar autenticación de usuario y hash en backend.

### 2.11 `sincronizaciones`

Control de cambios entre la app local y Google Sheets.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `syncId` | texto | Sí | ID único. |
| `familyId` | texto | Sí | Familia. |
| `deviceId` | texto | No | Dispositivo que sincroniza. |
| `entityType` | texto | Sí | events, recipes, documents, members, etc. |
| `entityId` | texto | Sí | Registro afectado. |
| `operation` | texto | Sí | `create`, `update`, `delete`. |
| `localUpdatedAt` | fecha-hora | Sí | Momento local. |
| `serverUpdatedAt` | fecha-hora | No | Momento aceptado por backend. |
| `status` | texto | Sí | `pending`, `synced`, `conflict`, `error`. |
| `errorMessage` | texto | No | Motivo del error. |
| `createdAt` | fecha-hora | Sí | Alta de la operación. |
| `updatedAt` | fecha-hora | Sí | Última actualización. |

## 3. Índices y búsquedas recomendadas

Google Sheets no tiene índices como una base SQL. Para que Apps Script sea rápido:

- Mantener los registros ordenados por `updatedAt`.
- Crear una hoja `config` con los nombres de pestañas y versión de esquema.
- Usar los campos ID como primera columna.
- No buscar por nombre si existe un ID.
- Leer rangos completos una vez y trabajar en memoria dentro de cada petición.
- Para consultas frecuentes, crear hojas auxiliares:
  - `idx_eventos_fecha`: `familyId`, `eventDate`, `eventId`.
  - `idx_documentos_vencimiento`: `familyId`, `expiryDate`, `documentId`.
  - `idx_push_activos`: `familyId`, `deviceId`, `active`.

## 4. Relaciones principales

```text
familias 1 ─── N miembros
familias 1 ─── N eventos
familias 1 ─── N recetas
familias 1 ─── N documentos
familias 1 ─── N notificaciones
notificaciones 1 ─── N notificaciones_lecturas
notificaciones 1 ─── N envios_push
dispositivos_push 1 ─── N envios_push
familias 1 ─── 1 ajustes_familia
familias 1 ─── N sincronizaciones
```

## 5. Endpoints de Apps Script que habrá que crear

Todas las peticiones deben comprobar `familyId`, validar campos y devolver JSON con `{ ok, data, error }`.

- `GET ?action=bootstrap&familyId=...`: devuelve familia, miembros, ajustes y cambios recientes.
- `GET ?action=events&from=...&to=...`: eventos del rango de fechas.
- `POST ?action=eventUpsert`: crea o actualiza un evento.
- `POST ?action=eventDelete`: borrado lógico de evento.
- `GET ?action=recipes`: lista y búsqueda de recetas.
- `POST ?action=recipeUpsert`: guarda metadatos de receta.
- `GET ?action=documents`: lista documentos y próximos vencimientos.
- `POST ?action=documentCreate`: registra metadatos después de subir el archivo a Drive.
- `POST ?action=documentDelete`: borrado lógico y, si corresponde, archivo de Drive.
- `GET ?action=members`: lista miembros.
- `POST ?action=memberUpsert`: crea o actualiza un miembro.
- `GET ?action=settings`: devuelve ajustes familiares.
- `POST ?action=settingsUpdate`: actualiza preferencias.
- `GET ?action=notifications`: devuelve avisos y lecturas del destinatario.
- `POST ?action=notificationRead`: marca un aviso leído o no leído.
- `POST ?action=pushSubscribe`: registra o renueva `endpoint`, `p256dh` y `auth`.
- `POST ?action=pushUnsubscribe`: desactiva un dispositivo.
- `POST ?action=pushTest`: envía un aviso de prueba al dispositivo autenticado.

## 6. Flujo de avisos móviles

1. La app solicita permiso de notificaciones.
2. El service worker crea una suscripción Web Push.
3. La app envía la suscripción a `pushSubscribe`.
4. Apps Script crea una fila en `notificaciones` cuando ocurre un evento, vencimiento o aviso del sistema.
5. Un proceso programado revisa `notificaciones` y crea envíos en `envios_push`.
6. Un servicio Web Push envía el mensaje usando las claves VAPID.
7. El service worker recibe `push` y muestra la notificación del sistema.
8. Al pulsar el aviso, `notificationclick` abre la app y el backend puede marcarlo como entregado.
9. Si el endpoint devuelve 404 o 410, marcar `dispositivos_push.active = FALSE`.

### Importante sobre Google Apps Script

Google Sheets puede ser la base de datos y Apps Script puede ser la API, pero el envío Web Push necesita una librería o servicio que firme mensajes VAPID. No se deben guardar claves privadas en el navegador ni en una hoja visible. Opciones:

- Apps Script con una implementación Web Push compatible y claves guardadas en `PropertiesService` protegido.
- Un pequeño servicio Node/Cloud Run/Cloud Functions para el envío Push, usando Sheets como almacenamiento.
- Firebase Cloud Messaging si se prefiere delegar la entrega móvil.

Para la primera versión recomiendo: Sheets + Apps Script para datos y un servicio de envío Push separado, porque separa secretos y permite reintentos fiables.

## 7. Automatismos programados

Crear triggers temporales de Apps Script:

- Cada 5 minutos: detectar eventos próximos y crear notificaciones.
- Cada hora: detectar documentos que vencen en 90, 30, 7 y 1 días.
- Cada 5 minutos: procesar `envios_push` pendientes.
- Cada noche: limpiar notificaciones caducadas y compactar logs.
- Cada día: recalcular `storageUsedBytes` por familia.

Evitar duplicados usando una clave lógica, por ejemplo:

```text
familyId + entityType + entityId + notificationType + scheduledDate
```

## 8. Orden recomendado para construirlo

1. Crear las pestañas y encabezados de las hojas.
2. Crear `familias`, una familia inicial y los cuatro miembros actuales.
3. Migrar eventos actuales a `eventos` con sus fechas.
4. Crear endpoints de lectura: `bootstrap`, eventos, recetas, documentos y miembros.
5. Sustituir lecturas locales por sincronización inicial controlada.
6. Crear endpoints de escritura y sincronización offline.
7. Subir recetas y documentos a Drive; dejar Sheets para metadatos.
8. Crear notificaciones dentro de la app.
9. Registrar dispositivos Push.
10. Activar triggers y probar avisos en Android, iOS y escritorio.
11. Añadir conflictos, reintentos y borrado lógico.

## 9. Datos que hay que preparar ahora en Google Sheets

Crear un libro con estas pestañas y encabezados:

```text
familias
miembros
eventos
recetas
documentos
notificaciones
notificaciones_lecturas
dispositivos_push
envios_push
ajustes_familia
sincronizaciones
config
```

No crear todavía hojas separadas por vista. Inicio, Agenda y Próximos deben leer la misma tabla `eventos`; Recetas debe leer `recetas`; Documentoteca debe leer `documentos`; y todos los nombres y colores deben venir de `miembros`.
