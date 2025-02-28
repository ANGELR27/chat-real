
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'away';
  letter?: string;
}

const Avatar = ({ src, alt, size = 'md', status, letter }: AvatarProps) => {
  const sizeClass = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };

  const statusColor = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
  };

  const firstLetter = letter || alt.charAt(0).toUpperCase();
  const bgColor = generateColorFromName(alt);

  return (
    <div className="relative">
      <div 
        className={cn(
          "rounded-full flex items-center justify-center text-white font-semibold", 
          sizeClass[size],
          !src && bgColor
        )}
      >
        {src ? (
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span>{firstLetter}</span>
        )}
      </div>
      {status && (
        <div 
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white",
            size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5',
            statusColor[status]
          )}
        />
      )}
    </div>
  );
};

// Generate a consistent color based on username
function generateColorFromName(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 
    'bg-red-500', 'bg-orange-500', 'bg-amber-500',
    'bg-green-500', 'bg-teal-500', 'bg-cyan-500',
  ];
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Get color based on hash
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default Avatar;
