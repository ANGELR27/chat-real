
import { supabase } from '@/lib/supabase';
import { Message, User, Conversation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function getConversations(userId: string): Promise<Conversation[]> {
  // Get all messages where the user is either sender or receiver
  const { data: messages } = await supabase
    .from('messages')
    .select('*, sender:sender_id(*), receiver:receiver_id(*)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  
  if (!messages || messages.length === 0) return [];
  
  // Group messages by conversation partner
  const conversationsMap = new Map<string, Conversation>();
  
  messages.forEach((message: any) => {
    const partnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
    const partner = message.sender_id === userId ? message.receiver : message.sender;
    
    if (!conversationsMap.has(partnerId)) {
      conversationsMap.set(partnerId, {
        id: partnerId,
        user: partner,
        last_message: message.content,
        last_message_time: message.created_at,
        unread_count: message.receiver_id === userId && !message.read ? 1 : 0,
      });
    } else if (!message.read && message.receiver_id === userId) {
      const conversation = conversationsMap.get(partnerId)!;
      conversation.unread_count += 1;
    }
  });
  
  return Array.from(conversationsMap.values());
}

export async function getMessages(userId: string, partnerId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
    .order('created_at');
  
  // Mark messages as read
  const messagesToUpdate = data?.filter(m => m.receiver_id === userId && !m.read) || [];
  if (messagesToUpdate.length > 0) {
    await supabase
      .from('messages')
      .update({ read: true })
      .in('id', messagesToUpdate.map(m => m.id));
  }
  
  return data as Message[];
}

export async function sendMessage(
  senderId: string, 
  receiverId: string, 
  content: string,
  attachmentUrl?: string,
  attachmentType?: 'image' | 'audio' | 'file'
): Promise<Message> {
  const message: Partial<Message> = {
    id: uuidv4(),
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    attachment_url: attachmentUrl,
    attachment_type: attachmentType,
    created_at: new Date().toISOString(),
    read: false
  };
  
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();
  
  if (error) throw error;
  
  return data as Message;
}

export async function uploadAttachment(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${uuidv4()}.${fileExt}`;
  const filePath = `attachments/${fileName}`;
  
  const { error } = await supabase.storage
    .from('chat-attachments')
    .upload(filePath, file);
  
  if (error) throw error;
  
  const { data } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

export function subscribeToMessages(callback: (message: Message) => void) {
  return supabase
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, payload => {
      callback(payload.new as Message);
    })
    .subscribe();
}

export function subscribeToUserStatus(callback: (user: User) => void) {
  return supabase
    .channel('users')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'users'
    }, payload => {
      callback(payload.new as User);
    })
    .subscribe();
}
