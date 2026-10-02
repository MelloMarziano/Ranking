# Ranking · Arturo 2 Hookah

Encuesta de servicio para clientes y panel de ranking de empleados. Hecho con React, Vite y Firebase.

- `/encuesta`: encuesta pública. El cliente elige quién lo atendió y lo califica de 1 a 5 estrellas (una evaluación por dispositivo al día).
- `/admin`: panel privado con el ranking por periodo y la gestión de empleados y preguntas.

## Desarrollo

```bash
npm install
npm run dev
```

La configuración de Firebase se puede sobrescribir con un archivo `.env` (ver `.env.example`).

## Acceso al panel admin

El login usa Firebase Authentication con correo y contraseña. En la pantalla de login se escribe solo el usuario (`arturo`) y la app lo completa como `arturo@arturo2hookah.app` (el dominio se cambia con `VITE_ADMIN_EMAIL_DOMAIN`).

1. En Firebase Console → Authentication → Sign-in method, activa **Correo electrónico/contraseña**.
2. En Authentication → Users, crea el usuario `arturo@arturo2hookah.app` con su contraseña (mínimo 6 caracteres).
3. Publica las reglas de `firestore.rules` (Firestore → Reglas, o `firebase deploy --only firestore:rules`).

La contraseña se cambia desde Authentication → Users. Si cambias el correo del admin, actualiza también la lista de `isAdmin()` en `firestore.rules`.
