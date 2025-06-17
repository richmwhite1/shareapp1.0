import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, X, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  type: string;
  fromUserId?: number;
  postId?: number;
  message: string;
  viewed: boolean;
  createdAt: string;
  fromUser?: {
    id: number;
    username: string;
    name: string;
    profilePictureUrl?: string;
  };
  post?: {
    id: number;
    primaryDescription: string;
  };
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Get notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  // Mark notification as viewed mutation
  const markViewedMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest('POST', `/api/notifications/${notificationId}/view`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Auto-mark notifications as viewed when page loads
  React.useEffect(() => {
    if (notifications.length > 0) {
      const unreadNotifications = notifications.filter(n => !n.viewed);
      unreadNotifications.forEach(notification => {
        markViewedMutation.mutate(notification.id);
      });
    }
  }, [notifications]);

  const handleMarkAsViewed = (notificationId: number) => {
    markViewedMutation.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friendRequest':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'like':
        return <Check className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <Bell className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    if (notification.message) {
      return notification.message;
    }

    switch (notification.type) {
      case 'friend_request':
        return `${notification.fromUser?.name || 'Someone'} sent you a friend request`;
      case 'like':
        return `${notification.fromUser?.name || 'Someone'} liked your post`;
      case 'comment':
        return `${notification.fromUser?.name || 'Someone'} commented on your post`;
      default:
        return 'You have a new notification';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600 dark:text-gray-400">
            Please sign in to view your notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Notifications
          </h1>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No notifications yet. When people interact with your posts or send friend requests, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`${
                    !notification.viewed
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {notification.fromUser ? (
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={notification.fromUser.profilePictureUrl || undefined}
                              alt={notification.fromUser.name}
                            />
                            <AvatarFallback>
                              {notification.fromUser.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getNotificationMessage(notification)}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                          {!notification.viewed && (
                            <Button
                              onClick={() => handleMarkAsViewed(notification.id)}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}