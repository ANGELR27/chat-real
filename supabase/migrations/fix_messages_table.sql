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
