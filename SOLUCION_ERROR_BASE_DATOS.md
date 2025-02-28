# Solución para el error de base de datos

## Problema

Estás experimentando errores relacionados con la estructura de la base de datos en Supabase. Los errores específicos son:

1. `Error loading messages for conversations: column messages.sender_id does not exist`
2. `Error sending message: Could not find the 'read' column of 'messages' in the schema cache`

Estos errores indican que la estructura de las tablas en la base de datos no coincide con lo que espera la aplicación.

## Solución

Hemos preparado scripts de migración para corregir la estructura de la base de datos. Sigue estos pasos:

### Opción 1: Aplicar las migraciones manualmente (recomendado)

1. Inicia sesión en el panel de administración de Supabase (https://app.supabase.io)
2. Selecciona tu proyecto (ID: kwfdjdhovhnhuptjeuxl)
3. Ve a la sección "SQL Editor"
4. Crea una nueva consulta
5. Copia y pega el contenido del archivo `supabase/migrations/20250228_fix_users_table.sql`
6. Ejecuta el script
7. Crea otra consulta nueva
8. Copia y pega el contenido del archivo `supabase/migrations/20250228_fix_messages_table.sql`
9. Ejecuta el script

### Opción 2: Aplicar las migraciones con el script

1. Abre una terminal
2. Navega hasta la carpeta del proyecto
3. Instala las dependencias necesarias:
   ```
   npm install @supabase/supabase-js
   ```
4. Configura las variables de entorno:
   ```
   # En Windows (PowerShell)
   $env:SUPABASE_URL = "https://kwfdjdhovhnhuptjeuxl.supabase.co"
   $env:SUPABASE_SERVICE_KEY = "tu-service-role-key"
   
   # En Windows (CMD)
   set SUPABASE_URL=https://kwfdjdhovhnhuptjeuxl.supabase.co
   set SUPABASE_SERVICE_KEY=tu-service-role-key
   ```
5. Ejecuta el script:
   ```
   node supabase/apply_migrations.js
   ```

## Después de aplicar las migraciones

1. Reinicia la aplicación:
   ```
   npm run dev
   ```
2. La aplicación debería funcionar correctamente ahora, permitiéndote enviar y recibir mensajes.

## Estructura de las tablas

Para referencia, estas son las estructuras de tabla que la aplicación espera:

### Tabla `users`

- `id`: UUID (clave primaria)
- `username`: TEXT
- `avatar_url`: TEXT (opcional)
- `status`: TEXT ('online', 'offline', 'away')
- `last_seen`: TIMESTAMP WITH TIME ZONE
- `email`: TEXT (único)
- `created_at`: TIMESTAMP WITH TIME ZONE

### Tabla `messages`

- `id`: UUID (clave primaria)
- `sender_id`: UUID (clave foránea a users.id)
- `receiver_id`: UUID (clave foránea a users.id)
- `content`: TEXT
- `attachment_url`: TEXT (opcional)
- `attachment_type`: TEXT (opcional)
- `created_at`: TIMESTAMP WITH TIME ZONE
- `read`: BOOLEAN

## Información adicional

Para más detalles, consulta el archivo `supabase/README.md`.
