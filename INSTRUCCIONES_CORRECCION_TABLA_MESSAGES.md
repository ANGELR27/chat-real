# Instrucciones para corregir la estructura de la tabla Messages

## Problema detectado

La aplicación está mostrando errores porque la tabla `messages` no tiene la estructura correcta. Actualmente tiene las siguientes columnas:
- `id`
- `content`
- `sender`
- `created_at`
- `is_image`
- `conversation_id`

Pero necesita tener:
- `id`
- `sender_id` (en lugar de `sender`)
- `receiver_id` (en lugar de `conversation_id`)
- `content`
- `attachment_url` (opcional)
- `attachment_type` (opcional)
- `created_at`
- `read`

## Solución 1: Usar el adaptador de base de datos (ya implementado)

Ya hemos implementado un adaptador de base de datos que permite que la aplicación funcione con la estructura actual de la tabla. Este adaptador detecta automáticamente la estructura y adapta las consultas según sea necesario.

**Ventajas:**
- No requiere modificar la base de datos
- Es compatible con ambas estructuras
- Funciona inmediatamente

**Desventajas:**
- Es una solución temporal
- Puede afectar ligeramente el rendimiento

## Solución 2: Modificar la estructura de la tabla (recomendado)

Para una solución permanente, es mejor modificar la estructura de la tabla. Como no podemos usar la función `exec_sql` en tu plan de Supabase, debes seguir estos pasos manualmente:

1. Accede a la consola de Supabase: https://app.supabase.com/
2. Selecciona tu proyecto
3. Ve a "SQL Editor" en el menú lateral
4. Crea un nuevo script y pega el siguiente código SQL:

```sql
-- Ejecutar este script en la consola SQL de Supabase

-- 1. Crear una nueva tabla con la estructura correcta
CREATE TABLE messages_new (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- 2. Migrar datos de la tabla antigua a la nueva
INSERT INTO messages_new (id, sender_id, receiver_id, content, created_at, read)
SELECT 
  id, 
  sender::uuid as sender_id, 
  conversation_id::uuid as receiver_id, 
  content, 
  created_at, 
  false as read
FROM messages;

-- 3. Crear índices en la nueva tabla
CREATE INDEX idx_messages_new_sender_id ON messages_new(sender_id);
CREATE INDEX idx_messages_new_receiver_id ON messages_new(receiver_id);
CREATE INDEX idx_messages_new_created_at ON messages_new(created_at);

-- 4. Renombrar tablas
ALTER TABLE messages RENAME TO messages_old;
ALTER TABLE messages_new RENAME TO messages;

-- 5. Opcional: eliminar la tabla antigua después de verificar que todo funciona
-- DROP TABLE messages_old;
```

5. Ejecuta el script y verifica que no haya errores

## Verificación

Para verificar que la estructura de la tabla es correcta, puedes ejecutar el siguiente script:

```bash
cd supabase
node verify_tables.js
```

Deberías ver que la tabla `messages` ahora tiene las columnas correctas.

## Solución de problemas

Si encuentras algún error al ejecutar el script SQL:

1. Asegúrate de tener permisos de administrador en la base de datos
2. Verifica que no haya restricciones de clave foránea que impidan la migración
3. Si el error persiste, puedes seguir usando el adaptador de base de datos mientras resuelves el problema

## Contacto

Si necesitas ayuda adicional, no dudes en contactarnos.
