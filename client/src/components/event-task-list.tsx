import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import type { PostWithUser } from "@shared/schema";

interface EventTaskListProps {
  post: PostWithUser;
}

interface TaskAssignment {
  taskId: string;
  userId: number;
  userName: string;
  assignedAt: Date;
}

export default function EventTaskList({ post }: EventTaskListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get task assignments
  const { data: taskAssignments = [] } = useQuery<TaskAssignment[]>({
    queryKey: [`/api/posts/${post.id}/task-assignments`],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/task-assignments`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Toggle task assignment mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/posts/${post.id}/tasks/${taskId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle task assignment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/task-assignments`] });
      toast({
        title: "Task updated",
        description: "Task assignment has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!post.isEvent || !post.taskList || !Array.isArray(post.taskList) || post.taskList.length === 0) {
    return null;
  }

  const handleTaskToggle = (taskId: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to sign up for tasks.",
        variant: "destructive",
      });
      return;
    }
    toggleTaskMutation.mutate(taskId);
  };

  const isUserAssignedToTask = (taskId: string) => {
    return taskAssignments.some(assignment => 
      assignment.taskId === taskId && assignment.userId === user?.id
    );
  };

  const getTaskAssignee = (taskId: string) => {
    return taskAssignments.find(assignment => assignment.taskId === taskId);
  };

  return (
    <div className="mt-6 p-6 bg-blue-900/20 border border-blue-700 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="h-5 w-5 text-blue-300" />
        <h3 className="text-lg font-semibold text-blue-300">Event Tasks</h3>
      </div>

      <div className="space-y-3">
        {post.taskList.map((task: any) => {
          const assignee = getTaskAssignee(task.id);
          const isAssigned = !!assignee;
          const isCurrentUserAssigned = isUserAssignedToTask(task.id);

          return (
            <div key={task.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Button
                  onClick={() => handleTaskToggle(task.id)}
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 rounded border-2 ${
                    isCurrentUserAssigned
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-400 hover:border-blue-400'
                  }`}
                  disabled={toggleTaskMutation.isPending || (isAssigned && !isCurrentUserAssigned)}
                >
                  {isCurrentUserAssigned && <CheckSquare className="h-3 w-3" />}
                </Button>
                
                <span className={`text-sm ${isAssigned ? 'text-gray-300' : 'text-white'}`}>
                  {task.text}
                </span>
              </div>

              {isAssigned && (
                <div className="flex items-center gap-2 text-xs text-blue-300">
                  <User className="h-3 w-3" />
                  <span>{assignee.userName}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {taskAssignments.some(assignment => assignment.userId === user?.id) && (
        <div className="mt-4 text-sm text-blue-300">
          You're signed up for {taskAssignments.filter(assignment => assignment.userId === user?.id).length} task(s)
        </div>
      )}
    </div>
  );
}