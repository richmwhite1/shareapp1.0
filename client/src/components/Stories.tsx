import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import AuricField from '@/components/auric-field';
import { useEffect } from 'react';

interface Story {
  user: {
    id: number;
    username: string;
    name: string;
    profilePictureUrl?: string;
  };
  posts: Array<{
    id: number;
    primaryPhotoUrl?: string;
    primaryDescription: string;
    createdAt: string;
    user: {
      id: number;
      username: string;
      name: string;
      profilePictureUrl?: string;
    };
    list?: {
      id: number;
      name: string;
    };
  }>;
  hasUnseen: boolean;
}

interface StoriesProps {
  onSelectUser?: (userId: number) => void;
  viewedUsers?: Set<number>;
  onMarkAsViewed?: (userId: number) => void;
  onAllStoriesViewed?: () => void;
}

export function Stories({ onSelectUser, viewedUsers = new Set(), onMarkAsViewed, onAllStoriesViewed }: StoriesProps) {
  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ['/api/connection-stories'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Deduplicate stories by user ID and filter out viewed users
  const uniqueStories = stories.reduce((acc: Story[], story) => {
    if (!acc.find(s => s.user.id === story.user.id)) {
      acc.push(story);
    }
    return acc;
  }, []);
  
  const unviewedStories = uniqueStories.filter(story => !viewedUsers.has(story.user.id));

  // Call callback when all stories are viewed
  useEffect(() => {
    if (unviewedStories.length === 0 && stories.length > 0) {
      onAllStoriesViewed?.();
    }
  }, [unviewedStories.length, stories.length, onAllStoriesViewed]);

  const handleStoryClick = (story: Story) => {
    onSelectUser?.(story.user.id);
    onMarkAsViewed?.(story.user.id);
  };

  if (isLoading) {
    return (
      <div className="bg-black border-b border-gray-700 p-4">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide stories-scroll">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0">
              <div className="flex flex-col items-center space-y-1">
                <div className="w-16 h-16 bg-gray-800 rounded-full animate-pulse" />
                <div className="w-12 h-3 bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Don't render anything if there are no unviewed stories
  if (unviewedStories.length === 0) {
    return null;
  }

  return (
    <>
      {/* Stories Bar */}
      <div className="bg-black border-b border-gray-700 p-4">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide stories-scroll">
          {unviewedStories.map((story: Story) => (
            <div
              key={story.user.id}
              className="flex-shrink-0 cursor-pointer"
              onClick={() => handleStoryClick(story)}
            >
              <div className="flex flex-col items-center space-y-1">
                <div className="p-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <AuricField profileId={story.user.id} intensity={0.3}>
                    <Avatar className="w-16 h-16 border-2 border-black">
                      <AvatarImage 
                        src={story.user.profilePictureUrl} 
                        alt={story.user.name}
                      />
                      <AvatarFallback className="bg-gray-700 text-white text-sm">
                        {story.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </AuricField>
                </div>
                <span className="text-xs text-white text-center w-16 truncate">
                  {story.user.username}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}