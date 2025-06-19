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
  Filter
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
          <TabsList className="grid w-full grid-cols-4 bg-slate-900 border border-slate-800">
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-600">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-purple-600">
              <FileText className="h-4 w-4 mr-2" />
              Content Review
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
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

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Platform Statistics</CardTitle>
                  <CardDescription className="text-slate-400">
                    Overview of platform activity and growth
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-white">{metrics?.totalUsers || 0}</div>
                      <div className="text-sm text-slate-400">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-white">{metrics?.totalPosts || 0}</div>
                      <div className="text-sm text-slate-400">Total Posts</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-white">{metrics?.totalLists || 0}</div>
                      <div className="text-sm text-slate-400">Total Lists</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-white">{metrics?.activeUsers24h || 0}</div>
                      <div className="text-sm text-slate-400">Active 24h</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">System Health</CardTitle>
                  <CardDescription className="text-slate-400">
                    Monitor platform performance and issues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Overall Health</span>
                    <Badge variant={getHealthBadgeVariant(metrics?.systemHealth || 'good')}>
                      {metrics?.systemHealth || 'good'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Flagged Content</span>
                    <span className="text-white">{metrics?.flaggedContent || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Pending Reports</span>
                    <span className="text-white">{metrics?.pendingReports || 0}</span>
                  </div>
                </CardContent>
              </Card>
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
        </Tabs>
      </div>
    </div>
  );
}