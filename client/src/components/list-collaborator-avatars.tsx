import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface Collaborator {
  userId: number;
  role: string;
  status: string;
  user: {
    id: number;
    username: string;
    name: string;
    profilePictureUrl: string | null;
  };
}

interface ListCollaboratorAvatarsProps {
  listId: number;
  collaborators?: Collaborator[];
  maxVisible?: number;
}

export default function ListCollaboratorAvatars({ 
  listId, 
  collaborators = [], 
  maxVisible = 3 
}: ListCollaboratorAvatarsProps) {
  const acceptedCollaborators = collaborators.filter(c => c.status === 'accepted');
  
  if (acceptedCollaborators.length === 0) {
    return null;
  }

  const visibleCollaborators = acceptedCollaborators.slice(0, maxVisible);
  const remainingCount = acceptedCollaborators.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visibleCollaborators.map((collaborator) => (
          <Tooltip key={collaborator.userId}>
            <TooltipTrigger>
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarImage src={collaborator.user.profilePictureUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {collaborator.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{collaborator.user.name} ({collaborator.role})</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">
                  +{remainingCount}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{remainingCount} more collaborator{remainingCount > 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        <Tooltip>
          <TooltipTrigger>
            <div className="h-6 w-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center ml-1">
              <Users className="h-3 w-3 text-primary" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Shared list with {acceptedCollaborators.length} collaborator{acceptedCollaborators.length > 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}