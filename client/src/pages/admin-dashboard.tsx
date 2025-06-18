import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, Users, FileText, List, Flag, Settings, 
  TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Search, Download, Upload, MoreHorizontal 
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
}

interface DashboardMetrics {
  totalUsers: number;
  activeUsers24h: number;
  totalPosts: number;
  totalLists: number;
  flaggedContent: number;
  pendingReviews: number;
  systemHealth: string;
}

interface ReviewItem {
  id: number;
  contentType: string;
  contentId: number;
  priority: string;
  reason: string;
  flagCount: number;
  status: string;
  assignedTo?: number;
  createdAt: string;
}

interface ModerationAction {
  id: number;
  moderatorId: number;
  contentType: string;
  contentId: number;
  action: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin authentication
  const { data: currentAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ['/api/admin/health'],
    enabled: !!adminToken,
    queryFn: () => apiRequest('/api/admin/health', {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
  });

  // Dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/metrics'],
    enabled: !!adminToken,
    queryFn: () => apiRequest('/api/admin/dashboard/metrics', {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
  });

  // Review queue
  const { data: reviewQueue, isLoading: reviewLoading } = useQuery({
    queryKey: ['/api/admin/moderation/queue'],
    enabled: !!adminToken && selectedTab === 'moderation',
    queryFn: () => apiRequest('/api/admin/moderation/queue', {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
  });

  // Flagged content
  const { data: flaggedContent, isLoading: flaggedLoading } = useQuery({
    queryKey: ['/api/admin/moderation/flagged-content'],
    enabled: !!adminToken && selectedTab === 'moderation',
    queryFn: () => apiRequest('/api/admin/moderation/flagged-content', {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
  });

  // Admin login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      return response;
    },
    onSuccess: (data) => {
      setAdminToken(data.token);
      localStorage.setItem('admin_token', data.token);
      toast({
        title: "Admin Login Successful",
        description: `Welcome back, ${data.admin.username}!`
      });
      queryClient.invalidateQueries();
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid admin credentials",
        variant: "destructive"
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/admin/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    },
    onSuccess: () => {
      setAdminToken(null);
      localStorage.removeItem('admin_token');
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "Admin session ended"
      });
    }
  });

  // Process review item mutation
  const processReviewMutation = useMutation({
    mutationFn: async ({ itemId, action, reason }: { itemId: number; action: string; reason: string }) => {
      return apiRequest(`/api/admin/moderation/queue/${itemId}/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action, reason })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/queue'] });
      toast({
        title: "Review Processed",
        description: "Moderation action completed successfully"
      });
    }
  });

  // User search mutation
  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      return apiRequest(`/api/admin/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason, duration }: { userId: number; reason: string; duration?: number }) => {
      return apiRequest(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason, duration })
      });
    },
    onSuccess: () => {
      toast({
        title: "User Banned",
        description: "User has been banned successfully"
      });
    }
  });

  if (!adminToken) {
    return <AdminLoginForm onLogin={loginMutation.mutate} isLoading={loginMutation.isPending} />;
  }

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage users, content, and system configuration
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={currentAdmin?.data?.systemHealth === 'excellent' ? 'default' : 'destructive'}>
            System: {currentAdmin?.data?.systemHealth || 'Unknown'}
          </Badge>
          
          <div className="text-right">
            <p className="font-medium">{currentAdmin?.data?.activeAdmin?.username}</p>
            <p className="text-sm text-gray-500">{currentAdmin?.data?.activeAdmin?.role}</p>
          </div>
          
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {metricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Users"
                value={metrics?.data?.totalUsers || 0}
                icon={<Users className="h-4 w-4" />}
                trend="+12%"
              />
              <MetricCard
                title="Active Users (24h)"
                value={metrics?.data?.activeUsers24h || 0}
                icon={<TrendingUp className="h-4 w-4" />}
                trend="+5%"
              />
              <MetricCard
                title="Total Posts"
                value={metrics?.data?.totalPosts || 0}
                icon={<FileText className="h-4 w-4" />}
                trend="+8%"
              />
              <MetricCard
                title="Pending Reviews"
                value={metrics?.data?.pendingReviews || 0}
                icon={<AlertTriangle className="h-4 w-4" />}
                variant={metrics?.data?.pendingReviews > 0 ? "warning" : "default"}
              />
            </div>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Commonly used administrative functions</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-16">
                <div className="text-center">
                  <Flag className="h-6 w-6 mx-auto mb-2" />
                  Review Flagged Content
                </div>
              </Button>
              <Button variant="outline" className="h-16">
                <div className="text-center">
                  <Download className="h-6 w-6 mx-auto mb-2" />
                  Export Data
                </div>
              </Button>
              <Button variant="outline" className="h-16">
                <div className="text-center">
                  <Settings className="h-6 w-6 mx-auto mb-2" />
                  System Config
                </div>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search, view, and moderate user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search users by username or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => searchUsersMutation.mutate(searchQuery)}
                  disabled={!searchQuery || searchUsersMutation.isPending}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {searchUsersMutation.data?.data && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchUsersMutation.data.data.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => banUserMutation.mutate({ 
                              userId: user.id, 
                              reason: 'Administrative action' 
                            })}
                          >
                            Ban User
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moderation Tab */}
        <TabsContent value="moderation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Review Queue */}
            <Card>
              <CardHeader>
                <CardTitle>Content Review Queue</CardTitle>
                <CardDescription>Items requiring moderation attention</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewQueue?.data?.map((item: ReviewItem) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge variant={
                              item.priority === 'high' ? 'destructive' : 
                              item.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {item.priority} priority
                            </Badge>
                            <p className="font-medium mt-1">
                              {item.contentType} #{item.contentId}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {item.flagCount} flag{item.flagCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{item.reason}</p>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => processReviewMutation.mutate({
                              itemId: item.id,
                              action: 'approve',
                              reason: 'Content approved after review'
                            })}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => processReviewMutation.mutate({
                              itemId: item.id,
                              action: 'remove',
                              reason: 'Content removed for policy violation'
                            })}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {!reviewQueue?.data?.length && (
                      <div className="text-center py-8 text-gray-500">
                        No items in review queue
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flagged Content */}
            <Card>
              <CardHeader>
                <CardTitle>Recently Flagged</CardTitle>
                <CardDescription>Content flagged by users</CardDescription>
              </CardHeader>
              <CardContent>
                {flaggedLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flaggedContent?.data?.slice(0, 5).map((flag: any) => (
                      <div key={flag.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">Post #{flag.postId}</p>
                          <p className="text-sm text-gray-500">{flag.reason || 'No reason provided'}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </div>
                    ))}
                    
                    {!flaggedContent?.data?.length && (
                      <div className="text-center py-4 text-gray-500">
                        No flagged content
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Other tabs would be implemented similarly */}
        <TabsContent value="content">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                Content management features coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                System settings coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon, trend, variant = "default" }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  variant?: "default" | "warning";
}) {
  return (
    <Card className={variant === "warning" ? "border-yellow-200 bg-yellow-50" : ""}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600">{title}</div>
          {icon}
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
          {trend && (
            <div className="text-xs text-green-600 mt-1">{trend}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Admin Login Form Component
function AdminLoginForm({ onLogin, isLoading }: {
  onLogin: (credentials: { username: string; password: string }) => void;
  isLoading: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Access the administrative dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}