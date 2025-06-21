import { useQuery } from "@tanstack/react-query";
import { List, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface AttachedListsProps {
  postId: number;
}

interface ListData {
  id: number;
  name: string;
  userId: number;
  user?: {
    username: string;
  };
}

export function AttachedLists({ postId }: AttachedListsProps) {
  const [, setLocation] = useLocation();

  const { data: lists, isLoading } = useQuery({
    queryKey: ['/api/posts', postId, 'attached-lists'],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}/attached-lists`);
      if (!response.ok) throw new Error('Failed to fetch attached lists');
      return response.json() as Promise<ListData[]>;
    },
  });

  if (isLoading) {
    return (
      <Card className="mt-4 bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-600 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-600 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lists || lists.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4 bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white text-sm">
          <List className="h-4 w-4" />
          Attached Lists ({lists.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer"
              onClick={() => setLocation(`/list/${list.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pinterest-red/10 rounded-lg">
                  <List className="h-4 w-4 text-pinterest-red" />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">{list.name}</h4>
                  {list.user && (
                    <p className="text-gray-400 text-xs">by @{list.user.username}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                  List
                </Badge>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}