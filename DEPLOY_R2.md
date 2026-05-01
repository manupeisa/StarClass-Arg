# Migración a Cloudflare R2 — Instrucciones

Este documento explica cómo ejecutar la migración de `data/starclass.json` a Cloudflare R2 usando el workflow de GitHub Actions que agregué y cómo configurar las variables en Vercel para que la app use R2 en producción.

Variables/Secrets requeridos (GitHub repo secrets y Vercel env vars):

- `R2_ACCOUNT_ID` — ID de cuenta Cloudflare (opcional para endpoint por defecto)
- `R2_ACCESS_KEY_ID` — Access Key ID
- `R2_SECRET_ACCESS_KEY` — Secret Access Key
- `R2_BUCKET_NAME` — Nombre del bucket (o `R2_BUCKET`)
- `R2_PUBLIC_URL` — URL pública base del bucket (ej: `https://<bucket>.<account>.r2.cloudflarestorage.com`)
- `R2_ENDPOINT` — (opcional) endpoint explícito si lo usas

Pasos — ejecutar desde GitHub (recomendado):

1. En tu repositorio en GitHub → Settings → Secrets → Actions, añade los secretos listados arriba con sus valores.
2. Ve a la pestaña Actions → "Migrate starclass.json to R2" → "Run workflow". El workflow ejecutará `node scripts/migrate-to-r2.mjs` y subirá `data/starclass.json` a la clave `data/starclass.json` en el bucket.
3. Revisa la salida del job para confirmar la URL devuelta.

Pasos — configurar Vercel (para producción runtime):

1. En Vercel dashboard → Project Settings → Environment Variables, añade las mismas variables (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `R2_ENDPOINT` si aplica).
2. Despliega/redeploy el proyecto.
3. Abre la UI de admin, inicia sesión y guarda datos (o sube una imagen) para verificar que `starclass.json` se lee/escribe desde R2 y las imágenes se suben a R2.

Comprobaciones y fallback:

- Si R2 no está configurado, la app seguirá usando `data/starclass.json` en el filesystem local y `public/uploads` para imágenes (comportamiento de fallback).
- El endpoint API `/api/admin/data` usa `lib/starclass-data.js`, que ahora intenta GET/PUT en R2 y cae a FS si falla.

Ejecutar la migración localmente (opcional):

Si prefieres ejecutar la migración desde tu máquina (no recomendado para compartir claves), exporta las variables de entorno y ejecuta:

```powershell
cd /d e:\Pagina de StarClass
node scripts/migrate-to-r2.mjs
```

Notas de seguridad:

- No pegues secretos en chats públicos. Usa GitHub Secrets o Vercel env vars.
- El workflow usa `workflow_dispatch` y requiere que subas los secretos al repo.

Si quieres, puedo:

- Ayudarte a redactar los valores exactos que debes pegar en GitHub/Vercel.
- Ejecutar la migración desde una máquina con acceso a las variables (si me proporcionas acceso al repositorio y permisos Actions).
