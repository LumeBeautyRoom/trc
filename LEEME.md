# LUMÉ Beauty Room — Sitio web

Sitio de 3 pantallas para tu salón: **Inicio**, **Agendar** y **Administrador**
(Agenda · Caja · Reportes · Inventario), con generación de **ticket en PDF**.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Página de inicio (logo, WhatsApp, Instagram y botón **Agendar**). |
| `agendar.html` | Servicios con precios, descripción y selector **+ / −**, carrito flotante y calendario. |
| `admin.html` | Administrador (Agenda, Caja, Reportes, Inventario) protegido con contraseña. |
| `styles.css` | Estilos (tipografía y colores de tu lista de precios). |
| `app.js` | **Aquí editas tus datos** (contacto, contraseña) y el catálogo de servicios. |
| `firebase.js` | Conexión a tu **Firebase**: sincroniza Agenda, Caja, Reportes e Inventario en la nube. |
| `ticket-pdf.js` | Generador del ticket en PDF (funciona sin internet). |
| `logo.png` | Tu logo. Reemplázalo por tu archivo real usando **el mismo nombre**. |

## 1) Configura tus datos (importante)

Abre **`app.js`** y edita el bloque `CONFIG` de hasta arriba:

```js
whatsapp: "5210000000000",   // tu WhatsApp con lada, sin +, espacios ni guiones
instagram: "lume.beautyroom", // tu usuario de Instagram, sin la @
adminPassword: "lume2026",    // cambia esta contraseña
businessName: "LUMÉ Beauty Room",
businessPhone: "0000000000",  // aparece en el ticket
businessAddress: "",          // opcional, aparece en el ticket
```

- **WhatsApp:** ejemplo México → `52` + 10 dígitos = `5215512345678`.
- **Contraseña del administrador:** por defecto es `lume2026`. Cámbiala.

## 2) Cambia el logo

Sustituye `logo.png` por tu logo real, conservando el nombre `logo.png`.

## 3) Cómo usarlo

- Para probarlo, abre `index.html`. Para que funcione **desde cualquier celular**
  y de forma estable, publícalo en internet (por ejemplo arrastrando la carpeta a
  **netlify.com/drop**, o con GitHub Pages / tu hosting). Es un sitio estático, no
  necesita servidor.

## 4) Firebase — datos en la nube en tiempo real ✅

Ya está conectado tu proyecto de Firebase (`lume-d271c`). Las **citas, cobros,
gastos e inventario se guardan en la nube (Firestore)** y se **sincronizan en
tiempo real** entre todos los teléfonos y computadoras que abran el sitio.
Arriba a la derecha del Administrador verás un indicador: **● En línea** (Firebase)
o **● Local** (sin internet). Si en algún momento no hay conexión, el sitio sigue
funcionando en modo local y se resincroniza al volver el internet.

**Para que funcione debes hacer 2 cosas una sola vez en la consola de Firebase
(console.firebase.google.com → proyecto lume-d271c):**

1. **Crear la base de datos:** menú *Build → Firestore Database → Create database*.
   Elige una ubicación y déjalo en modo de prueba (*test mode*) por ahora.

2. **Reglas de seguridad:** en *Firestore Database → Rules* pega esto y publica:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

> ⚠️ **Importante sobre seguridad:** estas reglas dejan la base **abierta** (cualquiera
> con la dirección podría leer/escribir). Es lo más rápido para empezar. Para
> proteger de verdad la Caja y los Reportes se necesita **Firebase Authentication**
> (login real). Si quieres, te lo agrego. La `apiKey` que aparece en `firebase.js`
> **no es secreta** en apps web de Firebase; la seguridad se controla con las reglas.

Si aún no configuras Firestore, el sitio funciona igual pero en **modo local**
(cada dispositivo guarda su propia información).

## 5) Flujo de uso

1. La clienta (o tú) entra a **Agendar**, elige servicios con **+ / −**, y en el
   carrito flotante captura **nombre y teléfono (obligatorios)**, notas, **día y hora**,
   y presiona **Agendar**.
2. La cita aparece en **Administrador → Agenda** y en **Caja → Citas por cobrar**.
3. En **Caja** presionas **Cobrar**: eliges **efectivo / transferencia / tarjeta**,
   puedes **modificar el total** (para agregar costo extra o descuento) y presionas
   **Cobrar e imprimir ticket**.
4. Se genera el **ticket en PDF**: **Descargar PDF** o **Enviar por WhatsApp**
   (descarga el PDF y abre el chat de la clienta para que lo adjuntes 📎).
5. **Reportes** muestra cuántas personas agendan por día y el flujo de dinero.
6. **Inventario** lleva tus productos y te avisa cuando están bajo mínimo.

---
Hecho para LUMÉ Beauty Room ✨
