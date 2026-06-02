# Fonda Angular Firebase Auth

Proyecto web para vender a una fonda de comida.

Incluye:

- Angular como frontend.
- Firebase Authentication con correo y contraseña.
- Sesiones con cookies `httpOnly`.
- Express + Firebase Admin como backend.
- Pedidos guardados en Cloud Firestore.
- Panel de administrador para ver pedidos y cambiar estados.

## Arquitectura

```txt
Angular
  ├─ Pantalla principal
  ├─ Login
  ├─ Registro
  └─ Panel administrador

Express
  ├─ Crea cookie segura con Firebase Admin
  ├─ Valida sesiones
  ├─ Guarda pedidos
  └─ Protege panel y endpoints privados

Firebase
  ├─ Authentication
  └─ Cloud Firestore
```

## 1. Crear proyecto en Firebase Console

1. Crea un proyecto.
2. Activa **Authentication**.
3. En **Sign-in method**, activa **Email/Password**.
4. Activa **Cloud Firestore**.
5. Crea una app Web.
6. Copia la configuración web en:

```txt
src/environments/environment.ts
```

## 2. Crear credencial de servidor

En Firebase Console:

```txt
Project settings > Service accounts > Generate new private key
```

Guarda el archivo descargado como:

```txt
serviceAccountKey.json
```

en la raíz del proyecto.

No subas ese archivo a GitHub.

## 3. Configurar .env

Copia:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
copy .env.example .env
```

Edita:

```env
PORT=3000
BUSINESS_NAME=Fonda Doña Mary
ADMIN_EMAILS=tu_correo@correo.com
NODE_ENV=development
```

El correo que pongas en `ADMIN_EMAILS` podrá entrar a `/panel`.

## 4. Instalar dependencias

```bash
npm install
```

## 5. Ejecutar en desarrollo

```bash
npm start
```

Esto levanta:

- Angular en `http://localhost:4200`
- API Express en `http://localhost:3000`

Angular usa `proxy.conf.json` para conectar con `/api`.

## 6. Compilar y ejecutar como producción local

```bash
npm run serve:prod
```

Abre:

```txt
http://localhost:3000
```

## 7. Rutas

```txt
/           Página principal
/login      Inicio de sesión
/registro   Crear cuenta
/panel      Panel administrador
```

## 8. Flujo de autenticación

1. Angular inicia sesión con Firebase Auth.
2. Firebase entrega un ID token.
3. Angular manda el ID token a `/api/sessionLogin`.
4. Express valida el token con Firebase Admin.
5. Express crea una cookie `httpOnly` con `createSessionCookie()`.
6. Angular ya no guarda el token; la cookie queda protegida por el navegador.
7. Express valida la cookie en cada endpoint privado con `verifySessionCookie()`.

## 9. Personalización para vender

Puedes cambiar:

- Menú y precios en `src/app/pages/home/home.component.ts`.
- Colores en `src/styles.css`.
- Nombre del negocio en `.env`.
- Horario y textos en `src/app/pages/home/home.component.html`.
- Correo administrador en `.env`.

## 10. Recomendaciones para producción

- Usa HTTPS.
- Cambia `NODE_ENV=production`.
- No subas `.env` ni `serviceAccountKey.json`.
- Usa un dominio propio.
- Agrega políticas de privacidad si guardas datos de clientes.
- Agrega WhatsApp, Mercado Pago o impresión de ticket si el cliente lo pide.
