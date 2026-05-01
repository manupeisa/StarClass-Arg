# StarClass Argentina

Proyecto web hecho con Next.js.

## Como ver la pagina

No abrir con Live Server en el puerto 5500. Eso solo muestra la carpeta del proyecto.

Para ejecutar la web:

1. Abrir una terminal en esta carpeta.
2. Ejecutar:

```bash
npm run build
npx next start -p 3000 -H 0.0.0.0
```

Tambien se puede usar:

```bash
iniciar-starclass.bat
```

Despues abrir:

- En esta PC: http://127.0.0.1:3000
- En otro dispositivo de la misma red: http://192.168.0.138:3000

## Donde editar datos

Los datos de calendario, resultados, ranking, pagos de Dues, Instagram y fotos estan en:

```text
data/starclass.json
```

## Panel administrador

Abrir:

```text
http://127.0.0.1:3000/admin
```

Usuario inicial:

```text
admin
```

Contraseña inicial:

```text
starclass2026
```

Para cambiar esos datos, crear un archivo `.env.local` con:

```text
ADMIN_USER=tu_usuario
ADMIN_PASSWORD=tu_contrasenia
```

Desde el panel se puede:

- Modificar campeonatos y tablas de posiciones.
- Subir fotos. En local van a `public/uploads`; en Vercel van a Cloudflare R2 si estan configuradas las variables.
- Editar fotos existentes.
- Importar un Excel de pagos Dues.
- Editar el calendario.

## Deploy en Vercel con Cloudflare R2

Vercel no debe subir las carpetas pesadas de fotos al deploy. El proyecto ya incluye `.vercelignore` y `next.config.mjs` para excluir:

```text
Imagenes
San isidro labrador
public/uploads
```

Para que el admin pueda subir fotos en produccion, crear un bucket R2 en Cloudflare y configurar estas variables en Vercel:

```text
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key_id
R2_SECRET_ACCESS_KEY=tu_secret_access_key
R2_BUCKET_NAME=nombre_del_bucket
R2_ENDPOINT=https://tu_account_id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://tu-dominio-publico-del-bucket
ADMIN_USER=tu_usuario
ADMIN_PASSWORD=tu_contrasenia
```

`R2_PUBLIC_URL` tiene que ser una URL publica que sirva archivos del bucket, por ejemplo un dominio conectado a R2.

Importante: las fotos viejas que hoy estan en `Imagenes`, `San isidro labrador` o `public/uploads` hay que subirlas al bucket R2 y reemplazar sus rutas en `data/starclass.json` por URLs publicas de R2. Las fotos nuevas subidas desde el admin ya se guardan automaticamente en R2.
