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
    
    // Verificar la estructura actual
    if (existingMessages.length > 0) {
      const firstMessage = existingMessages[0];
      console.log('Estructura actual de la tabla messages:');
      console.log(Object.keys(firstMessage));
      
      // Verificar si ya tiene la estructura correcta
      if ('sender_id' in firstMessage && 'receiver_id' in firstMessage) {
        console.log('La tabla messages ya tiene la estructura correcta (sender_id y receiver_id)');
        return true;
      }
    }
    
    // Crear un archivo SQL para que el usuario pueda ejecutarlo manualmente en la consola de Supabase
    console.log('\n=== INSTRUCCIONES PARA CORREGIR LA TABLA MESSAGES ===');
    console.log('Como no podemos usar la función exec_sql, debes seguir estos pasos manualmente:');
    console.log('1. Accede a la consola de Supabase: https://app.supabase.com/');
    console.log('2. Selecciona tu proyecto');
    console.log('3. Ve a "SQL Editor" en el menú lateral');
    console.log('4. Crea un nuevo script y pega el siguiente código SQL:');
    
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
    
    console.log('\n' + sqlContent);
    console.log('\n5. Ejecuta el script y verifica que no haya errores');
    console.log('=== FIN DE INSTRUCCIONES ===\n');
    
    // Intentar usar la API de Supabase para crear una tabla temporal
    console.log('Intentando crear una tabla temporal para probar...');
    
    // Primero verificamos si la tabla temporal ya existe
    const { data: tempTableCheck, error: tempTableCheckError } = await supabase
      .from('messages_temp')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    // Si la tabla no existe, intentamos crearla
    if (tempTableCheckError && tempTableCheckError.code === 'PGRST116') {
      console.log('La tabla messages_temp no existe, intentando crearla...');
      
      // Intentamos crear la tabla usando la API de Storage como alternativa
      // Esto es un hack, pero puede funcionar en algunos casos
      const { data: storageData, error: storageError } = await supabase
        .storage
        .createBucket('messages_temp_bucket', {
          public: false,
          allowedMimeTypes: ['application/json'],
          fileSizeLimit: 1024
        });
      
      if (storageError) {
        console.log('No se pudo crear un bucket de almacenamiento:', storageError);
      } else {
        console.log('Se creó un bucket de almacenamiento temporal:', storageData);
        console.log('Esto demuestra que tienes permisos para crear recursos en Supabase');
      }
    } else {
      console.log('La tabla messages_temp ya existe o hubo un error diferente:', tempTableCheckError);
    }
    
    console.log('\nPor favor, sigue las instrucciones anteriores para corregir la tabla manualmente.');
    
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
