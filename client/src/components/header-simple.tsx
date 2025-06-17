import { useAuth } from "@/lib/auth.tsx";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const { user, signOut, isAuthenticated } = useAuth();

  // Fetch unread notifications count
  const { data: unreadCount } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });



  return (
    <header className="bg-black text-white shadow-lg sticky top-0 z-40 w-full">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Love Logo - Acts as Home Button */}
          <Link href="/">
            <h1 className="text-2xl font-bold cursor-pointer" style={{color: '#ba9971'}}>
              Love
            </h1>
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-yellow-400 hover:bg-gray-800 relative p-2">
                      <Bell className="w-5 h-5" />
                      {(unreadCount as any)?.count > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                          {(unreadCount as any).count}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-800 border-gray-700 w-80">
                    <DropdownMenuItem disabled className="text-white font-medium">
                      Notifications
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <Link href="/notifications">
                      <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                        View All Notifications
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Profile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-yellow-400 hover:bg-gray-800 p-1">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.profilePictureUrl || undefined} />
                        <AvatarFallback className="bg-gray-600 text-white">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-800 border-gray-700">
                    <DropdownMenuItem disabled className="text-white font-medium">
                      {user?.name}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <Link href={`/profile/${user?.id}`}>
                      <DropdownMenuItem className="text-white hover:bg-gray-700 cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem 
                      onClick={() => signOut()}
                      className="text-white hover:bg-gray-700 cursor-pointer"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild className="bg-pinterest-red hover:bg-red-700">
                <Link href="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}