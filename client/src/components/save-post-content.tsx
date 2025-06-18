import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getQueryFn } from "@/lib/queryClient";
import { Bookmark, Plus } from "lucide-react";

interface List {
  id: number;
  name: string;
  description?: string;
}

interface SavePostContentProps {
  postId: number;
  onClose: () => void;
}

export default function SavePostContent({ postId, onClose }: SavePostContentProps) {
  const [selectedListId, setSelectedListId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's lists
  const { data: lists = [], isLoading } = useQuery<List[]>({
    queryKey: [`/api/lists/user/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  // Save post mutation
  const saveMutation = useMutation({
    mutationFn: async (listId: number) => {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ listId }),
      });

      if (!response.ok) {
        throw new Error('Failed to save post');
      }
    },
    onSuccess: () => {
      toast({
        title: "Post saved",
        description: "Post has been saved to your collection",
        duration: 2000, // Auto-dismiss after 2 seconds
      });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts/list'] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSavePost = () => {
    if (!selectedListId) {
      toast({
        title: "List required",
        description: "Please select a list to save this post",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(parseInt(selectedListId));
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-300">Loading lists...</p>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="p-4 text-center">
        <Bookmark className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-300 mb-4">You don't have any lists yet.</p>
        <p className="text-gray-400 text-sm mb-4">Create lists to organize your saved posts.</p>
        <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <label className="block text-white font-medium mb-2">
          Save to List
        </label>
        <Select value={selectedListId} onValueChange={setSelectedListId}>
          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="Select a list" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {lists.map((list) => (
              <SelectItem 
                key={list.id} 
                value={list.id.toString()}
                className="text-white hover:bg-gray-700"
              >
                {list.name}
                {list.description && (
                  <span className="text-gray-400 text-sm ml-2">
                    - {list.description}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSavePost}
          disabled={!selectedListId || saveMutation.isPending}
          className="flex-1 bg-purple-600 hover:bg-purple-700"
        >
          {saveMutation.isPending ? "Saving..." : "Save Post"}
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}