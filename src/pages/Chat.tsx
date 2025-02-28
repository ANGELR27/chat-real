import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import Sidebar from "@/components/Sidebar";
import ChatContent from "@/components/ChatContent";
import VideoCall from "@/components/VideoCall";
import { User, Message, Conversation } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import "@/lib/polyfills"; // Importar polyfills antes de simple-peer
import SimplePeer from "simple-peer";

const Chat = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerUser, setCallerUser] = useState<User | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const messagesSubscriptionRef = useRef<any>(null);
  const callEventsSubscriptionRef = useRef<any>(null);
  const userStatusSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    checkSession();
    
    return () => {
      // Clean up subscriptions
      messagesSubscriptionRef.current?.unsubscribe();
      callEventsSubscriptionRef.current?.unsubscribe();
      userStatusSubscriptionRef.current?.unsubscribe();
      
      // Clean up media streams
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
      loadOnlineUsers();
      setupSubscriptions();
      
      // Set up window beforeunload event to update user status
      const handleBeforeUnload = () => {
        if (currentUser) {
          updateUserStatus(currentUser.id, 'offline');
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && chatId) {
      loadMessages();
      loadChatUser();
    }
  }, [currentUser, chatId]);

  const checkSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/");
        return;
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.session.user.id)
        .single();

      if (error || !userData) {
        // User record doesn't exist, create one
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const newUser = {
            id: authData.user.id,
            username: authData.user.user_metadata?.username || authData.user.email?.split("@")[0] || "User",
            email: authData.user.email,
            status: "online",
            created_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
          };

          const { error: insertError } = await supabase.from("users").insert(newUser);
          
          if (insertError) {
            console.error("Error creating user:", insertError);
            toast({
              title: "Error",
              description: "No se pudo crear el perfil de usuario",
              variant: "destructive",
            });
            return;
          }
          
          setCurrentUser(newUser as User);
        }
      } else {
        // Update status to online
        await updateUserStatus(userData.id, 'online');
        setCurrentUser(userData as User);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking session:", error);
      toast({
        title: "Error",
        description: "No se pudo verificar tu sesión",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const updateUserStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
    try {
      return await supabase
        .from("users")
        .update({
          status,
          last_seen: new Date().toISOString(),
        })
        .eq("id", userId);
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const setupSubscriptions = () => {
    if (!currentUser) return;

    try {
      // Subscribe to new messages
      messagesSubscriptionRef.current = supabase
        .channel("messages-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${currentUser.id}`,
          },
          (payload) => {
            const newMessage = payload.new as Message;
            
            // Add to messages if in current chat
            if (chatId === newMessage.sender_id) {
              setMessages((prev) => [...prev, newMessage]);
              
              // Mark as read
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", newMessage.id);
            } else {
              // Update conversations with unread count
              setConversations((prev) => {
                const existingConv = prev.find(c => c.id === newMessage.sender_id);
                if (existingConv) {
                  return prev.map(c => 
                    c.id === newMessage.sender_id 
                      ? { 
                          ...c, 
                          last_message: newMessage.content, 
                          last_message_time: newMessage.created_at,
                          unread_count: c.unread_count + 1 
                        } 
                      : c
                  );
                }
                // Load new conversation
                loadConversations();
                return prev;
              });
              
              // Show toast for new message
              toast({
                title: "Nuevo mensaje",
                description: `${
                  onlineUsers.find(u => u.id === newMessage.sender_id)?.username || "Alguien"
                } te ha enviado un mensaje`,
                action: (
                  <button
                    onClick={() => navigate(`/chat/${newMessage.sender_id}`)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs"
                  >
                    Ver
                  </button>
                ),
              });
            }
          }
        )
        .subscribe();

      // Subscribe to user status changes
      userStatusSubscriptionRef.current = supabase
        .channel("users-status-channel")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "users",
          },
          () => {
            loadOnlineUsers();
            
            // If the active chat user status has changed, reload their info
            if (chatId) {
              loadChatUser();
            }
          }
        )
        .subscribe();
        
      // Subscribe to call events
      callEventsSubscriptionRef.current = supabase
        .channel("call-events")
        .on(
          "broadcast",
          { event: `call:incoming:${currentUser.id}` },
          async (payload) => {
            const { callerId, signal } = payload;
            const { data: caller } = await supabase
              .from("users")
              .select("*")
              .eq("id", callerId)
              .single();
              
            if (caller) {
              setCallerUser(caller as User);
              setIsIncomingCall(true);
              
              // Store signal for when user accepts call
              if (signal && peerRef.current) {
                peerRef.current.signal(signal);
              }
              
              // Play ringtone
              const audio = new Audio("/ringtone.mp3");
              audio.loop = true;
              audio.play().catch(error => console.error("Error playing ringtone:", error));
              
              // Set timeout to stop ringing after 30 seconds
              setTimeout(() => {
                if (isIncomingCall) {
                  setIsIncomingCall(false);
                  audio.pause();
                  audio.currentTime = 0;
                }
              }, 30000);
            }
          }
        )
        .on(
          "broadcast",
          { event: `call:signal:${currentUser.id}` },
          (payload) => {
            if (peerRef.current && payload.signal) {
              peerRef.current.signal(payload.signal);
            }
          }
        )
        .on(
          "broadcast",
          { event: `call:ended:${currentUser.id}` },
          () => {
            endCall();
          }
        )
        .subscribe();
    } catch (error) {
      console.error("Error setting up subscriptions:", error);
    }
  };

  const loadConversations = async () => {
    if (!currentUser) return;

    try {
      console.log("Loading conversations for user:", currentUser.id);
      
      // Get all messages where the user is either sender or receiver
      const { data: messages, error } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, content, created_at, read")
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading messages for conversations:", error);
        return;
      }

      if (!messages || messages.length === 0) {
        console.log("No messages found");
        setConversations([]);
        return;
      }

      console.log("Found messages:", messages.length);

      // Get all user details for conversation partners
      const partnerIds = Array.from(new Set(
        messages.map(m => 
          m.sender_id === currentUser.id ? m.receiver_id : m.sender_id
        )
      ));
      
      const { data: partners, error: partnersError } = await supabase
        .from("users")
        .select("*")
        .in("id", partnerIds);
        
      if (partnersError) {
        console.error("Error loading conversation partners:", partnersError);
        return;
      }
      
      // Group messages by conversation partner
      const conversationsMap = new Map<string, Conversation>();

      for (const message of messages) {
        const partnerId = message.sender_id === currentUser.id 
          ? message.receiver_id 
          : message.sender_id;
          
        const partner = partners?.find(p => p.id === partnerId);
        
        if (!partner) continue;

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            id: partnerId,
            user: partner as User,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: message.receiver_id === currentUser.id && !message.read ? 1 : 0,
          });
        } else if (!message.read && message.receiver_id === currentUser.id) {
          const conversation = conversationsMap.get(partnerId)!;
          conversation.unread_count += 1;
        }
      }

      console.log("Mapped conversations:", Array.from(conversationsMap.values()));
      setConversations(Array.from(conversationsMap.values()));
    } catch (error) {
      console.error("Error in loadConversations:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conversaciones",
        variant: "destructive",
      });
    }
  };

  const loadOnlineUsers = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .neq("id", currentUser.id)
        .order("username");

      if (error) {
        console.error("Error loading online users:", error);
        return;
      }

      setOnlineUsers(data as User[]);
    } catch (error) {
      console.error("Error in loadOnlineUsers:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async () => {
    if (!currentUser || !chatId) return;

    try {
      console.log(`Loading messages between ${currentUser.id} and ${chatId}`);
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at");

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      console.log(`Found ${data?.length || 0} messages`);
      setMessages(data as Message[]);

      // Mark messages as read
      const messagesToUpdate = data?.filter(
        (m) => m.receiver_id === currentUser.id && !m.read
      );
      
      if (messagesToUpdate && messagesToUpdate.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in(
            "id",
            messagesToUpdate.map((m) => m.id)
          );

        // Update unread count in conversations
        setConversations((prev) =>
          prev.map((c) =>
            c.id === chatId ? { ...c, unread_count: 0 } : c
          )
        );
      }
    } catch (error) {
      console.error("Error in loadMessages:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los mensajes",
        variant: "destructive",
      });
    }
  };

  const loadChatUser = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", chatId)
        .single();

      if (error) {
        console.error("Error loading chat user:", error);
        return;
      }

      setActiveChatUser(data as User);
    } catch (error) {
      console.error("Error in loadChatUser:", error);
    }
  };

  const handleSendMessage = async (
    content: string,
    attachmentUrl?: string,
    attachmentType?: "image" | "audio" | "file"
  ) => {
    if (!currentUser || !chatId || (!content.trim() && !attachmentUrl)) return;
    
    // Prevent multiple sends
    if (sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      const newMessage = {
        id: uuidv4(),
        sender_id: currentUser.id,
        receiver_id: chatId,
        content: content.trim() || "Archivo adjunto",
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        created_at: new Date().toISOString(),
        read: false,
      };

      console.log("Sending message:", newMessage);

      const { error } = await supabase
        .from("messages")
        .insert(newMessage);
      
      if (error) {
        console.error("Error inserting message:", error);
        throw new Error("No se pudo enviar el mensaje");
      }

      // Optimistically update messages
      setMessages((prev) => [...prev, newMessage as Message]);

      // Update conversations
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === chatId);
        if (existing) {
          return prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  last_message: content.trim() || "Archivo adjunto",
                  last_message_time: new Date().toISOString(),
                }
              : c
          );
        }
        
        // New conversation
        if (activeChatUser) {
          return [
            {
              id: chatId,
              user: activeChatUser,
              last_message: content.trim() || "Archivo adjunto",
              last_message_time: new Date().toISOString(),
              unread_count: 0,
            },
            ...prev,
          ];
        }
        
        return prev;
      });
      
      return true;
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error al enviar mensaje",
        description: error.message || "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendAudio = async (audioBlob: Blob) => {
    if (!currentUser || !chatId) return;

    try {
      setSendingMessage(true);
      
      // Create a unique file name
      const fileName = `audio_${uuidv4()}.webm`;
      
      console.log("Uploading audio:", fileName);
      
      // Upload audio to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(`${currentUser.id}/${fileName}`, audioBlob);

      if (uploadError) {
        console.error("Error uploading audio:", uploadError);
        throw new Error("No se pudo subir el audio");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(`${currentUser.id}/${fileName}`);

      console.log("Audio uploaded, URL:", urlData.publicUrl);
      
      // Send message with audio attachment
      const success = await handleSendMessage("Mensaje de audio", urlData.publicUrl, "audio");
      
      if (!success) {
        throw new Error("Error al enviar el mensaje de audio");
      }
      
      return true;
    } catch (error: any) {
      console.error("Error sending audio:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje de audio. Inténtalo de nuevo.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSendingMessage(false);
    }
  };

  const startVideoCall = async () => {
    if (!currentUser || !activeChatUser) return;
    
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      setIsInCall(true);
      
      // Create peer connection (as initiator)
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream,
      });
      
      peer.on('signal', (data) => {
        // Send signaling data to remote peer
        supabase.channel('call-events').send({
          type: 'broadcast',
          event: `call:incoming:${activeChatUser.id}`,
          payload: { 
            callerId: currentUser.id,
            signal: data 
          },
        });
      });
      
      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });
      
      peer.on('error', (err) => {
        console.error('Peer error:', err);
        endCall();
        toast({
          title: "Error de llamada",
          description: "Hubo un error con la conexión de la llamada.",
          variant: "destructive",
        });
      });
      
      peerRef.current = peer;
      
      toast({
        title: "Llamando...",
        description: `Llamando a ${activeChatUser.username}`,
      });
      
    } catch (err) {
      console.error('Failed to get media devices:', err);
      toast({
        title: "Error de cámara/micrófono",
        description: "No se pudo acceder a la cámara o al micrófono. Verifica los permisos.",
        variant: "destructive",
      });
    }
  };
  
  const acceptCall = async () => {
    if (!currentUser || !callerUser) return;
    
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      setIsInCall(true);
      setIsIncomingCall(false);
      
      // Create peer connection (not as initiator)
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
      });
      
      peer.on('signal', (data) => {
        // Send signaling data to caller
        supabase.channel('call-events').send({
          type: 'broadcast',
          event: `call:signal:${callerUser.id}`,
          payload: { signal: data },
        });
      });
      
      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });
      
      peer.on('error', (err) => {
        console.error('Peer error:', err);
        endCall();
      });
      
      peerRef.current = peer;
      
      // Set active chat user to caller
      setActiveChatUser(callerUser);
      
      // If not already in this chat, navigate to it
      if (chatId !== callerUser.id) {
        navigate(`/chat/${callerUser.id}`);
      }
      
    } catch (err) {
      console.error('Failed to get media devices:', err);
      toast({
        title: "Error de cámara/micrófono",
        description: "No se pudo acceder a la cámara o al micrófono. Verifica los permisos.",
        variant: "destructive",
      });
    }
  };
  
  const rejectCall = () => {
    if (!callerUser) return;
    
    // Notify caller that call was rejected
    supabase.channel('call-events').send({
      type: 'broadcast',
      event: `call:ended:${callerUser.id}`,
      payload: { reason: 'rejected' },
    });
    
    setIsIncomingCall(false);
    setCallerUser(null);
  };
  
  const endCall = () => {
    // Stop all tracks in streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStream(null);
    setIsInCall(false);
    setIsIncomingCall(false);
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    // Notify other participant
    if (activeChatUser) {
      supabase.channel('call-events').send({
        type: 'broadcast',
        event: `call:ended:${activeChatUser.id}`,
        payload: { reason: 'ended' },
      });
    }
  };

  const handleSignOut = async () => {
    if (currentUser) {
      // Update status to offline
      await updateUserStatus(currentUser.id, 'offline');
    }

    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!currentUser) {
    navigate("/");
    return null;
  }

  return (
    <Layout>
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar
          conversations={conversations}
          onlineUsers={onlineUsers}
          currentUser={currentUser}
        />

        {chatId && activeChatUser ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatContent
              messages={messages}
              currentUser={currentUser}
              chatUser={activeChatUser}
              onSendMessage={handleSendMessage}
              onSendAudio={handleSendAudio}
              onStartVideoCall={startVideoCall}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="inline-block p-4 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600 dark:text-blue-400"
                >
                  <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">
                Bienvenido a SupaChat
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Selecciona una conversación del panel lateral o inicia un nuevo chat con un usuario en línea.
              </p>
              <button
                onClick={handleSignOut}
                className="mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 transition-colors duration-300"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
        
        {isInCall && activeChatUser && (
          <VideoCall
            currentUser={currentUser}
            remoteUser={activeChatUser}
            onEndCall={endCall}
            localStream={localStream || undefined}
            remoteStream={remoteStream || undefined}
          />
        )}
        
        {isIncomingCall && callerUser && (
          <VideoCall
            currentUser={currentUser}
            remoteUser={callerUser}
            onEndCall={rejectCall}
            isIncoming={true}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}
      </div>
    </Layout>
  );
};

export default Chat;
