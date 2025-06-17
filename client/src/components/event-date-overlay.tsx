import { Calendar } from "lucide-react";

interface EventDateOverlayProps {
  eventDate: string;
  isRecurring?: boolean;
  recurringType?: string;
  className?: string;
}

export default function EventDateOverlay({ 
  eventDate, 
  isRecurring, 
  recurringType, 
  className = "" 
}: EventDateOverlayProps) {
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else if (diffDays < 365) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`absolute top-3 left-3 z-10 ${className}`}>
      <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg border border-purple-400/30">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-300" />
          <div className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <span>{formatEventDate(eventDate)}</span>
              {isRecurring && (
                <span className="text-xs bg-purple-600 px-1.5 py-0.5 rounded text-white">
                  {recurringType?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-300 mt-0.5">
              {formatTime(eventDate)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}