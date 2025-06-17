import { Link, useLocation } from "wouter";
import { Home, Hash, Plus, Users, User } from "lucide-react";
import { useAuth } from "@/lib/auth.tsx";

export default function BottomNav() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      active: location === "/"
    },
    {
      icon: Hash,
      label: "Search",
      href: "/search",
      active: location === "/search"
    },
    {
      icon: Plus,
      label: "Create",
      href: "/create-post",
      active: location === "/create-post"
    },
    {
      icon: Users,
      label: "Friends",
      href: "/friends",
      active: location === "/friends"
    },
    {
      icon: User,
      label: "Profile",
      href: `/profile/${user?.id}`,
      active: location === `/profile/${user?.id}`
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50 w-full">
      <div className="w-full">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center p-2 ${
                  item.active 
                    ? 'text-yellow-400' 
                    : 'text-gray-400 hover:text-white'
                }`}>
                  <Icon className="w-6 h-6" />
                  <span className="text-xs mt-1">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}