const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Obtener las variables de entorno o configurarlas manualmente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Por favor, configura SUPABASE_URL y SUPABASE_SERVICE_KEY como variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(filename) {
  try {
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'migrations', filename);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log(`Aplicando migración: ${filename}...`);

    // Ejecutar la migración
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Error al aplicar la migración ${filename}:`, error);
      return false;
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
