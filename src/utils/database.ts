import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

/**
 * Verifica la estructura de la tabla de mensajes
 * @returns Promise<boolean> true si la estructura es correcta, false si hay problemas
 */
export async function verifyMessagesTable(): Promise<boolean> {
  try {
    // Intentar obtener un mensaje para verificar la estructura
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id')
      .limit(1);
    
    if (error) {
      console.error('Error al verificar la tabla messages:', error);
      
      // Mostrar un mensaje de error específico según el tipo de error
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        toast({
          title: 'Error en la estructura de la base de datos',
          description: 'La tabla de mensajes no tiene la estructura correcta. Por favor, aplica las migraciones necesarias.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error al conectar con la base de datos',
          description: error.message,
          variant: 'destructive',
        });
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error inesperado al verificar la tabla messages:', error);
    return false;
  }
}

/**
 * Verifica la estructura de la tabla de usuarios
 * @returns Promise<boolean> true si la estructura es correcta, false si hay problemas
 */
export async function verifyUsersTable(): Promise<boolean> {
  try {
    // Intentar obtener un usuario para verificar la estructura
    const { data, error } = await supabase
      .from('users')
      .select('id, username, status')
      .limit(1);
    
    if (error) {
      console.error('Error al verificar la tabla users:', error);
      
      // Mostrar un mensaje de error específico según el tipo de error
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        toast({
          title: 'Error en la estructura de la base de datos',
          description: 'La tabla de usuarios no tiene la estructura correcta. Por favor, aplica las migraciones necesarias.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error al conectar con la base de datos',
          description: error.message,
          variant: 'destructive',
        });
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error inesperado al verificar la tabla users:', error);
    return false;
  }
}
