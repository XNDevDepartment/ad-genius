import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Trash2, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ErrorReport {
  id: string;
  user_id: string | null;
  user_email: string | null;
  error_message: string;
  error_stack: string | null;
  page_url: string;
  user_agent: string | null;
  created_at: string;
  metadata: unknown;
}

export const AdminErrorReports = () => {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [uniquePages, setUniquePages] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    uniqueErrors: 0,
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch reports
      let query = supabase
        .from('error_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      const { data, error } = await query;

      if (error) throw error;

      setReports(data || []);

      // Extract unique pages for filter
      const pages = [...new Set((data || []).map(r => {
        try {
          const url = new URL(r.page_url);
          return url.pathname;
        } catch {
          return r.page_url;
        }
      }))];
      setUniquePages(pages);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = (data || []).filter(r => new Date(r.created_at) >= today).length;
      const uniqueMessages = new Set((data || []).map(r => r.error_message)).size;

      setStats({
        total: data?.length || 0,
        today: todayCount,
        uniqueErrors: uniqueMessages,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch error reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('error_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Error report deleted');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL error reports? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('error_reports')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      setReports([]);
      setStats({ total: 0, today: 0, uniqueErrors: 0 });
      toast.success('All error reports deleted');
    } catch (error) {
      console.error('Error deleting all reports:', error);
      toast.error('Failed to delete reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = searchQuery === '' || 
      report.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.page_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.user_email?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPage = pageFilter === 'all' || (() => {
      try {
        const url = new URL(report.page_url);
        return url.pathname === pageFilter;
      } catch {
        return report.page_url === pageFilter;
      }
    })();

    return matchesSearch && matchesPage;
  });

  const getErrorSeverity = (message: string): 'high' | 'medium' | 'low' => {
    if (message.includes('TypeError') || message.includes('ReferenceError')) return 'high';
    if (message.includes('removeChild') || message.includes('insertBefore')) return 'low';
    return 'medium';
  };

  const truncateMessage = (message: string, maxLength = 60) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.today.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.uniqueErrors.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Reports
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={loading || reports.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by error message, URL, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filter by page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                {uniquePages.map(page => (
                  <SelectItem key={page} value={page}>{page}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No error reports found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Error Message</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.slice(0, 100).map((report) => {
                    const severity = getErrorSeverity(report.error_message);
                    let pagePath = report.page_url;
                    try {
                      pagePath = new URL(report.page_url).pathname;
                    } catch {}

                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant={
                            severity === 'high' ? 'destructive' : 
                            severity === 'medium' ? 'default' : 
                            'secondary'
                          }>
                            {severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[300px]">
                          {truncateMessage(report.error_message)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">
                            {pagePath}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {report.user_email || 'Anonymous'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(report.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)}>
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle>Error Details</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="h-[60vh]">
                                  <div className="space-y-4 pr-4">
                                    <div>
                                      <h4 className="font-medium mb-1">Error Message</h4>
                                      <p className="font-mono text-sm bg-muted p-3 rounded break-all">
                                        {report.error_message}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Page URL</h4>
                                      <p className="font-mono text-sm bg-muted p-3 rounded break-all">
                                        {report.page_url}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">User</h4>
                                      <p className="text-sm">
                                        {report.user_email || 'Anonymous'} 
                                        {report.user_id && <span className="text-muted-foreground ml-2">({report.user_id})</span>}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Date</h4>
                                      <p className="text-sm">
                                        {format(new Date(report.created_at), 'PPpp')}
                                      </p>
                                    </div>
                                    {report.error_stack && (
                                      <div>
                                        <h4 className="font-medium mb-1">Stack Trace</h4>
                                        <pre className="font-mono text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                          {report.error_stack}
                                        </pre>
                                      </div>
                                    )}
                                    {report.user_agent && (
                                      <div>
                                        <h4 className="font-medium mb-1">User Agent</h4>
                                        <p className="font-mono text-xs bg-muted p-3 rounded break-all">
                                          {report.user_agent}
                                        </p>
                                      </div>
                                    )}
                                    {report.metadata && Object.keys(report.metadata).length > 0 && (
                                      <div>
                                        <h4 className="font-medium mb-1">Metadata</h4>
                                        <pre className="font-mono text-xs bg-muted p-3 rounded overflow-x-auto">
                                          {JSON.stringify(report.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(report.id)}
                              disabled={deleting === report.id}
                            >
                              {deleting === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredReports.length > 100 && (
            <p className="text-sm text-muted-foreground text-center">
              Showing 100 of {filteredReports.length} reports
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
