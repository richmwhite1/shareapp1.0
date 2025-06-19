import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  FileText, 
  List, 
  Activity, 
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  UserPlus,
  Calendar,
  Clock,
  Zap,
  Globe,
  Shield
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

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

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000'];

export default function AdminAnalytics() {
  const { data: metrics, isLoading } = useQuery<AdminMetrics>({
    queryKey: ['/api/admin/metrics'],
    refetchInterval: 30000,
  });

  if (isLoading || !metrics) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const healthColor = {
    excellent: 'text-green-400',
    good: 'text-blue-400', 
    warning: 'text-yellow-400',
    critical: 'text-red-400'
  }[metrics.systemHealth] || 'text-gray-400';

  const engagementData = [
    { name: 'Daily', users: metrics.userEngagement.dailyActiveUsers },
    { name: 'Weekly', users: metrics.userEngagement.weeklyActiveUsers },
    { name: 'Monthly', users: metrics.userEngagement.monthlyActiveUsers },
  ];

  const contentDistribution = [
    { name: 'Posts', value: metrics.totalPosts },
    { name: 'Lists', value: metrics.totalLists },
    { name: 'Comments', value: metrics.totalComments },
    { name: 'Connections', value: metrics.totalConnections },
  ];

  const todayMetrics = [
    { name: 'Posts', value: metrics.contentMetrics.postsToday },
    { name: 'Lists', value: metrics.contentMetrics.listsToday },
    { name: 'Likes', value: metrics.contentMetrics.likesToday },
    { name: 'Views', value: metrics.contentMetrics.viewsToday },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Comprehensive platform insights and metrics</p>
        </div>
        <Badge variant="outline" className={`${healthColor} border-current`}>
          System Health: {metrics.systemHealth}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics.totalUsers}</div>
                <p className="text-xs text-gray-400">{metrics.activeUsers24h} active today</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Posts</CardTitle>
                <FileText className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics.totalPosts}</div>
                <p className="text-xs text-gray-400">{metrics.contentMetrics.postsToday} created today</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics.totalViews.toLocaleString()}</div>
                <p className="text-xs text-gray-400">{metrics.contentMetrics.viewsToday} today</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Connections</CardTitle>
                <UserPlus className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics.totalConnections}</div>
                <p className="text-xs text-gray-400">Active friendships</p>
              </CardContent>
            </Card>
          </div>

          {/* Content Distribution Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Content Distribution</CardTitle>
                <CardDescription className="text-gray-400">Platform content breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={contentDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {contentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Today's Activity</CardTitle>
                <CardDescription className="text-gray-400">Content created today</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={todayMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Hashtags */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Trending Hashtags</CardTitle>
              <CardDescription className="text-gray-400">Most popular hashtags on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topHashtags.map((hashtag, index) => (
                  <div key={hashtag.name} className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-medium">#{hashtag.name}</span>
                        <span className="text-gray-400">{hashtag.count} posts</span>
                      </div>
                      <Progress 
                        value={(hashtag.count / metrics.topHashtags[0].count) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">User Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Bar dataKey="users" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">User Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Posts/User</span>
                  <span className="text-white font-bold">{metrics.avgPostsPerUser}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Lists/User</span>
                  <span className="text-white font-bold">{metrics.avgListsPerUser}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Session Duration</span>
                  <span className="text-white font-bold">{metrics.userEngagement.avgSessionDuration}m</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Active Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Daily</span>
                    <span className="text-green-400 font-bold">{metrics.userEngagement.dailyActiveUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Weekly</span>
                    <span className="text-blue-400 font-bold">{metrics.userEngagement.weeklyActiveUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monthly</span>
                    <span className="text-purple-400 font-bold">{metrics.userEngagement.monthlyActiveUsers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Likes</CardTitle>
                <Heart className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics.totalLikes}</div>
                <p className="text-xs text-gray-400">{metrics.contentMetrics.likesToday} today</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Comments</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics.totalComments}</div>
                <p className="text-xs text-gray-400">Engagement metric</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Lists</CardTitle>
                <List className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics.totalLists}</div>
                <p className="text-xs text-gray-400">{metrics.contentMetrics.listsToday} created today</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Flagged Content</CardTitle>
                <Shield className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics.flaggedContent}</div>
                <p className="text-xs text-gray-400">{metrics.pendingReviews} pending review</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          {metrics.recentActivity.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity Trend</CardTitle>
                <CardDescription className="text-gray-400">Posts created over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Load Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">{metrics.performanceMetrics.averageLoadTime}s</div>
                <p className="text-gray-400">Average response time</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-400">{metrics.performanceMetrics.errorRate}%</div>
                <p className="text-gray-400">System error percentage</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">{metrics.performanceMetrics.uptime}%</div>
                <p className="text-gray-400">System availability</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}