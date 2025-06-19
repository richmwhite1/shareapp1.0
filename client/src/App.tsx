import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth.tsx";
import Header from "@/components/header-simple";
import BottomNav from "@/components/bottom-nav";
import Home from "@/pages/home";
import PostPage from "@/pages/post";
import AuthPage from "@/pages/auth";
import CreatePostPage from "@/pages/create-post-simple";
import ProfilePage from "@/pages/profile";
import CategoryPage from "@/pages/category";
import SearchPage from "@/pages/search";
import ConnectionsPage from "@/pages/friends";
import NotificationsPage from "@/pages/notifications";
import SharedWithMePage from "@/pages/shared-with-me";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard-main";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/post/:id" component={PostPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/create-post" component={CreatePostPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/profile/:id" component={ProfilePage} />
      <Route path="/list/:id" component={CategoryPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/friends" component={ConnectionsPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/shared-with-me" component={SharedWithMePage} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-black w-full">
            <Header />
            <main className="pb-20 w-full"> {/* Add bottom padding for bottom nav */}
              <Router />
            </main>
            <BottomNav />
            <Toaster />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
