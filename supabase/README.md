# Instrucciones para aplicar migraciones a Supabase

Este directorio contiene scripts de migración para la base de datos Supabase.

## Problema actual

Hay errores en la aplicación relacionados con la estructura de las tablas en la base de datos:

1. **Tabla `messages`**: Los errores indican que la columna `messages.sender_id` no existe, aunque en el código estamos tratando de usarla.
2. **Tabla `users`**: Puede haber problemas similares con la estructura de esta tabla.

## Solución

Hemos creado scripts de migración que crean o actualizan las tablas con la estructura correcta:

- `migrations/20250228_fix_users_table.sql`: Crea o actualiza la tabla `users`
- `migrations/20250228_fix_messages_table.sql`: Crea o actualiza la tabla `messages`

## Aplicar las migraciones manualmente

1. Inicia sesión en el panel de administración de Supabase (https://app.supabase.io)
2. Selecciona tu proyecto
3. Ve a la sección "SQL Editor"
4. Copia y pega el contenido de cada archivo de migración
5. Ejecuta los scripts en este orden:
   - Primero `20250228_fix_users_table.sql`
   - Luego `20250228_fix_messages_table.sql`

## Aplicar las migraciones con el script

1. Instala las dependencias necesarias:
   ```
   npm install @supabase/supabase-js
   ```

2. Configura las variables de entorno:
   ```
   export SUPABASE_URL=https://[TU_PROJECT_ID].supabase.co
   export SUPABASE_SERVICE_KEY=[TU_SERVICE_ROLE_KEY]
   ```

3. Ejecuta el script:
   ```
   node apply_migrations.js
   ```

## Estructura de las tablas

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
