import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Eye, Folder, User, Lock, Users, Globe, Plus, Settings, MoreHorizontal } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";


export default function Profile() {
  const { userId: paramUserId } = useParams();
  const profileUserId = paramUserId ? parseInt(paramUserId) : 8; // Default to user 8 if no param
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [pressedList, setPressedList] = useState<number | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'connections' | 'private'>('public');
  const [showPrivacyControls, setShowPrivacyControls] = useState(false);

  // Check if this is the current user's own profile
  const isOwnProfile = profileUserId === 8; // Current user ID

  // Fetch user data
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: [`/api/users/${profileUserId}`],
    enabled: !!profileUserId
  });



  // Fetch user's posts
  const { data: posts } = useQuery({
    queryKey: ['/api/posts/user', profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const response = await fetch(`/api/posts/user/${profileUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch user's lists
  const { data: lists } = useQuery({
    queryKey: ['/api/lists/user', profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const response = await fetch(`/api/lists/user/${profileUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch total shares count
  const { data: totalShares = 0 } = useQuery({
    queryKey: ['/api/user/total-shares', profileUserId],
    enabled: !!profileUserId
  });

  // Fetch user's friends
  const { data: userFriends } = useQuery({
    queryKey: ['/api/friends/user', profileUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const response = await fetch(`/api/friends/user/${profileUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch current user's default privacy (only for own profile)
  const { data: privacyData } = useQuery({
    queryKey: ['/api/user', profileUserId, 'privacy'],
    enabled: isOwnProfile
  });

  useEffect(() => {
    if (privacyData && typeof privacyData === 'object' && privacyData !== null && 'defaultPrivacy' in privacyData) {
      setDefaultPrivacy((privacyData as any).defaultPrivacy);
    }
  }, [privacyData]);

  const totalPosts = Array.isArray(posts) ? posts.length : 0;

  const updatePrivacyMutation = useMutation({
    mutationFn: async (privacy: 'public' | 'connections' | 'private') => {
      const response = await fetch(`/api/user/${profileUserId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPrivacy: privacy })
      });
      if (!response.ok) throw new Error('Failed to update privacy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user', profileUserId, 'privacy'] });
      toast({ title: "Privacy updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update privacy", variant: "destructive" });
    }
  });

  const handlePrivacyToggle = () => {
    const newPrivacy = defaultPrivacy === 'public' ? 'private' : 'public';
    setDefaultPrivacy(newPrivacy);
    updatePrivacyMutation.mutate(newPrivacy);
  };

  const handleMouseDown = (listId: number) => {
    setPressedList(listId);
    const timer = setTimeout(() => {
      setSelectedList(listId);
      setPressedList(null);
    }, 500);
    setPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setPressedList(null);
  };

  const handleMouseLeave = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setPressedList(null);
  };

  if (userLoading || !userData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <h1 className="text-xl font-bold">{(userData as any)?.name || (userData as any)?.username}</h1>
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrivacyControls(!showPrivacyControls)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Profile Picture - Large Square Tile */}
        <div className="px-6 py-6">
          <div className="mb-6">
            <div className="w-full aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-800">
              <img 
                src={(userData as any)?.profilePictureUrl || ""} 
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-full h-full flex items-center justify-center bg-gray-800 text-white text-6xl font-bold">
                {(userData as any)?.name?.charAt(0) || (userData as any)?.username?.charAt(0)}
              </div>
            </div>
            
            <div className="text-center mt-4">
              <h2 className="text-xl font-bold">{(userData as any)?.name || (userData as any)?.username}</h2>
              {(userData as any)?.name && (
                <p className="text-gray-400">@{(userData as any)?.username}</p>
              )}
              {(userData as any)?.bio && (
                <p className="text-sm text-gray-300 mt-1">{(userData as any)?.bio}</p>
              )}
            </div>
          </div>

          {/* Simple Privacy Toggle - Only for own profile */}
          {isOwnProfile && (
            <div className="flex items-center justify-between py-3 px-4 bg-gray-900 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                {defaultPrivacy === 'public' ? (
                  <Globe className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {defaultPrivacy === 'public' ? 'Public Profile' : 'Private Profile'}
                </span>
              </div>
              <Switch
                checked={defaultPrivacy === 'public'}
                onCheckedChange={handlePrivacyToggle}
              />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 py-3 px-4 bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{totalPosts}</div>
              <div className="text-xs text-gray-400">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{Array.isArray(lists) ? lists.length : 0}</div>
              <div className="text-xs text-gray-400">Lists</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{Array.isArray(userFriends) ? userFriends.length : 0}</div>
              <div className="text-xs text-gray-400">Friends</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{totalShares || 0}</div>
              <div className="text-xs text-gray-400">Shares</div>
            </div>
          </div>
        </div>



        {/* Lists Section */}
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Lists</h3>
            {isOwnProfile && (
              <Link href="/create-list">
                <Button size="sm" className="bg-pinterest-red hover:bg-pinterest-red/90">
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {Array.isArray(lists) ? lists.map((list: any) => {
              const recentPost = list.posts?.[0];
              const hasImage = recentPost?.primaryPhotoUrl || recentPost?.thumbnailUrl;
              
              return (
                <Link key={list.id} href={`/list/${list.id}`}>
                  <div className="bg-gray-900 rounded-xl p-2 hover:bg-black transition-colors">
                    <div className="w-full aspect-square rounded-lg mb-2 overflow-hidden relative">
                      {hasImage ? (
                        <img 
                          src={recentPost.primaryPhotoUrl || recentPost.thumbnailUrl} 
                          alt={list.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                          <Folder className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                      
                      {/* Privacy Indicator */}
                      {list.privacyLevel !== 'public' && (
                        <div className="absolute top-1 right-1">
                          <div className="bg-black/80 text-white px-1.5 py-0.5 rounded text-xs">
                            {list.privacyLevel === 'private' ? 'Private' : 'Friends'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Simple Toggle for Privacy */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-medium truncate flex-1">
                        {list.name}
                      </span>
                      {isOwnProfile && (
                        <Switch
                          checked={list.privacyLevel === 'public'}
                          className="ml-2 scale-75"
                        />
                      )}
                    </div>
                  </div>
                </Link>
              );
            }) : null}
          </div>
        </div>

        {/* Friends Section */}
        {Array.isArray(userFriends) && userFriends.length > 0 && (
          <div className="px-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Friends</h3>
            <div className="grid grid-cols-4 gap-3">
              {userFriends.slice(0, 8).map((friend: any) => (
                <Link key={friend.id} href={`/profile/${friend.id}`}>
                  <div className="flex flex-col items-center p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 mb-2">
                      <img 
                        src={friend.profilePictureUrl || ""} 
                        alt={friend.name || friend.username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-full h-full flex items-center justify-center bg-gray-800 text-white text-lg font-bold">
                        {friend.name?.charAt(0) || friend.username?.charAt(0)}
                      </div>
                    </div>
                    <span className="text-xs text-white font-medium truncate w-full text-center">
                      {friend.name || friend.username}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        <div className="h-20"></div>
      </div>
    </div>
  );
}