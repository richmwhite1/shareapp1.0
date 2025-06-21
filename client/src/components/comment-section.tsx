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
      <div className="text-center py-3">
        <p className="text-gray-400 mb-2 text-xs">
          Sign in to join the conversation
        </p>
        <Link href="/auth">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-2">
        <div className="flex space-x-2">
          <Avatar className="w-6 h-6 flex-shrink-0">
            <AvatarImage src={user?.profilePictureUrl || undefined} />
            <AvatarFallback className="text-xs">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={parentId ? "Write a reply..." : "Add a comment..."}
                      className="resize-none bg-gray-800/50 border-gray-700/50 text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-sm"
                      rows={2}
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
                          className={`flex items-center space-x-1 text-xs cursor-pointer transition-colors ${
                            hasFile 
                              ? 'text-green-400 bg-green-900/20 px-2 py-0.5 rounded' 
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Image className="w-3 h-3" />
                          <span>{hasFile ? `Selected` : 'Photo'}</span>
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
                  variant="ghost"
                  size="sm"
                  disabled={mutation.isPending}
                  className="bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white text-xs"
                >
                  <Send className="w-3 h-3 mr-1" />
                  {mutation.isPending ? 'Posting...' : (parentId ? 'Reply' : 'Comment')}
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
    <div className={`${level > 0 ? 'ml-4' : ''}`}>
      <div className="flex space-x-2">
        <Avatar className="w-6 h-6 flex-shrink-0">
          <AvatarImage src={comment.user.profilePictureUrl || undefined} />
          <AvatarFallback className="text-xs">
            {comment.user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-gray-700/30 rounded p-2 border border-gray-700/50">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-gray-300 text-xs">{comment.user.name}</span>
              <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
            </div>
            <p className="text-gray-300 text-xs">{comment.text}</p>
            {comment.imageUrl && (
              <img
                src={comment.imageUrl}
                alt="Comment attachment"
                className="mt-2 max-w-24 rounded shadow-sm"
              />
            )}
          </div>
          
          <div className="mt-1 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-xs text-gray-500 hover:text-gray-300 p-1 h-auto"
            >
              <Reply className="w-3 h-3 mr-1" />
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
      <div className="mt-4 px-4 py-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-300">Comments</span>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex space-x-2 animate-pulse">
              <div className="w-6 h-6 bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="h-3 bg-gray-600 rounded w-1/4 mb-1" />
                  <div className="h-3 bg-gray-600 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 px-4 py-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-300">
          Comments {comments && comments.length > 0 && `(${comments.length})`}
        </span>
      </div>

      <div className="mb-4">
        <CommentForm postId={postId} />
      </div>

      <div className="space-y-3">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-800/20 rounded-md p-3 border border-gray-700/30">
              <CommentThread comment={comment} postId={postId} />
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-4">
            <p className="text-xs">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
