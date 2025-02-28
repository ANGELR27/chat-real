import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://kwfdjdhovhnhuptjeuxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZmRqZGhvdmhuaHVwdGpldXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc2ODIyNCwiZXhwIjoyMDU1MzQ0MjI0fQ.vtpUB16Ajo4e72hCG_qKyehCryDC5nl87Zv7iKmG5Cs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Verificando tablas existentes...');
    
    // Verificar si las tablas existen
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Error al verificar tablas:', tablesError);
      return false;
    }
    
    const existingTables = tablesData.map(t => t.table_name);
    console.log('Tablas existentes:', existingTables);
    
    // Crear tabla de usuarios si no existe
    if (!existingTables.includes('users')) {
      console.log('Creando tabla users...');
      
      const { error: createUsersError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE users (
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
        console.log('Tabla users creada con éxito');
      }
    } else {
      console.log('La tabla users ya existe, verificando columnas...');
      
      // Verificar columnas de la tabla users
      const { data: usersColumns, error: usersColumnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'users');
      
      if (usersColumnsError) {
        console.error('Error al verificar columnas de users:', usersColumnsError);
      } else {
        const existingColumns = usersColumns.map(c => c.column_name);
        console.log('Columnas existentes en users:', existingColumns);
        
        // Añadir columnas faltantes
        const requiredColumns = ['id', 'username', 'avatar_url', 'status', 'last_seen', 'email', 'created_at'];
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log('Añadiendo columnas faltantes a users:', missingColumns);
          
          for (const column of missingColumns) {
            let columnDef = '';
            
            switch (column) {
              case 'id':
                columnDef = 'id UUID PRIMARY KEY';
                break;
              case 'username':
                columnDef = 'username TEXT NOT NULL';
                break;
              case 'avatar_url':
                columnDef = 'avatar_url TEXT';
                break;
              case 'status':
                columnDef = 'status TEXT DEFAULT \'offline\'';
                break;
              case 'last_seen':
                columnDef = 'last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
                break;
              case 'email':
                columnDef = 'email TEXT UNIQUE';
                break;
              case 'created_at':
                columnDef = 'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
                break;
            }
            
            if (columnDef) {
              const { error: addColumnError } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS ${columnDef};`
              });
              
              if (addColumnError) {
                console.error(`Error al añadir columna ${column} a users:`, addColumnError);
              } else {
                console.log(`Columna ${column} añadida a users con éxito`);
              }
            }
          }
        }
      }
    }
    
    // Crear tabla de mensajes si no existe
    if (!existingTables.includes('messages')) {
      console.log('Creando tabla messages...');
      
      const { error: createMessagesError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE messages (
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
        console.log('Tabla messages creada con éxito');
      }
    } else {
      console.log('La tabla messages ya existe, verificando columnas...');
      
      // Verificar columnas de la tabla messages
      const { data: messagesColumns, error: messagesColumnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'messages');
      
      if (messagesColumnsError) {
        console.error('Error al verificar columnas de messages:', messagesColumnsError);
      } else {
        const existingColumns = messagesColumns.map(c => c.column_name);
        console.log('Columnas existentes en messages:', existingColumns);
        
        // Añadir columnas faltantes
        const requiredColumns = ['id', 'sender_id', 'receiver_id', 'content', 'attachment_url', 'attachment_type', 'created_at', 'read'];
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log('Añadiendo columnas faltantes a messages:', missingColumns);
          
          for (const column of missingColumns) {
            let columnDef = '';
            
            switch (column) {
              case 'id':
                columnDef = 'id UUID PRIMARY KEY';
                break;
              case 'sender_id':
                columnDef = 'sender_id UUID NOT NULL';
                break;
              case 'receiver_id':
                columnDef = 'receiver_id UUID NOT NULL';
                break;
              case 'content':
                columnDef = 'content TEXT NOT NULL';
                break;
              case 'attachment_url':
                columnDef = 'attachment_url TEXT';
                break;
              case 'attachment_type':
                columnDef = 'attachment_type TEXT';
                break;
              case 'created_at':
                columnDef = 'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
                break;
              case 'read':
                columnDef = 'read BOOLEAN DEFAULT FALSE';
                break;
            }
            
            if (columnDef) {
              const { error: addColumnError } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE messages ADD COLUMN IF NOT EXISTS ${columnDef};`
              });
              
              if (addColumnError) {
                console.error(`Error al añadir columna ${column} a messages:`, addColumnError);
              } else {
                console.log(`Columna ${column} añadida a messages con éxito`);
              }
            }
          }
        }
      }
    }
    
    console.log('Proceso de creación/verificación de tablas completado');
    return true;
  } catch (error) {
    console.error('Error inesperado:', error);
    return false;
  }
}

createTables()
  .then(success => {
    if (success) {
      console.log('Tablas creadas o verificadas con éxito');
    } else {
      console.error('Hubo errores durante el proceso');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error en la ejecución:', error);
    process.exit(1);
  });
