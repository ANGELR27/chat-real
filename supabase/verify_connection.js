import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://kwfdjdhovhnhuptjeuxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZmRqZGhvdmhuaHVwdGpldXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc2ODIyNCwiZXhwIjoyMDU1MzQ0MjI0fQ.vtpUB16Ajo4e72hCG_qKyehCryDC5nl87Zv7iKmG5Cs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
  try {
    console.log('Verificando conexión a Supabase...');
    
    // Intentar una consulta simple
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error('Error al conectar con Supabase:', error.message);
      return false;
    }
    
    console.log('Conexión exitosa a Supabase!');
    console.log('Datos de muestra:', data);
    return true;
  } catch (error) {
    console.error('Error inesperado:', error.message);
    return false;
  }
}

verifyConnection()
  .then(success => {
    if (!success) {
      console.log('No se pudo verificar la conexión. Verifica las credenciales.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error en la verificación:', error);
    process.exit(1);
  });
