import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import AuricField from '@/components/auric-field';

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
}

export function Stories({ onSelectUser, viewedUsers = new Set(), onMarkAsViewed }: StoriesProps) {
  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ['/api/connection-stories'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleStoryClick = (story: Story) => {
    // Mark as viewed and switch to user's feed
    onMarkAsViewed?.(story.user.id);
    onSelectUser?.(story.user.id);
  };



  if (isLoading) {
    return (
      <div className="flex space-x-4 p-4 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  // Filter out viewed users
  const unviewedStories = stories.filter(story => !viewedUsers.has(story.user.id));

  if (unviewedStories.length === 0) {
    return null;
  }

  return (
    <>
      {/* Stories Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {unviewedStories.map((story: Story) => (
            <div
              key={story.user.id}
              className="flex-shrink-0 cursor-pointer"
              onClick={() => handleStoryClick(story)}
            >
              <div className="flex flex-col items-center space-y-1">
                <div className="p-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <AuricField profileId={story.user.id} intensity={0.3}>
                    <Avatar className="w-16 h-16 border-2 border-white dark:border-gray-900">
                      <AvatarImage 
                        src={story.user.profilePictureUrl || undefined} 
                        alt={story.user.name}
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                        {story.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </AuricField>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[70px] truncate">
                  {story.user.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}