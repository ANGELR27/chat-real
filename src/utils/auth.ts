
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });
  
  if (error) throw error;
  
  if (data.user) {
    await supabase.from('users').insert({
      id: data.user.id,
      username,
      email,
      status: 'online',
      created_at: new Date().toISOString(),
    });
  }
  
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  if (data.user) {
    await supabase.from('users').update({
      status: 'online',
      last_seen: new Date().toISOString(),
    }).eq('id', data.user.id);
  }
  
  return data;
}

export async function signOut() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase.from('users').update({
      status: 'offline',
      last_seen: new Date().toISOString(),
    }).eq('id', user.id);
  }
  
  return supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return data as User;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await supabase
    .from('users')
    .select('*');
  
  return data as User[];
}

export async function updateUserStatus(userId: string, status: 'online' | 'offline' | 'away') {
  return supabase
    .from('users')
    .update({
      status,
      last_seen: new Date().toISOString(),
    })
    .eq('id', userId);
}
