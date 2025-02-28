
import { useState, useRef, useEffect } from "react";
import { Message, User } from "@/types";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";

interface ChatContentProps {
  messages: Message[];
  currentUser: User;
  chatUser: User;
  onSendMessage: (content: string, attachmentUrl?: string, attachmentType?: 'image' | 'audio' | 'file') => void;
  onSendAudio?: (audioBlob: Blob) => void;
  onStartVideoCall?: () => void;
}

const ChatContent = ({ 
  messages, 
  currentUser, 
  chatUser, 
  onSendMessage, 
  onSendAudio,
  onStartVideoCall
}: ChatContentProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState<{[key: string]: boolean}>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({});
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  const handleSendMessage = () => {
    if (message.trim() || audioURL || selectedFile) {
      if (selectedFile) {
        handleSendFile();
      } else if (audioURL) {
        // Audio is handled separately
      } else {
        onSendMessage(message);
      }
      setMessage("");
      setAudioURL(null);
      setSelectedFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        if (onSendAudio) {
          onSendAudio(audioBlob);
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      // Create a formdata object to upload the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Get file type to determine attachment type
      let attachmentType: 'image' | 'audio' | 'file' = 'file';
      if (selectedFile.type.startsWith('image/')) {
        attachmentType = 'image';
      } else if (selectedFile.type.startsWith('audio/')) {
        attachmentType = 'audio';
      }
      
      // Create a placeholder content message
      const fileContent = `${attachmentType === 'image' ? '📷 Image' : 
                          attachmentType === 'audio' ? '🔊 Audio' : 
                          '📎 File'}: ${selectedFile.name}`;
                          
      // Here we would normally upload the file, but for simplicity
      // we'll create an object URL and pretend it's a remote URL
      const fileURL = URL.createObjectURL(selectedFile);
      
      // Send the message with attachment
      onSendMessage(message || fileContent, fileURL, attachmentType);
      
      // Reset state
      setSelectedFile(null);
      setMessage("");
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAudioPlay = (id: string, isPlaying: boolean) => {
    setIsPlaying(prev => ({...prev, [id]: isPlaying}));
  };

  const getFilePreview = () => {
    if (!selectedFile) return null;
    
    if (selectedFile.type.startsWith('image/')) {
      return (
        <div className="relative mb-2">
          <img 
            src={URL.createObjectURL(selectedFile)} 
            alt="Preview" 
            className="max-h-32 rounded-md object-cover"
          />
          <button 
            onClick={() => setSelectedFile(null)}
            className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white rounded-full p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span className="ml-2 text-sm">{selectedFile.name}</span>
        <button 
          onClick={() => setSelectedFile(null)} 
          className="ml-2 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    );
  };

  const CustomAudioPlayer = ({ src, msgId }: {src: string, msgId: string}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    
    useEffect(() => {
      if (audioRef.current) {
        audioRefs.current[msgId] = audioRef.current;
        
        const audio = audioRef.current;
        
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });
        
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });
        
        audio.addEventListener('play', () => {
          setIsAudioPlaying(true);
          handleAudioPlay(msgId, true);
        });
        
        audio.addEventListener('pause', () => {
          setIsAudioPlaying(false);
          handleAudioPlay(msgId, false);
        });
        
        audio.addEventListener('ended', () => {
          setIsAudioPlaying(false);
          handleAudioPlay(msgId, false);
          setCurrentTime(0);
        });
        
        return () => {
          audio.removeEventListener('loadedmetadata', () => {});
          audio.removeEventListener('timeupdate', () => {});
          audio.removeEventListener('play', () => {});
          audio.removeEventListener('pause', () => {});
          audio.removeEventListener('ended', () => {});
        };
      }
    }, [msgId]);
    
    const togglePlay = () => {
      const audio = audioRef.current;
      if (!audio) return;
      
      if (isAudioPlaying) {
        audio.pause();
      } else {
        // Pause all other audio elements first
        Object.keys(audioRefs.current).forEach(key => {
          if (key !== msgId && audioRefs.current[key]) {
            audioRefs.current[key].pause();
          }
        });
        
        audio.play().catch(e => console.error("Error playing audio:", e));
      }
    };
    
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (audioRef.current) {
        const newTime = parseFloat(e.target.value);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };
    
    return (
      <div className="flex items-center w-full space-x-2 bg-opacity-50 bg-gray-800 dark:bg-gray-700 rounded-lg p-2">
        <audio ref={audioRef} src={src} className="hidden" />
        
        <button 
          onClick={togglePlay} 
          className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${
            isAudioPlaying ? 'bg-red-500' : 'bg-blue-500'
          } text-white transition-colors duration-200`}
        >
          {isAudioPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>
        
        <div className="flex-1 flex flex-col">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {isAudioPlaying && (
          <div className="flex-shrink-0 flex space-x-1 items-center h-4">
            <div className="w-1 bg-blue-400 rounded-full h-1 animate-soundbar"></div>
            <div className="w-1 bg-blue-400 rounded-full h-2 animate-soundbar animation-delay-100"></div>
            <div className="w-1 bg-blue-400 rounded-full h-3 animate-soundbar animation-delay-200"></div>
            <div className="w-1 bg-blue-400 rounded-full h-4 animate-soundbar animation-delay-300"></div>
            <div className="w-1 bg-blue-400 rounded-full h-2 animate-soundbar animation-delay-200"></div>
            <div className="w-1 bg-blue-400 rounded-full h-1 animate-soundbar animation-delay-100"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center">
        <Avatar 
          src={chatUser.avatar_url} 
          alt={chatUser.username} 
          status={chatUser.status}
        />
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {chatUser.username}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {chatUser.status === 'online' ? 'Active now' : 'Last seen ' + (chatUser.last_seen ? formatTime(chatUser.last_seen) : 'recently')}
          </p>
        </div>
        <div className="flex">
          <button 
            onClick={onStartVideoCall}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2"
            title="Start video call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 10 5-5v14l-5-5H4a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1Z"></path>
            </svg>
          </button>
          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </button>
          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full opacity-70">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">No hay mensajes aún</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Envía un mensaje para comenzar la conversación</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isCurrentUser = msg.sender_id === currentUser.id;
              const showAvatar = 
                index === 0 || 
                messages[index - 1].sender_id !== msg.sender_id || 
                new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 5 * 60 * 1000;
              
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex items-end space-x-2", 
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
                  {!isCurrentUser && showAvatar ? (
                    <Avatar 
                      src={chatUser.avatar_url} 
                      alt={chatUser.username} 
                      size="sm"
                    />
                  ) : !isCurrentUser ? (
                    <div className="w-8" /> // Placeholder to maintain alignment
                  ) : null}
                  
                  <div 
                    className={cn(
                      "max-w-[70%] px-4 py-2 rounded-lg",
                      isCurrentUser 
                        ? "bg-blue-600 text-white rounded-br-none" 
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none"
                    )}
                  >
                    {msg.attachment_type === 'audio' && msg.attachment_url && (
                      <div className="mb-2 w-64">
                        <CustomAudioPlayer src={msg.attachment_url} msgId={msg.id} />
                      </div>
                    )}
                    
                    {msg.attachment_type === 'image' && msg.attachment_url && (
                      <div className="mb-2">
                        <img src={msg.attachment_url} alt="Attachment" className="max-w-full rounded-md" />
                      </div>
                    )}
                    
                    {msg.attachment_type === 'file' && msg.attachment_url && (
                      <div className="mb-2 flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                        </svg>
                        <span className="ml-2 text-sm">Attachment</span>
                      </div>
                    )}
                    
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div 
                      className={cn(
                        "text-xs mt-1", 
                        isCurrentUser ? "text-blue-200" : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {formatTime(msg.created_at)}
                      {isCurrentUser && (
                        <span className="ml-1">
                          {msg.read ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 7 17l-5-5"></path>
                              <path d="m22 10-8 8-4-4"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12 5 5L20 7"></path>
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isCurrentUser && showAvatar ? (
                    <Avatar 
                      src={currentUser.avatar_url} 
                      alt={currentUser.username} 
                      size="sm"
                    />
                  ) : isCurrentUser ? (
                    <div className="w-8" /> // Placeholder
                  ) : null}
                </div>
              );
            })
          )}
          
          {/* Audio preview */}
          {audioURL && (
            <div className="flex justify-end space-x-2 items-end">
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                <audio src={audioURL} controls className="w-48 h-10" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        {isRecording ? (
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
            <div className="flex items-center">
              <div className="animate-pulse w-2 h-2 bg-red-600 rounded-full"></div>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Recording {formatDuration(recordingTime)}
              </span>
            </div>
            <button 
              onClick={stopRecording}
              className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* File preview */}
            {selectedFile && getFilePreview()}
            
            <div className="flex items-center">
              <button 
                onClick={handleAttachmentClick}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex-1 mx-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button 
                onClick={startRecording}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" x2="12" y1="19" y2="22"></line>
                </svg>
              </button>
              <button 
                onClick={handleSendMessage}
                disabled={isUploading}
                className={`bg-blue-600 text-white p-2 rounded-full transition-colors ${
                  isUploading ? 'opacity-70' : 'hover:bg-blue-700'
                }`}
              >
                {isUploading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z"></path>
                    <path d="M22 2 11 13"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default ChatContent;
