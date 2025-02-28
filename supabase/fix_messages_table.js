import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://kwfdjdhovhnhuptjeuxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZmRqZGhvdmhuaHVwdGpldXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc2ODIyNCwiZXhwIjoyMDU1MzQ0MjI0fQ.vtpUB16Ajo4e72hCG_qKyehCryDC5nl87Zv7iKmG5Cs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMessagesTable() {
  try {
    console.log('Obteniendo datos de la tabla messages...');
    
    // Obtener todos los mensajes existentes
    const { data: existingMessages, error: getError } = await supabase
      .from('messages')
      .select('*');
    
    if (getError) {
      console.error('Error al obtener mensajes:', getError);
      return false;
    }
    
    console.log(`Se encontraron ${existingMessages.length} mensajes en la tabla`);
    
    // Crear una nueva tabla con la estructura correcta
    console.log('Creando tabla messages_new con la estructura correcta...');
    
    // Intentamos usar la API de Supabase para crear una nueva tabla
    // Primero, eliminamos la tabla si ya existe
    const { error: dropError } = await supabase
      .from('messages_new')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (dropError && !dropError.message.includes('does not exist')) {
      console.error('Error al eliminar tabla messages_new:', dropError);
    }
    
    // Ahora intentamos crear la tabla messages_new
    console.log('Insertando datos en la nueva tabla...');
    
    // Procesar los mensajes existentes y migrarlos a la nueva estructura
    const newMessages = existingMessages.map(msg => {
      return {
        id: msg.id,
        sender_id: msg.sender, // Convertir sender a sender_id
        receiver_id: msg.conversation_id, // Usar conversation_id como receiver_id temporalmente
        content: msg.content,
        created_at: msg.created_at,
        read: false // Valor predeterminado
      };
    });
    
    // Crear un archivo SQL para que el usuario pueda ejecutarlo manualmente en la consola de Supabase
    console.log('Generando archivo SQL para migración manual...');
    
    let sqlContent = `
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
`;
    
    // Imprimir instrucciones para el usuario
    console.log('\n=== INSTRUCCIONES PARA CORREGIR LA TABLA MESSAGES ===');
    console.log('1. Accede a la consola de Supabase: https://app.supabase.com/');
    console.log('2. Selecciona tu proyecto');
    console.log('3. Ve a "SQL Editor" en el menú lateral');
    console.log('4. Crea un nuevo script y pega el siguiente código SQL:');
    console.log('\n' + sqlContent);
    console.log('\n5. Ejecuta el script y verifica que no haya errores');
    console.log('=== FIN DE INSTRUCCIONES ===\n');
    
    // Intentar crear una columna temporal en la tabla messages para verificar si tenemos permisos
    console.log('Intentando añadir una columna temporal para verificar permisos...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID;'
    });
    
    if (alterError) {
      console.error('No se pudo modificar la tabla directamente:', alterError);
      console.log('Por favor, sigue las instrucciones anteriores para corregir la tabla manualmente.');
    } else {
      console.log('¡Éxito! Se pudo modificar la tabla. Intentando aplicar la migración completa...');
      
      // Si podemos modificar la tabla, intentamos ejecutar la migración completa
      const { error: migrationError } = await supabase.rpc('exec_sql', {
        sql: sqlContent
      });
      
      if (migrationError) {
        console.error('Error al aplicar la migración completa:', migrationError);
        console.log('Por favor, sigue las instrucciones anteriores para corregir la tabla manualmente.');
      } else {
        console.log('¡Migración aplicada con éxito!');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error inesperado:', error);
    return false;
  }
}

fixMessagesTable()
  .then(success => {
    if (success) {
      console.log('\nProceso completado');
    } else {
      console.error('\nHubo errores durante el proceso');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error en la ejecución:', error);
    process.exit(1);
  });
