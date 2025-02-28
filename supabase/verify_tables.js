import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://kwfdjdhovhnhuptjeuxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZmRqZGhvdmhuaHVwdGpldXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc2ODIyNCwiZXhwIjoyMDU1MzQ0MjI0fQ.vtpUB16Ajo4e72hCG_qKyehCryDC5nl87Zv7iKmG5Cs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  try {
    // Verificar tabla users
    console.log('Verificando estructura de la tabla users...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('Error al consultar tabla users:', usersError);
    } else {
      console.log('Tabla users encontrada');
      if (usersData && usersData.length > 0) {
        const userColumns = Object.keys(usersData[0]);
        console.log('Columnas en tabla users:', userColumns);
      } else {
        console.log('La tabla users está vacía');
      }
    }
    
    // Verificar tabla messages
    console.log('\nVerificando estructura de la tabla messages...');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      console.error('Error al consultar tabla messages:', messagesError);
    } else {
      console.log('Tabla messages encontrada');
      if (messagesData && messagesData.length > 0) {
        const messageColumns = Object.keys(messagesData[0]);
        console.log('Columnas en tabla messages:', messageColumns);
      } else {
        console.log('La tabla messages está vacía');
        
        // Intentar insertar un mensaje de prueba
        console.log('\nIntentando insertar un mensaje de prueba...');
        
        // Primero verificamos que exista al menos un usuario
        const { data: userCheck, error: userCheckError } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        if (userCheckError || !userCheck || userCheck.length === 0) {
          console.log('No hay usuarios en la tabla. Creando usuario de prueba...');
          
          const { data: newUser, error: newUserError } = await supabase
            .from('users')
            .insert({
              id: '00000000-0000-0000-0000-000000000001',
              username: 'test_user',
              email: 'test@example.com'
            })
            .select();
          
          if (newUserError) {
            console.error('Error al crear usuario de prueba:', newUserError);
          } else {
            console.log('Usuario de prueba creado:', newUser);
          }
        }
        
        // Intentar insertar un mensaje de prueba
        const { data: newMessage, error: newMessageError } = await supabase
          .from('messages')
          .insert({
            id: '00000000-0000-0000-0000-000000000001',
            sender_id: '00000000-0000-0000-0000-000000000001',
            receiver_id: '00000000-0000-0000-0000-000000000001',
            content: 'Mensaje de prueba'
          })
          .select();
        
        if (newMessageError) {
          console.error('Error al insertar mensaje de prueba:', newMessageError);
          
          if (newMessageError.message.includes('sender_id')) {
            console.error('La columna sender_id parece faltar o tener restricciones');
          }
          
          if (newMessageError.message.includes('receiver_id')) {
            console.error('La columna receiver_id parece faltar o tener restricciones');
          }
        } else {
          console.log('Mensaje de prueba insertado con éxito:', newMessage);
          
          // Verificar nuevamente la estructura de la tabla messages
          const { data: updatedMessagesData } = await supabase
            .from('messages')
            .select('*')
            .limit(1);
          
          if (updatedMessagesData && updatedMessagesData.length > 0) {
            const messageColumns = Object.keys(updatedMessagesData[0]);
            console.log('Columnas en tabla messages (después de inserción):', messageColumns);
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error inesperado:', error);
    return false;
  }
}

verifyTables()
  .then(success => {
    if (success) {
      console.log('\nVerificación completada');
    } else {
      console.error('\nHubo errores durante la verificación');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error en la ejecución:', error);
    process.exit(1);
  });
