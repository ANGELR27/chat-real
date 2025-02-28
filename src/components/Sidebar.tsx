import { useState } from "react";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";
import { Conversation, User } from "@/types";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  conversations: Conversation[];
  onlineUsers: User[];
  currentUser?: User;
}

const Sidebar = ({ conversations, onlineUsers, currentUser }: SidebarProps) => {
  const [selectedTab, setSelectedTab] = useState<'chats' | 'contacts'>('chats');
  const navigate = useNavigate();
  const location = useLocation();
  const activeChatId = location.pathname.split('/chat/')[1];

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-gray-200 dark:border-gray-800 w-80">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </div>
          <input 
            type="search" 
            className="bg-gray-100 dark:bg-sidebar-accent border-0 text-gray-600 dark:text-gray-300 w-full pl-10 pr-4 py-2.5 rounded-lg"
            placeholder="Search"
          />
        </div>
      </div>

      {/* Online users */}
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Online Now</h3>
        <div className="flex -space-x-2 overflow-hidden">
          {onlineUsers.slice(0, 4).map((user) => (
            <div key={user.id} className="relative ml-1 first:ml-0">
              <Avatar 
                src={user.avatar_url} 
                alt={user.username} 
                status="online"
                size="sm"
              />
            </div>
          ))}
          {onlineUsers.length > 4 && (
            <div className="z-10 flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-300 border-2 border-white dark:border-sidebar">
              +{onlineUsers.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Messages/Contacts Tab */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 px-2 mt-2">
        <button
          onClick={() => setSelectedTab('chats')}
          className={cn(
            "flex-1 py-3 text-sm font-medium",
            selectedTab === 'chats' 
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400" 
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Messages
        </button>
        <button
          onClick={() => setSelectedTab('contacts')}
          className={cn(
            "flex-1 py-3 text-sm font-medium",
            selectedTab === 'contacts' 
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400" 
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Contacts
        </button>
      </div>

      {/* Chats */}
      <div className="flex-1 overflow-y-auto">
        {selectedTab === 'chats' && (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {conversations.map((conversation) => (
              <div 
                key={conversation.id}
                onClick={() => navigate(`/chat/${conversation.id}`)}
                className={cn(
                  "flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-sidebar-accent cursor-pointer",
                  activeChatId === conversation.id && "bg-gray-50 dark:bg-sidebar-accent"
                )}
              >
                <Avatar 
                  src={conversation.user?.avatar_url || ''} 
                  alt={conversation.user?.username || 'Usuario'} 
                  status={conversation.user?.status || 'offline'}
                />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {conversation.user?.username || 'Usuario'}
                    </p>
                    {conversation.last_message_time && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(conversation.last_message_time)}
                      </p>
                    )}
                  </div>
                  {conversation.last_message && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {conversation.last_message}
                    </p>
                  )}
                </div>
                {conversation.unread_count > 0 && (
                  <div className="ml-2 bg-blue-500 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
                    {conversation.unread_count}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contacts Tab */}
        {selectedTab === 'contacts' && (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {onlineUsers.map((user) => (
              <div 
                key={user.id}
                onClick={() => navigate(`/chat/${user.id}`)}
                className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-sidebar-accent cursor-pointer"
              >
                <Avatar 
                  src={user.avatar_url} 
                  alt={user.username} 
                  status={user.status}
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.status === 'online' ? 'Active now' : 'Last seen ' + (user.last_seen ? formatTime(user.last_seen) : 'recently')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current User */}
      {currentUser && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center">
          <Avatar 
            src={currentUser.avatar_url} 
            alt={currentUser.username} 
            status="online"
          />
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {currentUser.username}
            </p>
          </div>
          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If less than 24 hours, show time
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // If in the current year, show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // Otherwise show date
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

export default Sidebar;
