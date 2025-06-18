import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getQueryFn } from "@/lib/queryClient";
import { Bookmark, Plus } from "lucide-react";

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface SavePostContentProps {
  postId: number;
  onClose: () => void;
}

export default function SavePostContent({ postId, onClose }: SavePostContentProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: [`/api/categories/user/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  // Save post mutation
  const saveMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ categoryId }),
      });

      if (!response.ok) {
        throw new Error('Failed to save post');
      }
    },
    onSuccess: () => {
      toast({
        title: "Post saved",
        description: "Post has been saved to your collection",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}`] });
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
    if (!selectedCategoryId) {
      toast({
        title: "Category required",
        description: "Please select a category to save this post",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(parseInt(selectedCategoryId));
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-300">Loading categories...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-4 text-center">
        <Bookmark className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-300 mb-4">You don't have any categories yet.</p>
        <p className="text-gray-400 text-sm mb-4">Create categories to organize your saved posts.</p>
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
          Save to Category
        </label>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {categories.map((category) => (
              <SelectItem 
                key={category.id} 
                value={category.id.toString()}
                className="text-white hover:bg-gray-700"
              >
                {category.name}
                {category.description && (
                  <span className="text-gray-400 text-sm ml-2">
                    - {category.description}
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
          disabled={!selectedCategoryId || saveMutation.isPending}
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