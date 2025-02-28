import { supabase } from '@/lib/supabase';
import { Message, User, Conversation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

// Verificar y adaptar la estructura de la tabla messages
export async function verifyMessagesTable(): Promise<boolean> {
  try {
    // Verificar la estructura de la tabla messages
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    
    if (error) {
      console.error('Error al verificar la tabla messages:', error);
      toast({
        title: 'Error al verificar la estructura de la base de datos',
        description: 'Por favor, contacta al administrador.',
        variant: 'destructive',
      });
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
      console.log('La tabla messages tiene la estructura correcta');
      return true;
    } else if (hasOldStructure) {
      console.log('La tabla messages tiene la estructura antigua, utilizando adaptador');
      toast({
        title: 'Adaptador de base de datos activado',
        description: 'Utilizando adaptador para compatibilidad con la estructura actual.',
      });
      return true;
    } else {
      console.error('La tabla messages tiene una estructura desconocida');
      toast({
        title: 'Error de estructura de base de datos',
        description: 'La estructura de la base de datos es incompatible. Por favor, contacta al administrador.',
        variant: 'destructive',
      });
      return false;
    }
  } catch (error) {
    console.error('Error al verificar la tabla messages:', error);
    toast({
      title: 'Error al verificar la estructura de la base de datos',
      description: 'Por favor, contacta al administrador.',
      variant: 'destructive',
    });
    return false;
  }
}

// Función para enviar un mensaje adaptándose a la estructura de la tabla
export async function sendMessageWithAdapter(
  content: string,
  senderId: string,
  receiverId: string,
  attachmentUrl?: string,
  attachmentType?: string
): Promise<Message | null> {
  try {
    // Forzar el uso de la estructura antigua para evitar problemas con la caché del esquema
    const messageId = uuidv4();
    
    // Usar la estructura antigua directamente sin verificar
    const result = await supabase.from('messages').insert({
      id: messageId,
      sender: senderId,
      conversation_id: receiverId,
      content,
      is_image: attachmentType === 'image',
      created_at: new Date().toISOString()
    }).select();
    
    const { data, error } = result;
    
    if (error) {
      console.error("Error al enviar mensaje:", error);
      toast({
        title: "Error al enviar mensaje",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Convertir el formato de respuesta al formato Message esperado por la aplicación
    return {
      id: data[0].id,
      content: data[0].content,
      sender: data[0].sender,
      receiver: data[0].conversation_id,
      created_at: data[0].created_at,
      is_image: data[0].is_image || false,
      attachment_url: null,
      read: false
    } as Message;
  } catch (error: any) {
    console.error('Error al enviar mensaje:', error);
    toast({
      title: "Error inesperado",
      description: "No se pudo enviar el mensaje",
      variant: "destructive",
    });
    return null;
  }
}

// Función para obtener mensajes adaptándose a la estructura de la tabla
export async function getMessagesWithAdapter(userId: string, otherUserId: string): Promise<Message[]> {
  try {
    // Verificar la estructura de la tabla messages
    const { data: structureData } = await supabase.from('messages').select('*').limit(1);
    
    // Determinar si estamos usando la estructura antigua o nueva
    const hasNewStructure = structureData && structureData.length > 0 && 'sender_id' in structureData[0];
    
    let result;
    
    if (hasNewStructure) {
      // Usar la estructura nueva
      result = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
        .order('created_at', { ascending: true });
    } else {
      // Usar la estructura antigua
      result = await supabase
        .from('messages')
        .select('*')
        .or(`sender.eq.${userId},conversation_id.eq.${userId}`)
        .or(`sender.eq.${otherUserId},conversation_id.eq.${otherUserId}`)
        .order('created_at', { ascending: true });
    }
    
    const { data, error } = result;
    
    if (error) {
      toast({
        title: "Error al obtener mensajes",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
    
    if (!data || data.length === 0) {
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
    
    // Adaptar el formato de los mensajes según la estructura
    return filteredMessages.map(msg => {
      if (hasNewStructure) {
        return {
          id: msg.id,
          content: msg.content,
          sender: msg.sender_id,
          receiver: msg.receiver_id,
          created_at: msg.created_at,
          is_image: msg.attachment_type === 'image',
          attachment_url: msg.attachment_url,
          attachment_type: msg.attachment_type,
          read: msg.read
        } as Message;
      } else {
        return {
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          receiver: msg.conversation_id,
          created_at: msg.created_at,
          is_image: msg.is_image,
          attachment_url: null,
          attachment_type: msg.is_image ? 'image' : null,
          read: false
        } as Message;
      }
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    toast({
      title: "Error inesperado",
      description: "No se pudieron obtener los mensajes",
      variant: "destructive",
    });
    return [];
  }
}

// Función para obtener conversaciones adaptándose a la estructura de la tabla
export async function getConversationsWithAdapter(userId: string): Promise<User[]> {
  try {
    // Forzar el uso de la estructura antigua para evitar problemas con la caché del esquema
    
    // 1. Obtener todos los mensajes donde el usuario es el remitente o el destinatario
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender.eq.${userId},conversation_id.eq.${userId}`);
    
    if (messagesError) {
      console.error("Error al obtener conversaciones:", messagesError);
      toast({
        title: "Error al obtener conversaciones",
        description: messagesError.message,
        variant: "destructive",
      });
      return [];
    }
    
    if (!messagesData || messagesData.length === 0) {
      return [];
    }
    
    // 2. Extraer los IDs únicos de los usuarios con los que ha conversado
    const conversationUserIds = new Set<string>();
    
    messagesData.forEach(msg => {
      if (msg.sender === userId) {
        conversationUserIds.add(msg.conversation_id);
      } else if (msg.conversation_id === userId) {
        conversationUserIds.add(msg.sender);
      }
    });
    
    // 3. Obtener la información de los usuarios
    const userIds = Array.from(conversationUserIds);
    
    if (userIds.length === 0) {
      return [];
    }
    
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);
    
    if (usersError) {
      console.error("Error al obtener usuarios:", usersError);
      toast({
        title: "Error al obtener usuarios",
        description: usersError.message,
        variant: "destructive",
      });
      return [];
    }
    
    if (!usersData || usersData.length === 0) {
      return [];
    }
    
    // 4. Devolver la lista de usuarios
    return usersData as User[];
  } catch (error: any) {
    console.error('Error al obtener conversaciones:', error);
    toast({
      title: "Error inesperado",
      description: "No se pudieron obtener las conversaciones",
      variant: "destructive",
    });
    return [];
  }
}

// Función para marcar mensajes como leídos
export async function markMessagesAsRead(userId: string, senderId: string): Promise<boolean> {
  try {
    // Marcar como leídos todos los mensajes enviados por el senderId al userId
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender', senderId)
      .eq('conversation_id', userId)
      .eq('read', false);
    
    if (error) {
      console.error("Error al marcar mensajes como leídos:", error);
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error('Error al marcar mensajes como leídos:', error);
    return false;
  }
}
