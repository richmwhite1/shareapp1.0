import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus } from "lucide-react";

export default function Header() {
  const { user, signOut, isAuthenticated } = useAuth();
  const [location] = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <h1 className="text-2xl font-bold text-pinterest-red cursor-pointer">
                PinShare
              </h1>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/">
                <a className={`text-gray-700 hover:text-pinterest-red transition-colors ${
                  location === '/' ? 'text-pinterest-red font-medium' : ''
                }`}>
                  Home
                </a>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link href="/create">
                  <Button className="bg-pinterest-red text-white hover:bg-red-700 transition-colors">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-full p-2 transition-colors">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.profilePictureUrl || undefined} />
                        <AvatarFallback>
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-700 hidden sm:block">
                        {user?.name}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <span className="font-medium">{user?.name}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <span className="text-sm text-gray-500">@{user?.username}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/auth">
                <Button className="bg-pinterest-red text-white hover:bg-red-700 transition-colors">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
