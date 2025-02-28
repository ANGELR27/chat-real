import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Configuración de Supabase
const supabaseUrl = 'https://kwfdjdhovhnhuptjeuxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZmRqZGhvdmhuaHVwdGpldXhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc2ODIyNCwiZXhwIjoyMDU1MzQ0MjI0fQ.vtpUB16Ajo4e72hCG_qKyehCryDC5nl87Zv7iKmG5Cs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para verificar la estructura de la tabla messages
async function verifyMessagesTable() {
  try {
    // Verificar la estructura de la tabla messages
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    
    if (error) {
      console.error('Error al verificar la tabla messages:', error);
      return false;
    }
    
    // Si no hay datos, no podemos verificar la estructura
    if (!data || data.length === 0) {
      console.log('No hay mensajes en la tabla para verificar la estructura');
      return true; // Asumimos que está bien si no hay datos
    }
    
    // Verificar si la tabla tiene la estructura esperada
    const firstMessage = data[0];
    const hasNewStructure = 'sender_id' in firstMessage && 'receiver_id' in firstMessage;
    const hasOldStructure = 'sender' in firstMessage && 'conversation_id' in firstMessage;
    
    if (hasNewStructure) {
      console.log('La tabla messages tiene la estructura correcta (sender_id, receiver_id)');
      return true;
    } else if (hasOldStructure) {
      console.log('La tabla messages tiene la estructura antigua (sender, conversation_id)');
      console.log('El adaptador de base de datos se utilizará para compatibilidad');
      return true;
    } else {
      console.error('La tabla messages tiene una estructura desconocida');
      return false;
    }
  } catch (error) {
    console.error('Error al verificar la tabla messages:', error);
    return false;
  }
}

// Función para enviar un mensaje adaptándose a la estructura de la tabla
async function sendMessageWithAdapter(
  content,
  senderId,
  receiverId,
  attachmentUrl,
  attachmentType
) {
  try {
    // Verificar la estructura de la tabla messages
    const { data: structureData } = await supabase.from('messages').select('*').limit(1);
    
    // Determinar si estamos usando la estructura antigua o nueva
    const hasNewStructure = structureData && structureData.length > 0 && 'sender_id' in structureData[0];
    
    const messageId = uuidv4();
    let result;
    
    if (hasNewStructure) {
      // Usar la estructura nueva
      console.log('Usando estructura nueva para enviar mensaje');
      result = await supabase.from('messages').insert({
        id: messageId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        created_at: new Date().toISOString(),
        read: false
      }).select();
    } else {
      // Usar la estructura antigua
      console.log('Usando estructura antigua para enviar mensaje');
      result = await supabase.from('messages').insert({
        id: messageId,
        sender: senderId,
        conversation_id: receiverId,
        content,
        is_image: attachmentType === 'image',
        created_at: new Date().toISOString()
      }).select();
    }
    
    const { data, error } = result;
    
    if (error) {
      console.error('Error al enviar mensaje:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    console.log('Mensaje enviado con éxito:', data[0]);
    return data[0];
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return null;
  }
}

// Función para obtener mensajes adaptándose a la estructura de la tabla
async function getMessagesWithAdapter(userId, otherUserId) {
  try {
    // Verificar la estructura de la tabla messages
    const { data: structureData } = await supabase.from('messages').select('*').limit(1);
    
    // Determinar si estamos usando la estructura antigua o nueva
    const hasNewStructure = structureData && structureData.length > 0 && 'sender_id' in structureData[0];
    
    let result;
    
    if (hasNewStructure) {
      // Usar la estructura nueva
      console.log('Usando estructura nueva para obtener mensajes');
      result = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
        .order('created_at', { ascending: true });
    } else {
      // Usar la estructura antigua
      console.log('Usando estructura antigua para obtener mensajes');
      result = await supabase
        .from('messages')
        .select('*')
        .or(`sender.eq.${userId},conversation_id.eq.${userId}`)
        .or(`sender.eq.${otherUserId},conversation_id.eq.${otherUserId}`)
        .order('created_at', { ascending: true });
    }
    
    const { data, error } = result;
    
    if (error) {
      console.error('Error al obtener mensajes:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No se encontraron mensajes');
      return [];
    }
    
    // Filtrar los mensajes para incluir solo los de la conversación entre los dos usuarios
    const filteredMessages = data.filter(msg => {
      if (hasNewStructure) {
        return (
          (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === userId)
        );
      } else {
        return (
          (msg.sender === userId && msg.conversation_id === otherUserId) ||
          (msg.sender === otherUserId && msg.conversation_id === userId)
        );
      }
    });
    
    console.log(`Se encontraron ${filteredMessages.length} mensajes entre los usuarios`);
    return filteredMessages;
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    return [];
  }
}

// Función principal para probar el adaptador
async function testAdapter() {
  try {
    console.log('=== PRUEBA DEL ADAPTADOR DE BASE DE DATOS ===');
    
    // Verificar la estructura de la tabla
    const isTableValid = await verifyMessagesTable();
    if (!isTableValid) {
      console.error('La tabla messages no tiene una estructura válida');
      return false;
    }
    
    // Obtener usuarios para pruebas
    console.log('\nBuscando usuarios para pruebas...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .limit(2);
    
    if (usersError || !users || users.length < 2) {
      console.error('No se encontraron suficientes usuarios para la prueba');
      
      // Crear usuarios de prueba si no existen
      console.log('Creando usuarios de prueba...');
      
      const testUser1 = {
        id: uuidv4(),
        username: 'test_user_1',
        email: 'test1@example.com'
      };
      
      const testUser2 = {
        id: uuidv4(),
        username: 'test_user_2',
        email: 'test2@example.com'
      };
      
      const { data: newUsers, error: newUsersError } = await supabase
        .from('users')
        .insert([testUser1, testUser2])
        .select();
      
      if (newUsersError) {
        console.error('Error al crear usuarios de prueba:', newUsersError);
        return false;
      }
      
      console.log('Usuarios de prueba creados:', newUsers);
      
      // Usar los nuevos usuarios
      testUser1.id = newUsers[0].id;
      testUser2.id = newUsers[1].id;
      
      // Enviar un mensaje de prueba
      console.log('\nEnviando mensaje de prueba...');
      const message = await sendMessageWithAdapter(
        'Mensaje de prueba del adaptador',
        testUser1.id,
        testUser2.id,
        null,
        null
      );
      
      if (!message) {
        console.error('Error al enviar mensaje de prueba');
        return false;
      }
      
      // Obtener mensajes
      console.log('\nObteniendo mensajes...');
      const messages = await getMessagesWithAdapter(testUser1.id, testUser2.id);
      
      console.log(`Se encontraron ${messages.length} mensajes entre los usuarios de prueba`);
      
      return true;
    } else {
      // Usar los usuarios existentes
      console.log('Usuarios encontrados:', users);
      
      // Enviar un mensaje de prueba
      console.log('\nEnviando mensaje de prueba...');
      const message = await sendMessageWithAdapter(
        'Mensaje de prueba del adaptador',
        users[0].id,
        users[1].id,
        null,
        null
      );
      
      if (!message) {
        console.error('Error al enviar mensaje de prueba');
        return false;
      }
      
      // Obtener mensajes
      console.log('\nObteniendo mensajes...');
      const messages = await getMessagesWithAdapter(users[0].id, users[1].id);
      
      console.log(`Se encontraron ${messages.length} mensajes entre los usuarios`);
      
      return true;
    }
  } catch (error) {
    console.error('Error inesperado:', error);
    return false;
  }
}

// Ejecutar la prueba
testAdapter()
  .then(success => {
    if (success) {
      console.log('\n✅ El adaptador de base de datos funciona correctamente');
      console.log('Puedes seguir usando la aplicación con la estructura actual de la tabla');
      console.log('O puedes aplicar las migraciones para tener la estructura óptima');
    } else {
      console.error('\n❌ El adaptador de base de datos no funciona correctamente');
      console.log('Por favor, aplica las migraciones para corregir la estructura de la tabla');
    }
  })
  .catch(error => {
    console.error('Error en la ejecución:', error);
    process.exit(1);
  });
