# Solución a Errores de Base de Datos

Este documento proporciona instrucciones para resolver los errores relacionados con la estructura de la base de datos en Supabase.

## Problema

La aplicación de chat requiere una estructura específica en las tablas `messages` y `users` de Supabase. Los errores que puedes encontrar están relacionados con columnas faltantes o incorrectas en estas tablas.

## Solución Implementada

Hemos implementado un **adaptador de base de datos** que permite que la aplicación funcione con la estructura actual de las tablas. Este adaptador detecta automáticamente la estructura de la tabla y adapta las consultas según sea necesario.

**¡Ya no necesitas modificar manualmente la base de datos!** La aplicación debería funcionar correctamente con la estructura actual.

## Si Aún Tienes Problemas

Si sigues experimentando problemas, puedes optar por modificar manualmente la estructura de la base de datos siguiendo estos pasos:

### Opción 1: Usar la Consola SQL de Supabase

1. Accede a la [consola de Supabase](https://app.supabase.com/)
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

### Opción 2: Usar los Scripts Proporcionados

En la carpeta `supabase` encontrarás varios scripts que pueden ayudarte a verificar y corregir la estructura de la base de datos:

1. `verify_connection.js` - Verifica la conexión a Supabase
2. `verify_tables.js` - Verifica la estructura de las tablas
3. `fix_messages_table.js` - Genera instrucciones para corregir la tabla `messages`

Para ejecutar estos scripts:

```bash
cd supabase
node verify_connection.js
node verify_tables.js
node fix_messages_table.js
```

## Estructura Esperada de las Tablas

### Tabla `users`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Identificador único del usuario |
| username | TEXT | Nombre de usuario |
| avatar_url | TEXT | URL de la imagen de perfil |
| status | TEXT | Estado del usuario (online/offline) |
| email | TEXT | Correo electrónico del usuario |
| created_at | TIMESTAMP | Fecha de creación del usuario |

### Tabla `messages`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Identificador único del mensaje |
| sender_id | UUID | ID del usuario que envía el mensaje |
| receiver_id | UUID | ID del usuario que recibe el mensaje |
| content | TEXT | Contenido del mensaje |
| attachment_url | TEXT | URL del archivo adjunto |
| attachment_type | TEXT | Tipo de archivo adjunto |
| created_at | TIMESTAMP | Fecha de creación del mensaje |
| read | BOOLEAN | Indica si el mensaje ha sido leído |

## Contacto

Si continúas experimentando problemas, por favor contacta al administrador del sistema.
