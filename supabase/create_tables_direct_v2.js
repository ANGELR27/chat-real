import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://kwfdjdhovhnhuptjeuxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZmRqZGhvdmhuaHVwdGpldXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc2ODIyNCwiZXhwIjoyMDU1MzQ0MjI0fQ.vtpUB16Ajo4e72hCG_qKyehCryDC5nl87Zv7iKmG5Cs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Intentando crear tabla users...');
    
    // Crear tabla users directamente
    const { error: createUsersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          username TEXT NOT NULL,
          avatar_url TEXT,
          status TEXT DEFAULT 'offline',
          last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          email TEXT UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      `
    });
    
    if (createUsersError) {
      console.error('Error al crear tabla users:', createUsersError);
    } else {
      console.log('Tabla users creada o actualizada con éxito');
    }
    
    console.log('Intentando crear tabla messages...');
    
    // Crear tabla messages directamente
    const { error: createMessagesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY,
          sender_id UUID NOT NULL,
          receiver_id UUID NOT NULL,
          content TEXT NOT NULL,
          attachment_url TEXT,
          attachment_type TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          read BOOLEAN DEFAULT FALSE
        );
        
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      `
    });
    
    if (createMessagesError) {
      console.error('Error al crear tabla messages:', createMessagesError);
    } else {
      console.log('Tabla messages creada o actualizada con éxito');
    }
    
    // Verificar si las tablas se crearon correctamente
    console.log('Verificando tabla users...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.error('Error al verificar tabla users:', usersError);
    } else {
      console.log('Tabla users verificada correctamente');
    }
    
    console.log('Verificando tabla messages...');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (messagesError) {
      console.error('Error al verificar tabla messages:', messagesError);
    } else {
      console.log('Tabla messages verificada correctamente');
    }
    
    console.log('Proceso de creación de tablas completado');
    return true;
  } catch (error) {
    console.error('Error inesperado:', error);
    return false;
  }
}

createTables()
  .then(success => {
    if (success) {
      console.log('Proceso completado');
    } else {
      console.error('Hubo errores durante el proceso');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error en la ejecución:', error);
    process.exit(1);
  });
