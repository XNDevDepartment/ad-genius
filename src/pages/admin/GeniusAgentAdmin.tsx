// Admin Dashboard for Genius Agent
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Users, Activity, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { geniusAgentApi, GeniusAgentConfig, GeniusAgentJob } from "@/api/genius-agent-api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { LoadingFallback } from "@/components/LoadingFallback";
import { format } from "date-fns";

export default function GeniusAgentAdmin() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [configs, setConfigs] = useState<(GeniusAgentConfig & { profiles?: { email: string; name: string } })[]>([]);
  const [jobs, setJobs] = useState<GeniusAgentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [configsResult, jobsResult] = await Promise.all([
        geniusAgentApi.getAllConfigs(),
        geniusAgentApi.getAllJobs(200)
      ]);
      setConfigs(configsResult);
      setJobs(jobsResult);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  if (authLoading || loading) {
    return <LoadingFallback />;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Admin Access Required</h1>
        <Button onClick={() => navigate("/admin")}>Back to Admin</Button>
      </div>
    );
  }

  const activeConfigs = configs.filter(c => c.is_active);
  const completedJobs = jobs.filter(j => j.status === "completed");
  const failedJobs = jobs.filter(j => j.status === "failed");
  const pendingJobs = jobs.filter(j => j.status === "pending" || j.status === "processing");

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Genius Agent Admin</h1>
          </div>
          <p className="text-muted-foreground">Monitor and manage all agent configurations</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{activeConfigs.length}</span>
              <span className="text-sm text-muted-foreground">/ {configs.length} total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{jobs.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{completedJobs.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{failedJobs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="configs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configs">
            <Users className="h-4 w-4 mr-2" />
            User Configs ({configs.length})
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <Clock className="h-4 w-4 mr-2" />
            Recent Jobs ({jobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configs">
          <Card>
            <CardHeader>
              <CardTitle>All Agent Configurations</CardTitle>
              <CardDescription>Users who have configured the Genius Agent</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Audiences</TableHead>
                      <TableHead>Style</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{config.profiles?.name || "Unknown"}</div>
                            <div className="text-sm text-muted-foreground">{config.profiles?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.is_active ? "default" : "secondary"}>
                            {config.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{config.schedule_days?.length || 0} days</div>
                            <div className="text-muted-foreground">{config.schedule_hours?.length || 0} hours/day</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{config.audiences?.length || 0} audiences</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{config.preferred_style}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {config.updated_at ? format(new Date(config.updated_at), "MMM d, HH:mm") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {configs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No configurations found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Jobs</CardTitle>
              <CardDescription>All generations triggered by the agent</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          {job.result_url ? (
                            <img
                              src={job.result_url}
                              alt="Result"
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Sparkles className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {job.profiles?.email || job.user_id.slice(0, 8)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            job.status === "completed" ? "default" :
                            job.status === "failed" ? "destructive" :
                            job.status === "processing" ? "secondary" : "outline"
                          }>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm line-clamp-1 max-w-[200px]">
                            {job.audience}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(job.created_at), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {jobs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No jobs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
