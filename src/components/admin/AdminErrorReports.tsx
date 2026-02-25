import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
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
  const [stats, setStats] = useState({ total: 0, today: 0, uniqueErrors: 0 });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('error_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setReports(data || []);

      const pages = [...new Set((data || []).map(r => {
        try { return new URL(r.page_url).pathname; } catch { return r.page_url; }
      }))];
      setUniquePages(pages);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStats({
        total: data?.length || 0,
        today: (data || []).filter(r => new Date(r.created_at) >= today).length,
        uniqueErrors: new Set((data || []).map(r => r.error_message)).size,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch error reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from('error_reports').delete().eq('id', id);
      if (error) throw error;
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Error report deleted');
    } catch (error) {
      toast.error('Failed to delete report');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL error reports? This cannot be undone.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('error_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      setReports([]);
      setStats({ total: 0, today: 0, uniqueErrors: 0 });
      toast.success('All error reports deleted');
    } catch (error) {
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
      try { return new URL(report.page_url).pathname === pageFilter; } catch { return report.page_url === pageFilter; }
    })();

    return matchesSearch && matchesPage;
  });

  const getSeverityDot = (message: string) => {
    if (message.includes('TypeError') || message.includes('ReferenceError')) return 'bg-red-500';
    if (message.includes('removeChild') || message.includes('insertBefore')) return 'bg-muted-foreground/40';
    return 'bg-amber-500';
  };

  return (
    <div className="space-y-6">
      {/* Header with inline stats */}
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold">Error Reports</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} total · {stats.today} today · {stats.uniqueErrors} unique
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading} className="rounded-xl">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={loading || reports.length === 0} className="rounded-xl">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by error, URL, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-0 bg-muted/50"
            />
          </div>
          <Select value={pageFilter} onValueChange={setPageFilter}>
            <SelectTrigger className="w-full sm:w-[220px] rounded-xl border-0 bg-muted/50">
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

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No error reports found</div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Error Message</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.slice(0, 100).map((report) => {
                  let pagePath = report.page_url;
                  try { pagePath = new URL(report.page_url).pathname; } catch {}

                  return (
                    <TableRow key={report.id} className="hover:bg-primary/5">
                      <TableCell>
                        <div className={`w-2.5 h-2.5 rounded-full ${getSeverityDot(report.error_message)}`} />
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">
                        {report.error_message.length > 60 ? report.error_message.substring(0, 60) + '...' : report.error_message}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted/50 px-2 py-0.5 rounded-lg text-xs">{pagePath}</code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{report.user_email || 'Anonymous'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(report.created_at), 'MMM d, HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)} className="rounded-lg">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] rounded-2xl">
                              <DialogHeader>
                                <DialogTitle>Error Details</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="h-[60vh]">
                                <div className="space-y-4 pr-4">
                                  <div>
                                    <h4 className="font-medium mb-1 text-sm">Error Message</h4>
                                    <p className="font-mono text-sm bg-muted/50 p-3 rounded-xl break-all">{report.error_message}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1 text-sm">Page URL</h4>
                                    <p className="font-mono text-sm bg-muted/50 p-3 rounded-xl break-all">{report.page_url}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1 text-sm">User</h4>
                                    <p className="text-sm">{report.user_email || 'Anonymous'} {report.user_id && <span className="text-muted-foreground">({report.user_id})</span>}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1 text-sm">Date</h4>
                                    <p className="text-sm">{format(new Date(report.created_at), 'PPpp')}</p>
                                  </div>
                                  {report.error_stack && (
                                    <div>
                                      <h4 className="font-medium mb-1 text-sm">Stack Trace</h4>
                                      <pre className="font-mono text-xs bg-muted/50 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap">{report.error_stack}</pre>
                                    </div>
                                  )}
                                  {report.user_agent && (
                                    <div>
                                      <h4 className="font-medium mb-1 text-sm">User Agent</h4>
                                      <p className="font-mono text-xs bg-muted/50 p-3 rounded-xl break-all">{report.user_agent}</p>
                                    </div>
                                  )}
                                  {report.metadata && Object.keys(report.metadata as object).length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-1 text-sm">Metadata</h4>
                                      <pre className="font-mono text-xs bg-muted/50 p-3 rounded-xl overflow-x-auto">{JSON.stringify(report.metadata, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(report.id)} disabled={deleting === report.id} className="rounded-lg">
                            {deleting === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
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
          <p className="text-sm text-muted-foreground text-center mt-4">Showing 100 of {filteredReports.length} reports</p>
        )}
      </div>
    </div>
  );
};
