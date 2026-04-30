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
- Subir fotos a `public/uploads`.
- Editar fotos existentes.
- Importar un Excel de pagos Dues.
- Editar el calendario.
