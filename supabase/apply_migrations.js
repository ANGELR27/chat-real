import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase (usando directamente las credenciales)
const supabaseUrl = 'https://kwfdjdhovhnhuptjeuxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZmRqZGhvdmhuaHVwdGpldXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc2ODIyNCwiZXhwIjoyMDU1MzQ0MjI0fQ.vtpUB16Ajo4e72hCG_qKyehCryDC5nl87Zv7iKmG5Cs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(filename) {
  try {
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'migrations', filename);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log(`Aplicando migración: ${filename}...`);

    // Ejecutar la migración directamente (sin usar rpc)
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Error al aplicar la migración ${filename}:`, error);
      
      // Intentar ejecutar la consulta SQL directamente
      console.log('Intentando ejecutar SQL directamente...');
      
      // Dividir el SQL en comandos individuales
      const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
      
      let allSuccessful = true;
      for (const cmd of commands) {
        const { error: cmdError } = await supabase.rpc('exec_sql', { sql: cmd + ';' });
        if (cmdError) {
          console.error(`Error ejecutando comando: ${cmd}`, cmdError);
          allSuccessful = false;
        }
      }
      
      return allSuccessful;
    }

    console.log(`Migración ${filename} aplicada con éxito`);
    return true;
  } catch (error) {
    console.error(`Error al aplicar la migración ${filename}:`, error);
    return false;
  }
}

async function applyMigrations() {
  try {
    // Lista de migraciones a aplicar
    const migrations = [
      '20250228_fix_users_table.sql',
      '20250228_fix_messages_table.sql'
    ];
    
    let allSuccessful = true;
    
    for (const migration of migrations) {
      const success = await applyMigration(migration);
      if (!success) {
        allSuccessful = false;
      }
    }
    
    if (allSuccessful) {
      console.log('Todas las migraciones se aplicaron con éxito');
    } else {
      console.error('Algunas migraciones fallaron. Revisa los errores anteriores.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error inesperado:', error);
    process.exit(1);
  }
}

applyMigrations();
