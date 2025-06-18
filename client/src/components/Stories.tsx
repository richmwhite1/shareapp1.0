import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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

export function Stories() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);

  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ['/api/connection-stories'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const openStory = (story: Story) => {
    setSelectedStory(story);
    setCurrentPostIndex(0);
  };

  const closeStory = () => {
    setSelectedStory(null);
    setCurrentPostIndex(0);
  };

  const nextPost = () => {
    if (selectedStory && currentPostIndex < selectedStory.posts.length - 1) {
      setCurrentPostIndex(currentPostIndex + 1);
    } else {
      // Move to next story
      const currentStoryIndex = stories.findIndex(s => s.user.id === selectedStory?.user.id);
      if (currentStoryIndex < stories.length - 1) {
        setSelectedStory(stories[currentStoryIndex + 1]);
        setCurrentPostIndex(0);
      } else {
        closeStory();
      }
    }
  };

  const prevPost = () => {
    if (currentPostIndex > 0) {
      setCurrentPostIndex(currentPostIndex - 1);
    } else {
      // Move to previous story
      const currentStoryIndex = stories.findIndex(s => s.user.id === selectedStory?.user.id);
      if (currentStoryIndex > 0) {
        const prevStory = stories[currentStoryIndex - 1];
        setSelectedStory(prevStory);
        setCurrentPostIndex(prevStory.posts.length - 1);
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
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

  if (stories.length === 0) {
    return null;
  }

  return (
    <>
      {/* Stories Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {stories.map((story: Story) => (
            <div
              key={story.user.id}
              className="flex-shrink-0 cursor-pointer"
              onClick={() => openStory(story)}
            >
              <div className="flex flex-col items-center space-y-1">
                <div className={`p-0.5 rounded-full ${story.hasUnseen ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-300'}`}>
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

      {/* Story Viewer Dialog */}
      <Dialog open={!!selectedStory} onOpenChange={closeStory}>
        <DialogContent className="max-w-md p-0 gap-0 bg-black border-none">
          {selectedStory && (
            <div className="relative h-[80vh] flex flex-col">
              {/* Progress bars */}
              <div className="flex space-x-1 p-2">
                {selectedStory.posts.map((_, index) => (
                  <div
                    key={index}
                    className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full bg-white transition-all duration-300 ${
                        index < currentPostIndex ? 'w-full' : 
                        index === currentPostIndex ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="flex items-center justify-between p-4 text-white">
                <div className="flex items-center space-x-2">
                  <AuricField profileId={selectedStory.user.id} intensity={0.2}>
                    <Avatar className="w-8 h-8">
                      <AvatarImage 
                        src={selectedStory.user.profilePictureUrl || undefined} 
                        alt={selectedStory.user.name}
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm">
                        {selectedStory.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </AuricField>
                  <div>
                    <p className="font-medium text-sm">{selectedStory.user.name}</p>
                    <p className="text-xs text-gray-300">
                      {formatTimeAgo(selectedStory.posts[currentPostIndex].createdAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeStory}
                  className="text-white hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 relative overflow-hidden">
                {selectedStory.posts[currentPostIndex].primaryPhotoUrl ? (
                  <img
                    src={selectedStory.posts[currentPostIndex].primaryPhotoUrl}
                    alt="Story content"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-8">
                    <p className="text-white text-center text-lg leading-relaxed">
                      {selectedStory.posts[currentPostIndex].primaryDescription}
                    </p>
                  </div>
                )}

                {/* Navigation areas */}
                <button
                  className="absolute left-0 top-0 w-1/3 h-full z-10"
                  onClick={prevPost}
                />
                <button
                  className="absolute right-0 top-0 w-2/3 h-full z-10"
                  onClick={nextPost}
                />
              </div>

              {/* Footer */}
              <div className="p-4 text-white">
                <p className="text-sm">
                  {selectedStory.posts[currentPostIndex].primaryDescription}
                </p>
                {selectedStory.posts[currentPostIndex].list && (
                  <p className="text-xs text-gray-300 mt-1">
                    in {selectedStory.posts[currentPostIndex].list?.name}
                  </p>
                )}
              </div>

              {/* Navigation buttons (visible) */}
              <div className="absolute inset-y-0 left-4 flex items-center">
                {(currentPostIndex > 0 || stories.findIndex(s => s.user.id === selectedStory.user.id) > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevPost}
                    className="text-white hover:bg-gray-800 opacity-50 hover:opacity-100"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
              </div>
              <div className="absolute inset-y-0 right-4 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextPost}
                  className="text-white hover:bg-gray-800 opacity-50 hover:opacity-100"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}