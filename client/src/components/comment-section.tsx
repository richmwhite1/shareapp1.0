import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Image, Reply, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { getAuthToken } from "@/lib/auth";
import { createCommentSchema, type CommentWithUser, type CreateCommentData } from "@shared/schema";
import { z } from "zod";

interface CommentSectionProps {
  postId: number;
}

interface CommentFormData extends CreateCommentData {
  image?: FileList;
}

function CommentForm({ postId, parentId, onSuccess, onCancel }: {
  postId: number;
  parentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const commentFormSchema = z.object({
    text: z.string().min(1, "Comment text is required"),
    parentId: z.number().optional(),
    image: z.any().optional(),
  });

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      text: "",
      parentId,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CommentFormData) => {
      console.log('Comment form data:', data);
      console.log('Form errors:', form.formState.errors);
      
      const formData = new FormData();
      formData.append('text', data.text);
      if (data.parentId) {
        formData.append('parentId', data.parentId.toString());
      }
      if (data.image && data.image.length > 0) {
        console.log('Adding image to FormData:', data.image[0]);
        formData.append('image', data.image[0]);
      } else {
        console.log('No image to add:', data.image);
      }

      console.log('FormData contents:', Array.from(formData.entries()));

      const token = getAuthToken();
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Comment submission error:', errorData);
        throw new Error(errorData.message || 'Failed to post comment');
      }

      return response.json();
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to post comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="text-center py-6">
        <p className="text-pinterest-gray mb-4">
          Sign in to join the conversation
        </p>
        <Link href="/auth">
          <Button className="bg-pinterest-red text-white hover:bg-red-700">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="flex space-x-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={user?.profilePictureUrl || undefined} />
            <AvatarFallback>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={parentId ? "Write a reply..." : "Add a comment..."}
                      className="resize-none bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { onChange, value, ...field } }) => {
                    const fileInputId = `comment-file-${postId}-${parentId || 'root'}`;
                    const hasFile = value && value.length > 0;
                    return (
                      <FormItem>
                        <Label 
                          htmlFor={fileInputId}
                          className={`flex items-center space-x-2 text-sm cursor-pointer transition-colors ${
                            hasFile 
                              ? 'text-pinterest-red bg-red-50 px-2 py-1 rounded' 
                              : 'text-pinterest-gray hover:text-pinterest-red'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Image className="w-4 h-4" />
                          <span>{hasFile ? `Photo selected (${value[0]?.name})` : 'Add photo'}</span>
                        </Label>
                        <FormControl>
                          <Input
                            id={fileInputId}
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => {
                              console.log('File input changed:', e.target.files);
                              onChange(e.target.files);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <span className="text-xs text-gray-400">Max 2MB</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  className="bg-pinterest-red text-white hover:bg-red-700"
                  size="sm"
                  disabled={mutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {mutation.isPending ? 'Posting...' : (parentId ? 'Reply' : 'Post Comment')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

function CommentThread({ comment, postId, level = 0 }: {
  comment: CommentWithUser;
  postId: number;
  level?: number;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  return (
    <div className={`${level > 0 ? 'ml-6' : ''}`}>
      <div className="flex space-x-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={comment.user.profilePictureUrl || undefined} />
          <AvatarFallback>
            {comment.user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-white">{comment.user.name}</span>
              <span className="text-sm text-gray-400">{formatDate(comment.createdAt)}</span>
            </div>
            <p className="text-gray-200">{comment.text}</p>
            {comment.imageUrl && (
              <img
                src={comment.imageUrl}
                alt="Comment attachment"
                className="mt-3 max-w-xs rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              />
            )}
          </div>
          
          <div className="mt-3 flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-sm text-pinterest-gray hover:text-pinterest-red transition-colors"
            >
              <Reply className="w-4 h-4 mr-1" />
              Reply
            </Button>
          </div>

          {showReplyForm && (
            <div className="mt-4">
              <CommentForm
                postId={postId}
                parentId={comment.id}
                onSuccess={() => setShowReplyForm(false)}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { data: comments, isLoading } = useQuery({
    queryKey: ['/api/posts', postId, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json() as Promise<CommentWithUser[]>;
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-black rounded-2xl border-gray-800 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-white">Comments</CardTitle>
        </CardHeader>
        <CardContent className="bg-black">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-800 rounded-full" />
                <div className="flex-1">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="h-4 bg-gray-700 rounded w-1/4 mb-2" />
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black rounded-2xl border-gray-800 overflow-hidden">
      <CardHeader className="border-b border-gray-800 bg-black">
        <CardTitle className="text-xl font-semibold text-white">
          Comments {comments && comments.length > 0 && `(${comments.length})`}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 border-b border-gray-800 bg-black">
        <CommentForm postId={postId} />
      </CardContent>

      <CardContent className="p-0 bg-black">
        {comments && comments.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {comments.map((comment) => (
              <div key={comment.id} className="p-6 bg-black">
                <CommentThread comment={comment} postId={postId} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400 bg-black">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
