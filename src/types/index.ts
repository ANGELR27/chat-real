
export interface User {
  id: string;
  username: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  last_seen?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'audio' | 'file';
  created_at: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  user: User;
}
