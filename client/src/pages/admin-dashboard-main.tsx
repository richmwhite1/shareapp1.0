import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Users, 
  FileText, 
  List, 
  Activity, 
  AlertTriangle, 
  Shield, 
  Settings, 
  Search,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Database,
  LogOut,
  Eye,
  Filter,
  Star,
  Award,
  Zap,
  Crown,
  ExternalLink,
  Link,
  RefreshCw,
  Copy,
  BarChart3,
  Download,
  ArrowUpDown,
  Share2,
  MousePointer,
  User
} from "lucide-react";

interface AdminMetrics {
  totalUsers: number;
  totalPosts: number;
  totalLists: number;
  activeUsers24h: number;
  flaggedContent: number;
  pendingReviews: number;
  systemHealth: string;
  totalConnections: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgPostsPerUser: number;
  avgListsPerUser: number;
  topHashtags: Array<{name: string, count: number}>;
  recentActivity: Array<{type: string, count: number, date: string}>;
  userEngagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgSessionDuration: number;
  };
  contentMetrics: {
    postsToday: number;
    listsToday: number;
    viewsToday: number;
    likesToday: number;
  };
  performanceMetrics: {
    averageLoadTime: number;
    errorRate: number;
    uptime: number;
  };
}

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  postCount: number;
  listCount: number;
}

interface UserMetrics {
  id: number;
  username: string;
  name: string;
  auraRating: number;
  totalPoints: number;
  auraAmplifier: number;
  cosmicScore: number;
  postPoints: number;
  engagementPoints: number;
  referralPoints: number;
  postCount: number;
  likeCount: number;
  shareCount: number;
  repostCount: number;
  tagCount: number;
  saveCount: number;
  referralCount: number;
  createdAt: string;
}

interface UrlAnalytics {
  url: string;
  clickCount: number;
  postCount: number;
  postIds: number[];
  mapping?: {
    id: number;
    originalUrl: string;
    currentUrl: string;
    discountCode?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface ContentReviewItem {
  id: number;
  contentType: string;
  contentId: number;
  priority: string;
  reason: string;
  flagCount: number;
  status: string;
  createdAt: string;
  content?: any;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFilter, setUserFilter] = useState("all");
  const [contentFilter, setContentFilter] = useState("all");
  const [metricsSearchTerm, setMetricsSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("cosmicScore");
  const [sortOrder, setSortOrder] = useState("desc");
  const [minCosmicScore, setMinCosmicScore] = useState("");
  const [maxCosmicScore, setMaxCosmicScore] = useState("");
  
  // URL management state
  const [urlSearchTerm, setUrlSearchTerm] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<UrlAnalytics | null>(null);
  const [hotSwapUrl, setHotSwapUrl] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [urlSortBy, setUrlSortBy] = useState<'popularity' | 'clicks' | 'posts' | 'domain'>('popularity');
  
  // Post analysis state
  const [postSearchTerm, setPostSearchTerm] = useState("");
  const [postSortBy, setPostSortBy] = useState<'views' | 'shares' | 'clicks' | 'aura' | 'hashtags'>('views');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [promoteHashtag, setPromoteHashtag] = useState("");
  const [promoteViews, setPromoteViews] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check admin authentication
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setLocation('/admin/login');
    }
  }, [setLocation]);

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      setLocation('/admin/login');
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error('Request failed');
    }

    return response.json();
  };

  // Dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<AdminMetrics>({
    queryKey: ['/api/admin/metrics'],
    queryFn: () => fetchWithAuth('/api/admin/metrics'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Users data
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', userFilter, searchTerm],
    queryFn: () => fetchWithAuth(`/api/admin/users?filter=${userFilter}&search=${encodeURIComponent(searchTerm)}`),
    enabled: !!searchTerm || userFilter !== 'all',
  });

  // Content review queue
  const { data: reviewQueue = [], isLoading: reviewLoading } = useQuery<ContentReviewItem[]>({
    queryKey: ['/api/admin/review-queue', contentFilter],
    queryFn: () => fetchWithAuth(`/api/admin/review-queue?filter=${contentFilter}`),
  });

  // User metrics data with search and sorting
  const { data: userMetrics = [], isLoading: userMetricsLoading } = useQuery<UserMetrics[]>({
    queryKey: ['/api/admin/user-metrics', metricsSearchTerm, sortBy, sortOrder, minCosmicScore, maxCosmicScore],
    queryFn: () => {
      const params = new URLSearchParams();
      if (metricsSearchTerm) params.append('search', metricsSearchTerm);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (minCosmicScore) params.append('minCosmicScore', minCosmicScore);
      if (maxCosmicScore) params.append('maxCosmicScore', maxCosmicScore);
      return fetchWithAuth(`/api/admin/user-metrics?${params.toString()}`);
    },
  });

  // URL analytics data
  const { data: urlAnalytics = [], isLoading: urlAnalyticsLoading } = useQuery<UrlAnalytics[]>({
    queryKey: ['/api/admin/url-analytics', urlSearchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (urlSearchTerm) params.append('search', urlSearchTerm);
      return fetchWithAuth(`/api/admin/url-analytics?${params.toString()}`);
    },
  });

  // Post analytics data
  const { data: postAnalytics = [], isLoading: postAnalyticsLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/post-analytics', postSearchTerm, postSortBy],
    queryFn: () => {
      const params = new URLSearchParams();
      if (postSearchTerm) params.append('search', postSearchTerm);
      if (postSortBy) params.append('sortBy', postSortBy);
      return fetchWithAuth(`/api/admin/post-analytics?${params.toString()}`);
    },
  });

  // User actions
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      return fetchWithAuth(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/metrics'] });
      toast({ title: "User banned successfully" });
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to ban user", variant: "destructive" });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return fetchWithAuth(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/metrics'] });
      toast({ title: "User unbanned successfully" });
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to unban user", variant: "destructive" });
    },
  });

  // Content moderation actions
  const moderateContentMutation = useMutation({
    mutationFn: async ({ itemId, action, reason }: { itemId: number; action: string; reason: string }) => {
      return fetchWithAuth(`/api/admin/review-queue/${itemId}`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/metrics'] });
      toast({ title: "Content moderated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to moderate content", variant: "destructive" });
    },
  });

  // URL management mutations
  const hotSwapUrlMutation = useMutation({
    mutationFn: async ({ originalUrl, newUrl, discountCode }: { originalUrl: string; newUrl: string; discountCode?: string }) => {
      return fetchWithAuth(`/api/admin/urls/hot-swap`, {
        method: 'POST',
        body: JSON.stringify({ originalUrl, newUrl, discountCode }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/url-analytics'] });
      toast({ title: "URL hot swap completed successfully" });
      setHotSwapUrl('');
      setDiscountCode('');
      setSelectedUrl(null);
    },
    onError: () => {
      toast({ title: "Failed to perform URL hot swap", variant: "destructive" });
    },
  });

  const bulkDiscountMutation = useMutation({
    mutationFn: async ({ urls, discountCode }: { urls: string[]; discountCode: string }) => {
      return fetchWithAuth(`/api/admin/urls/bulk-discount`, {
        method: 'POST',
        body: JSON.stringify({ urls, discountCode }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/url-analytics'] });
      toast({ title: "Bulk discount codes applied successfully" });
      setDiscountCode('');
    },
    onError: () => {
      toast({ title: "Failed to apply bulk discount codes", variant: "destructive" });
    },
  });

  // Post promotion mutation
  const promotePostMutation = useMutation({
    mutationFn: async ({ postId, hashtag, views }: { postId: number; hashtag: string; views: number }) => {
      return fetchWithAuth(`/api/admin/posts/${postId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ hashtag, views }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/post-analytics'] });
      toast({ title: "Post promoted successfully" });
      setPromoteHashtag('');
      setPromoteViews('');
      setSelectedPost(null);
    },
    onError: () => {
      toast({ title: "Failed to promote post", variant: "destructive" });
    },
  });

  // CSV export functionality
  const exportToCSV = () => {
    if (urlAnalytics.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    try {
      const csvData = sortedUrlAnalytics.map(url => ({
        URL: url.url,
        'Click Count': url.clickCount,
        'Post Count': url.postCount,
        'Popularity Score': url.clickCount + (url.postCount * 2),
        'Post IDs': url.postIds.join(';'),
        'Domain': new URL(url.url).hostname,
        'Is Mapped': url.mapping ? 'Yes' : 'No',
        'Current URL': url.mapping?.currentUrl || '',
        'Discount Code': url.mapping?.discountCode || '',
        'Export Date': new Date().toISOString().split('T')[0]
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `url_analytics_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "CSV exported successfully" });
    } catch (error) {
      toast({ title: "Failed to export CSV", variant: "destructive" });
    }
  };

  // Sort URLs by different criteria
  const sortedUrlAnalytics = [...urlAnalytics].sort((a, b) => {
    switch (urlSortBy) {
      case 'popularity':
        const popularityA = a.clickCount + (a.postCount * 2);
        const popularityB = b.clickCount + (b.postCount * 2);
        return popularityB - popularityA;
      case 'clicks':
        return b.clickCount - a.clickCount;
      case 'posts':
        return b.postCount - a.postCount;
      case 'domain':
        const domainA = new URL(a.url).hostname;
        const domainB = new URL(b.url).hostname;
        return domainA.localeCompare(domainB);
      default:
        return 0;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setLocation('/admin/login');
  };

  const getHealthBadgeVariant = (health: string) => {
    switch (health) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'warning': return 'outline';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'outline';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'secondary';
    }
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-slate-400">Share Platform Administration</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="border-slate-700">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Total Users</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metrics?.totalUsers || 0}</div>
              <p className="text-xs text-slate-400 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{metrics?.userGrowth || 0}% this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Content Items</CardTitle>
              <FileText className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{(metrics?.totalPosts || 0) + (metrics?.totalLists || 0)}</div>
              <p className="text-xs text-slate-400">
                {metrics?.totalPosts || 0} posts, {metrics?.totalLists || 0} lists
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Active Users (24h)</CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metrics?.activeUsers24h || 0}</div>
              <p className="text-xs text-slate-400">
                {Math.round(((metrics?.activeUsers24h || 0) / (metrics?.totalUsers || 1)) * 100)}% of total users
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">System Health</CardTitle>
              <Database className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant={getHealthBadgeVariant(metrics?.systemHealth || 'good')}>
                  {metrics?.systemHealth || 'good'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {metrics?.flaggedContent || 0} items need review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-900 border border-slate-800">
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-600">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="sharesies" className="data-[state=active]:bg-purple-600">
              <Star className="h-4 w-4 mr-2" />
              Sharesies
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-purple-600">
              <FileText className="h-4 w-4 mr-2" />
              Content Review
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="urls" className="data-[state=active]:bg-purple-600">
              <ExternalLink className="h-4 w-4 mr-2" />
              URLs
            </TabsTrigger>
            <TabsTrigger value="posts" className="data-[state=active]:bg-purple-600">
              <FileText className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription className="text-slate-400">
                  Search, manage, and moderate platform users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search users by username or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-48 bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="active">Active Users</SelectItem>
                      <SelectItem value="banned">Banned Users</SelectItem>
                      <SelectItem value="recent">Recent Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-slate-400">Loading users...</p>
                  </div>
                ) : users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-300">User</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Content</TableHead>
                        <TableHead className="text-slate-300">Joined</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-slate-800">
                          <TableCell>
                            <div>
                              <div className="font-medium text-white">{user.name}</div>
                              <div className="text-sm text-slate-400">@{user.username}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "destructive"}>
                              {user.isActive ? "Active" : "Banned"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {user.postCount} posts, {user.listCount} lists
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                  className="border-slate-700"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Manage
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-900 border-slate-800">
                                <DialogHeader>
                                  <DialogTitle className="text-white">Manage User: {user.name}</DialogTitle>
                                  <DialogDescription className="text-slate-400">
                                    User management and moderation actions
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-slate-300">Username</p>
                                      <p className="text-sm text-slate-400">@{user.username}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-300">Status</p>
                                      <Badge variant={user.isActive ? "default" : "destructive"}>
                                        {user.isActive ? "Active" : "Banned"}
                                      </Badge>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-300">Posts</p>
                                      <p className="text-sm text-slate-400">{user.postCount}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-300">Lists</p>
                                      <p className="text-sm text-slate-400">{user.listCount}</p>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    {user.isActive ? (
                                      <Button 
                                        variant="destructive" 
                                        onClick={() => banUserMutation.mutate({ 
                                          userId: user.id, 
                                          reason: "Admin action" 
                                        })}
                                        disabled={banUserMutation.isPending}
                                      >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Ban User
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="default"
                                        onClick={() => unbanUserMutation.mutate(user.id)}
                                        disabled={unbanUserMutation.isPending}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Unban User
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No users found. Try adjusting your search or filter.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sharesies - Point System Metrics */}
          <TabsContent value="sharesies" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-400" />
                  Sharesies Point System Dashboard
                </CardTitle>
                <CardDescription>
                  Comprehensive user metrics, point distribution, aura ratings, and cosmic scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      value={metricsSearchTerm}
                      onChange={(e) => setMetricsSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cosmicScore">Cosmic Score</SelectItem>
                      <SelectItem value="totalPoints">Total Points</SelectItem>
                      <SelectItem value="auraRating">Aura Rating</SelectItem>
                      <SelectItem value="postCount">Post Count</SelectItem>
                      <SelectItem value="engagementPoints">Engagement</SelectItem>
                      <SelectItem value="referralCount">Referrals</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Highest First</SelectItem>
                      <SelectItem value="asc">Lowest First</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex space-x-2">
                    <Input
                      placeholder="Min Score"
                      value={minCosmicScore}
                      onChange={(e) => setMinCosmicScore(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      type="number"
                    />
                    <Input
                      placeholder="Max Score"
                      value={maxCosmicScore}
                      onChange={(e) => setMaxCosmicScore(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      type="number"
                    />
                  </div>
                </div>

                {/* Point System Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Total Users</p>
                          <p className="text-2xl font-bold text-white">{userMetrics.length}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Avg Cosmic Score</p>
                          <p className="text-2xl font-bold text-white">
                            {userMetrics.length > 0 ? Math.round(userMetrics.reduce((sum, user) => sum + user.cosmicScore, 0) / userMetrics.length) : 0}
                          </p>
                        </div>
                        <Crown className="h-8 w-8 text-yellow-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Top Performer</p>
                          <p className="text-lg font-bold text-white">
                            {userMetrics.length > 0 ? userMetrics[0]?.username || 'N/A' : 'N/A'}
                          </p>
                        </div>
                        <Award className="h-8 w-8 text-purple-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* User Metrics Table */}
                {userMetricsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-slate-400">Loading user metrics...</p>
                  </div>
                ) : userMetrics.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-300">Rank</TableHead>
                        <TableHead className="text-slate-300">User</TableHead>
                        <TableHead className="text-slate-300">Cosmic Score</TableHead>
                        <TableHead className="text-slate-300">Total Points</TableHead>
                        <TableHead className="text-slate-300">Aura Rating</TableHead>
                        <TableHead className="text-slate-300">Amplifier</TableHead>
                        <TableHead className="text-slate-300">Posts</TableHead>
                        <TableHead className="text-slate-300">Engagement</TableHead>
                        <TableHead className="text-slate-300">Referrals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userMetrics.map((user, index) => (
                        <TableRow key={user.id} className="border-slate-800">
                          <TableCell>
                            <div className="flex items-center">
                              {index < 3 ? (
                                <Crown className={`h-4 w-4 mr-2 ${
                                  index === 0 ? 'text-yellow-400' : 
                                  index === 1 ? 'text-gray-400' : 
                                  'text-orange-400'
                                }`} />
                              ) : (
                                <span className="text-slate-400 mr-2">#{index + 1}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-white">{user.name}</div>
                              <div className="text-sm text-slate-400">@{user.username}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                              <span className="font-bold text-yellow-400">{Math.round(user.cosmicScore)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-white font-medium">{user.totalPoints}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.auraRating >= 7 ? "default" : user.auraRating >= 4 ? "secondary" : "destructive"}>
                              {user.auraRating}/10
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              user.auraAmplifier > 1 ? 'text-green-400' : 
                              user.auraAmplifier < 1 ? 'text-red-400' : 
                              'text-slate-300'
                            }`}>
                              {user.auraAmplifier.toFixed(1)}x
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="text-white font-medium">{user.postCount}</div>
                              <div className="text-xs text-slate-400">{user.postPoints}pts</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="text-white font-medium">{user.likeCount + user.shareCount + user.repostCount + user.tagCount + user.saveCount}</div>
                              <div className="text-xs text-slate-400">{user.engagementPoints}pts</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="text-white font-medium">{user.referralCount}</div>
                              <div className="text-xs text-slate-400">{user.referralPoints}pts</div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No user metrics found. Try adjusting your search or filters.</p>
                  </div>
                )}

                {/* Point System Legend */}
                <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <h4 className="text-white font-medium mb-3">Point System Breakdown</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-300 font-medium">Engagement (1pt each):</p>
                      <p className="text-slate-400">Likes, Shares, Reposts, Tags, Saves</p>
                    </div>
                    <div>
                      <p className="text-slate-300 font-medium">Content Creation (5pts):</p>
                      <p className="text-slate-400">Each post created</p>
                    </div>
                    <div>
                      <p className="text-slate-300 font-medium">Referrals (10pts):</p>
                      <p className="text-slate-400">Each user referred to platform</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-slate-300 font-medium">Aura Amplifier System:</p>
                    <p className="text-slate-400">Rating 7-10: 1.5x | Rating 4-6: 1.0x | Rating 1-3: 0.5x</p>
                    <p className="text-slate-400">Cosmic Score = Total Points × Aura Amplifier</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Review */}
          <TabsContent value="content" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Content Review Queue</CardTitle>
                <CardDescription className="text-slate-400">
                  Review flagged content and take moderation actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-6">
                  <Select value={contentFilter} onValueChange={setContentFilter}>
                    <SelectTrigger className="w-48 bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="urgent">Urgent Priority</SelectItem>
                      <SelectItem value="posts">Posts Only</SelectItem>
                      <SelectItem value="lists">Lists Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-slate-300">
                    {reviewQueue.length} items in queue
                  </Badge>
                </div>

                {reviewLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-slate-400">Loading review queue...</p>
                  </div>
                ) : reviewQueue.length > 0 ? (
                  <div className="space-y-4">
                    {reviewQueue.map((item) => (
                      <Card key={item.id} className="bg-slate-800 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline">{item.contentType}</Badge>
                                <Badge variant={getPriorityBadgeVariant(item.priority)}>
                                  {item.priority}
                                </Badge>
                                <Badge variant="secondary">
                                  {item.flagCount} flag{item.flagCount !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <p className="text-white font-medium mb-1">Reason: {item.reason}</p>
                              <p className="text-sm text-slate-400">
                                Reported {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => moderateContentMutation.mutate({
                                  itemId: item.id,
                                  action: 'approve',
                                  reason: 'Content approved after review'
                                })}
                                disabled={moderateContentMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => moderateContentMutation.mutate({
                                  itemId: item.id,
                                  action: 'remove',
                                  reason: 'Content removed for policy violation'
                                })}
                                disabled={moderateContentMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-slate-400">No content in review queue!</p>
                    <p className="text-sm text-slate-500 mt-2">All reported content has been reviewed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* URLs Management */}
          <TabsContent value="urls" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  URL Analytics & Management
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Track URL performance, manage affiliate links, and perform bulk operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search URLs by domain or link..."
                        value={urlSearchTerm}
                        onChange={(e) => setUrlSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  
                  <Select value={urlSortBy} onValueChange={(value: 'popularity' | 'clicks' | 'posts' | 'domain') => setUrlSortBy(value)}>
                    <SelectTrigger className="w-48 bg-slate-800 border-slate-700">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popularity">Sort by Popularity</SelectItem>
                      <SelectItem value="clicks">Sort by Clicks</SelectItem>
                      <SelectItem value="posts">Sort by Posts</SelectItem>
                      <SelectItem value="domain">Sort by Domain</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={exportToCSV}
                    disabled={urlAnalytics.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  
                  <Button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/url-analytics'] })}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {urlAnalyticsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-slate-400">Loading URL analytics...</p>
                  </div>
                ) : sortedUrlAnalytics.length > 0 ? (
                  <div className="space-y-4">
                    {sortedUrlAnalytics.filter(url => 
                      !urlSearchTerm || url.url.toLowerCase().includes(urlSearchTerm.toLowerCase())
                    ).map((urlData) => (
                      <Card key={urlData.url} className="bg-slate-800 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <ExternalLink className="h-4 w-4 text-blue-400" />
                                <span className="text-white font-medium truncate max-w-md">{urlData.url}</span>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => navigator.clipboard.writeText(urlData.url)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-1">
                                  <BarChart3 className="h-4 w-4 text-green-400" />
                                  <span className="text-slate-300">{urlData.clickCount} clicks</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <FileText className="h-4 w-4 text-blue-400" />
                                  <span className="text-slate-300">{urlData.postCount} posts</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Star className="h-4 w-4 text-yellow-400" />
                                  <span className="text-slate-300">Score: {urlData.clickCount + (urlData.postCount * 2)}</span>
                                </div>
                                {urlData.mapping && (
                                  <div className="flex items-center space-x-1">
                                    <Link className="h-4 w-4 text-purple-400" />
                                    <span className="text-slate-300">Mapped</span>
                                    {urlData.mapping.discountCode && (
                                      <Badge variant="outline" className="text-xs">
                                        {urlData.mapping.discountCode}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>

                              {urlData.mapping && (
                                <div className="text-xs text-slate-400 bg-slate-900 p-2 rounded">
                                  <span className="font-medium">Current URL:</span> {urlData.mapping.currentUrl}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUrl(urlData)}
                                className="border-slate-600"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Hot Swap
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ExternalLink className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No URL data available</p>
                  </div>
                )}

                {/* Bulk Operations Section */}
                <div className="mt-8 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Bulk Operations</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bulk Discount Code Application */}
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">Apply Bulk Discount Codes</CardTitle>
                        <CardDescription className="text-slate-400 text-xs">
                          Apply discount codes to multiple URLs at once
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-slate-300 mb-2 block">
                            Discount Code
                          </label>
                          <Input
                            placeholder="e.g., SAVE20, HOLIDAY15"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                            className="bg-slate-900 border-slate-600"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-slate-300 mb-2 block">
                            Selected URLs ({urlAnalytics.filter(url => url.url.includes('amazon') || url.url.includes('target')).length})
                          </label>
                          <div className="text-xs text-slate-400 bg-slate-900 p-2 rounded max-h-20 overflow-y-auto">
                            {urlAnalytics.filter(url => url.url.includes('amazon') || url.url.includes('target')).map(url => (
                              <div key={url.url} className="truncate">{url.url}</div>
                            ))}
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => {
                            const selectedUrls = urlAnalytics
                              .filter(url => url.url.includes('amazon') || url.url.includes('target'))
                              .map(url => url.url);
                            if (discountCode && selectedUrls.length > 0) {
                              bulkDiscountMutation.mutate({ urls: selectedUrls, discountCode });
                            }
                          }}
                          disabled={!discountCode || bulkDiscountMutation.isPending}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {bulkDiscountMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Apply to {urlAnalytics.filter(url => url.url.includes('amazon') || url.url.includes('target')).length} URLs
                        </Button>
                      </CardContent>
                    </Card>

                    {/* URL Statistics */}
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">URL Statistics</CardTitle>
                        <CardDescription className="text-slate-400 text-xs">
                          Overview of URL performance metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                              {urlAnalytics.reduce((sum, url) => sum + url.clickCount, 0)}
                            </div>
                            <div className="text-xs text-slate-400">Total Clicks</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                              {urlAnalytics.length}
                            </div>
                            <div className="text-xs text-slate-400">Unique URLs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                              {urlAnalytics.filter(url => url.mapping).length}
                            </div>
                            <div className="text-xs text-slate-400">Mapped URLs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                              {urlAnalytics.filter(url => url.mapping?.discountCode).length}
                            </div>
                            <div className="text-xs text-slate-400">With Discounts</div>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-600">
                          <div className="text-xs text-slate-400 space-y-1">
                            <div>Top Domain: {urlAnalytics.length > 0 ? new URL(urlAnalytics[0].url).hostname : 'N/A'}</div>
                            <div>Avg Clicks: {urlAnalytics.length > 0 ? Math.round(urlAnalytics.reduce((sum, url) => sum + url.clickCount, 0) / urlAnalytics.length) : 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hot Swap Dialog */}
            {selectedUrl && (
              <Dialog open={!!selectedUrl} onOpenChange={() => setSelectedUrl(null)}>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Hot Swap URL</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Replace this URL across all posts with a new URL
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Current URL
                      </label>
                      <div className="text-sm text-slate-400 bg-slate-800 p-2 rounded border border-slate-700">
                        {selectedUrl.url}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        New URL
                      </label>
                      <Input
                        placeholder="https://example.com/new-url"
                        value={hotSwapUrl}
                        onChange={(e) => setHotSwapUrl(e.target.value)}
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Discount Code (Optional)
                      </label>
                      <Input
                        placeholder="e.g., SAVE20"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    
                    <div className="bg-slate-800 p-3 rounded border border-slate-700">
                      <div className="text-xs text-slate-400">
                        <div className="font-medium mb-1">Impact:</div>
                        <div>• Will update {selectedUrl.postCount} posts</div>
                        <div>• {selectedUrl.clickCount} tracked clicks will be preserved</div>
                        <div>• URL mapping will be created/updated</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      <Button
                        onClick={() => setSelectedUrl(null)}
                        variant="outline"
                        className="flex-1 border-slate-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (hotSwapUrl) {
                            hotSwapUrlMutation.mutate({
                              originalUrl: selectedUrl.url,
                              newUrl: hotSwapUrl,
                              discountCode: discountCode || undefined
                            });
                          }
                        }}
                        disabled={!hotSwapUrl || hotSwapUrlMutation.isPending}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {hotSwapUrlMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Execute Hot Swap
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="space-y-6">
              {/* Enhanced Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">Total Views</CardTitle>
                    <Eye className="h-4 w-4 text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{metrics?.totalViews?.toLocaleString() || 0}</div>
                    <p className="text-xs text-slate-400">{metrics?.contentMetrics?.viewsToday || 0} today</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">Total Likes</CardTitle>
                    <Activity className="h-4 w-4 text-red-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{metrics?.totalLikes || 0}</div>
                    <p className="text-xs text-slate-400">{metrics?.contentMetrics?.likesToday || 0} today</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">Total Comments</CardTitle>
                    <Users className="h-4 w-4 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{metrics?.totalComments || 0}</div>
                    <p className="text-xs text-slate-400">User engagement</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">Connections</CardTitle>
                    <Users className="h-4 w-4 text-yellow-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{metrics?.totalConnections || 0}</div>
                    <p className="text-xs text-slate-400">Active friendships</p>
                  </CardContent>
                </Card>
              </div>

              {/* User Engagement Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">User Engagement</CardTitle>
                    <CardDescription className="text-slate-400">Active user statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Daily Active</span>
                        <span className="text-green-400 font-bold">{metrics?.userEngagement?.dailyActiveUsers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Weekly Active</span>
                        <span className="text-blue-400 font-bold">{metrics?.userEngagement?.weeklyActiveUsers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly Active</span>
                        <span className="text-purple-400 font-bold">{metrics?.userEngagement?.monthlyActiveUsers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Session</span>
                        <span className="text-white font-bold">{metrics?.userEngagement?.avgSessionDuration || 0}m</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Content Analytics</CardTitle>
                    <CardDescription className="text-slate-400">Content creation averages</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Posts/User</span>
                        <span className="text-white font-bold">{metrics?.avgPostsPerUser || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Lists/User</span>
                        <span className="text-white font-bold">{metrics?.avgListsPerUser || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Posts Today</span>
                        <span className="text-green-400 font-bold">{metrics?.contentMetrics?.postsToday || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Lists Today</span>
                        <span className="text-blue-400 font-bold">{metrics?.contentMetrics?.listsToday || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Performance Metrics</CardTitle>
                    <CardDescription className="text-slate-400">System performance data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Load Time</span>
                        <span className="text-green-400 font-bold">{metrics?.performanceMetrics?.averageLoadTime || 1.2}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Error Rate</span>
                        <span className="text-yellow-400 font-bold">{metrics?.performanceMetrics?.errorRate || 0.1}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Uptime</span>
                        <span className="text-green-400 font-bold">{metrics?.performanceMetrics?.uptime || 99.9}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">System Health</span>
                        <Badge variant={getHealthBadgeVariant(metrics?.systemHealth || 'excellent')}>
                          {metrics?.systemHealth || 'excellent'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Hashtags */}
              {metrics?.topHashtags && metrics.topHashtags.length > 0 && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Trending Hashtags</CardTitle>
                    <CardDescription className="text-slate-400">Most popular hashtags on the platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics.topHashtags.map((hashtag, index) => (
                        <div key={hashtag.name} className="flex items-center space-x-4">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">#{hashtag.name}</span>
                              <span className="text-slate-400">{hashtag.count} posts</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${(hashtag.count / metrics.topHashtags[0].count) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity */}
              {metrics?.recentActivity && metrics.recentActivity.length > 0 && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Activity Trend</CardTitle>
                    <CardDescription className="text-slate-400">Content creation over the last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.recentActivity.map((activity, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                          <span className="text-slate-300">{activity.date}</span>
                          <span className="text-white font-bold">{activity.count} {activity.type}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">System Configuration</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage platform settings and configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Default Post Privacy</label>
                      <Select defaultValue="public">
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="connections">Connections Only</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Default List Privacy</label>
                      <Select defaultValue="private">
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="connections">Connections Only</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Analysis Tab */}
          <TabsContent value="posts" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Posts Analysis</h3>
                <p className="text-gray-400">Comprehensive post analytics with sorting and promotion capabilities</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-400">Sort by:</label>
                  <Select value={postSortBy} onValueChange={(value: any) => setPostSortBy(value)}>
                    <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="views">Views</SelectItem>
                      <SelectItem value="shares">Shares</SelectItem>
                      <SelectItem value="clicks">Clicks</SelectItem>
                      <SelectItem value="aura">Aura</SelectItem>
                      <SelectItem value="hashtags">Hashtags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search posts..."
                    value={postSearchTerm}
                    onChange={(e) => setPostSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>

            {postAnalyticsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="h-48 bg-gray-700 rounded mb-3"></div>
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {postAnalytics
                  .sort((a, b) => {
                    switch (postSortBy) {
                      case 'views': return (b.viewCount || 0) - (a.viewCount || 0);
                      case 'shares': return (b.shareCount || 0) - (a.shareCount || 0);
                      case 'clicks': return (b.clickCount || 0) - (a.clickCount || 0);
                      case 'aura': return (b.auraRating || 0) - (a.auraRating || 0);
                      case 'hashtags': return (b.hashtagCount || 0) - (a.hashtagCount || 0);
                      default: return 0;
                    }
                  })
                  .map((post) => (
                    <Card key={post.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
                      <CardContent className="p-4">
                        <div className="relative mb-3">
                          {post.primaryPhotoUrl && (
                            <img 
                              src={post.primaryPhotoUrl} 
                              alt="Post" 
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          )}
                          <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1 text-xs text-white">
                            ID: {post.id}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                              <User className="h-3 w-3 text-gray-300" />
                            </div>
                            <span className="text-sm text-gray-300">@{post.user?.username}</span>
                          </div>
                          
                          <p className="text-sm text-gray-200 line-clamp-2">
                            {post.primaryDescription || 'No description'}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3 text-blue-400" />
                              <span className="text-gray-300">{post.viewCount || 0} views</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Share2 className="h-3 w-3 text-green-400" />
                              <span className="text-gray-300">{post.shareCount || 0} shares</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MousePointer className="h-3 w-3 text-purple-400" />
                              <span className="text-gray-300">{post.clickCount || 0} clicks</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400" />
                              <span className="text-gray-300">{post.auraRating || 4.0} aura</span>
                            </div>
                          </div>
                          
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {post.hashtags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                                  #{tag.name}
                                </span>
                              ))}
                              {post.hashtags.length > 3 && (
                                <span className="text-xs text-gray-400">+{post.hashtags.length - 3} more</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPost(post)}
                              className="text-xs bg-purple-600/20 border-purple-600/30 text-purple-300 hover:bg-purple-600/30"
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Promote
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {/* Post Promotion Dialog */}
            <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
              <DialogContent className="bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    <span>Promote Post</span>
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Promote this post to the top of a hashtag feed with guaranteed views
                  </DialogDescription>
                </DialogHeader>
                
                {selectedPost && (
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">@{selectedPost.user?.username}</span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {selectedPost.primaryDescription || 'No description'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                        <span>{selectedPost.viewCount || 0} views</span>
                        <span>{selectedPost.shareCount || 0} shares</span>
                        <span>{selectedPost.auraRating || 4.0} aura</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Target Hashtag
                        </label>
                        <Input
                          placeholder="Enter hashtag (without #)"
                          value={promoteHashtag}
                          onChange={(e) => setPromoteHashtag(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Guaranteed Views
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter view count"
                          value={promoteViews}
                          onChange={(e) => setPromoteViews(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Post will stay at top until this view count is reached
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedPost(null)}
                        className="bg-gray-800 border-gray-700 text-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (promoteHashtag && promoteViews) {
                            promotePostMutation.mutate({
                              postId: selectedPost.id,
                              hashtag: promoteHashtag,
                              views: parseInt(promoteViews)
                            });
                          }
                        }}
                        disabled={!promoteHashtag || !promoteViews || promotePostMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {promotePostMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Promoting...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Promote Post
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}