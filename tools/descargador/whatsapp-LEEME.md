# Aviso por WhatsApp al terminar una descarga

La app puede mandarte un WhatsApp cuando termina una descarga. Se hace con la **API oficial de
WhatsApp (Cloud API de Meta)**, que es gratis para el número de prueba y **no necesita cuenta de
empresa**. No se usa nada no oficial (esos inventos pueden costarte el número).

Lo normal es que el mensaje llegue como **plantilla aprobada** (es lo único que Meta entrega
siempre). El texto libre solo llega si le has escrito al bot en las últimas 24 h.

---

## 1. Crear la app en Meta (una sola vez, 10 minutos)

1. Entra en <https://developers.facebook.com/apps> con tu cuenta de Facebook y pulsa
   **Crear app**.
2. Tipo de app: **Empresa** (Business). Ponle un nombre, por ejemplo `Descargas atnojs`.
   Cuando pida verificar la empresa, elige **Verificar más tarde**.
3. En el panel de la app busca el producto **WhatsApp** y pulsa **Configurar**.
4. En **WhatsApp → API Setup** verás:
   - **Phone number ID**: un número largo. Ese es el `phone_number_id`.
   - Un **número de prueba** (`+1 555…`) que es el que "envía". Ese número no puede ser el tuyo:
     **el emisor es el de prueba y tú eres el destinatario**.
5. En esa misma pantalla, en **"To"**, añade **tu número** y pulsa **Enviar código**. Te llegará
   un código de 5 dígitos **por WhatsApp**: ponlo y tu número queda verificado como destinatario.
6. Genera el **token permanente**:
   - En el panel de la app: **Configuración de la empresa → Usuarios del sistema**.
   - **Añadir** → nombre cualquiera → rol **Administrador**.
   - **Asignar activos** → apps → tu app → permiso total.
   - Con el usuario creado: **Generar token** → app: la tuya → caducidad: **Nunca** →
     permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
   - Copia el token (empieza por `EAA...`). **Ese botón "Generate access token" de API Setup
     caduca en 24 h; el del usuario del sistema NO caduca.**

## 2. Crear la plantilla del aviso (para que llegue siempre)

1. En <https://business.facebook.com/wa/manage/message-templates/> pulsa **Crear plantilla**.
2. Nombre: `descarga_lista` · Categoría: **Utilidad (Utility)** · Idioma: **Español (es)**.
3. Cuerpo del mensaje con **una variable**, por ejemplo:

   ```
   {{1}}
   ```

   (la app manda ahí el texto: «Descarga lista: título — ya puedes bajarla desde la web»).
4. Envía a revisión. Suele aprobarse en minutos (a veces un par de horas).
5. En la app, en el panel **Avisos por WhatsApp**, pon la plantilla `descarga_lista`.

> Mientras la plantilla no esté aprobada puedes probar con **texto libre**, pero solo llegará si
> antes le has escrito algo al número de prueba desde tu móvil (abre la ventana de 24 h).

## 3. Rellenar el panel de la app

En <https://atnojs.es/apps/descargas/> → **Avisos por WhatsApp**:

| Campo | Qué poner |
|---|---|
| Phone number ID | el de **API Setup** |
| Token de Meta | el token **permanente** del usuario del sistema |
| Tu número | con prefijo y sin `+` ni espacios: `34600111222` |
| Plantilla | `descarga_lista` (si ya está aprobada; si no, déjalo vacío) |
| Avisos activados | marcado |

Pulsa **Guardar** y luego **Probar**. Si todo va bien, te llega un WhatsApp de prueba y el estado
pone «Prueba enviada».

## 4. Si algo falla

El panel y el log dicen el motivo. Los errores típicos:

- **HTTP 401** → el token está caducado o mal copiado. Genera el permanente del usuario del sistema.
- **Error 131047** → ha pasado más de 24 h desde tu último mensaje al bot y no hay plantilla: crea
  o espera la plantilla.
- **Error 133010 / número no verificado** → no has añadido tu número como destinatario en API Setup.
- El log completo está en el servidor en `data/whatsapp.log` (dentro de la app).

> La configuración se guarda en `data/whatsapp.json` **en el servidor** y no está en git: el token
> no viaja al repositorio. Si algún día sospechas que se ha filtrado, borra el token en Meta y
> genera otro.
