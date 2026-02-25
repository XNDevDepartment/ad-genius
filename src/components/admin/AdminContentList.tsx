import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Image as ImageIcon, Video, Shirt, Sparkles, Layers, X, ExternalLink, Download,
  RefreshCw, LayoutGrid, List, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminDataTable } from './AdminDataTable';
import { toast } from 'sonner';

interface UnifiedContent {
  id: string;
  type: 'generated' | 'ugc' | 'video' | 'outfit_swap' | 'outfit_creator' | 'background';
  thumbnail_url: string | null;
  title: string;
  status: string;
  user_id: string;
  user_email: string;
  user_name: string;
  created_at: string;
}

interface AdminContentListProps {
  userId?: string | null;
  userEmail?: string | null;
  onClearUser?: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  generated: { label: 'Generated', icon: ImageIcon, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  ugc: { label: 'UGC', icon: Sparkles, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  video: { label: 'Video', icon: Video, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  outfit_swap: { label: 'Outfit Swap', icon: Shirt, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  outfit_creator: { label: 'Outfit Creator', icon: Shirt, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  background: { label: 'Background', icon: Layers, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
};

const DATE_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: 'All', value: 'all' },
];

export const AdminContentList = ({ userId, userEmail, onClearUser }: AdminContentListProps) => {
  const [content, setContent] = useState<UnifiedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    fetchContent();
  }, [userId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const limit = userId ? 500 : 200;
      const profilesMap = new Map<string, { email: string; name: string }>();

      // Build individual queries
      let genQ = supabase.from('generated_images').select('id, prompt, public_url, created_at, user_id').order('created_at', { ascending: false }).limit(limit);
      let ugcQ = supabase.from('ugc_images').select('id, prompt, public_url, created_at, user_id, meta').order('created_at', { ascending: false }).limit(limit);
      let videoQ = supabase.from('kling_jobs').select('id, prompt, image_url, video_url, status, created_at, user_id').order('created_at', { ascending: false }).limit(limit);
      let outfitSwapQ = supabase.from('outfit_swap_results').select('id, public_url, created_at, user_id, job_id').order('created_at', { ascending: false }).limit(limit);
      let outfitCreatorQ = supabase.from('outfit_creator_results').select('id, public_url, created_at, user_id, job_id').order('created_at', { ascending: false }).limit(limit);
      let bgQ = supabase.from('bulk_background_results').select('id, result_url, source_image_url, status, created_at, user_id').order('created_at', { ascending: false }).limit(limit);

      if (userId) {
        genQ = genQ.eq('user_id', userId);
        ugcQ = ugcQ.eq('user_id', userId);
        videoQ = videoQ.eq('user_id', userId);
        outfitSwapQ = outfitSwapQ.eq('user_id', userId);
        outfitCreatorQ = outfitCreatorQ.eq('user_id', userId);
        bgQ = bgQ.eq('user_id', userId);
      }

      const [genRes, ugcRes, videoRes, outfitSwapRes, outfitCreatorRes, bgRes] = await Promise.all([
        genQ, ugcQ, videoQ, outfitSwapQ, outfitCreatorQ, bgQ,
      ]);

      // Collect all user IDs
      const allData = [genRes.data, ugcRes.data, videoRes.data, outfitSwapRes.data, outfitCreatorRes.data, bgRes.data];
      const userIds = new Set<string>();
      allData.forEach(arr => arr?.forEach((r: any) => { if (r.user_id) userIds.add(r.user_id); }));

      // Fetch profiles
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, name')
          .in('id', Array.from(userIds));
        profiles?.forEach(p => profilesMap.set(p.id, { email: p.email, name: p.name || '' }));
      }

      const getProfile = (uid: string) => profilesMap.get(uid) || { email: 'Unknown', name: '' };

      const unified: UnifiedContent[] = [];

      // Generated images
      (genRes.data || []).forEach((img: any) => {
        const p = getProfile(img.user_id);
        unified.push({
          id: img.id, type: 'generated', thumbnail_url: img.public_url,
          title: img.prompt || 'Generated image', status: 'completed',
          user_id: img.user_id, user_email: p.email, user_name: p.name, created_at: img.created_at,
        });
      });

      // UGC images
      (ugcRes.data || []).forEach((img: any) => {
        const p = getProfile(img.user_id);
        unified.push({
          id: img.id, type: 'ugc', thumbnail_url: img.public_url,
          title: img.prompt || (img.meta as any)?.prompt || 'UGC image', status: 'completed',
          user_id: img.user_id, user_email: p.email, user_name: p.name, created_at: img.created_at,
        });
      });

      // Videos
      (videoRes.data || []).forEach((v: any) => {
        const p = getProfile(v.user_id);
        unified.push({
          id: v.id, type: 'video', thumbnail_url: v.image_url,
          title: v.prompt || 'Video', status: v.status,
          user_id: v.user_id, user_email: p.email, user_name: p.name, created_at: v.created_at,
        });
      });

      // Outfit swap results
      (outfitSwapRes.data || []).forEach((r: any) => {
        const p = getProfile(r.user_id);
        unified.push({
          id: r.id, type: 'outfit_swap', thumbnail_url: r.public_url,
          title: 'Outfit Swap', status: 'completed',
          user_id: r.user_id, user_email: p.email, user_name: p.name, created_at: r.created_at,
        });
      });

      // Outfit creator results
      (outfitCreatorRes.data || []).forEach((r: any) => {
        const p = getProfile(r.user_id);
        unified.push({
          id: r.id, type: 'outfit_creator', thumbnail_url: r.public_url,
          title: 'Outfit Creator', status: 'completed',
          user_id: r.user_id, user_email: p.email, user_name: p.name, created_at: r.created_at,
        });
      });

      // Background results
      (bgRes.data || []).forEach((r: any) => {
        const p = getProfile(r.user_id);
        unified.push({
          id: r.id, type: 'background', thumbnail_url: r.result_url || r.source_image_url,
          title: 'Background Swap', status: r.status,
          user_id: r.user_id, user_email: p.email, user_name: p.name, created_at: r.created_at,
        });
      });

      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setContent(unified);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = useMemo(() => {
    let items = content;

    // Type filter
    if (activeTypes.size > 0) {
      items = items.filter(i => activeTypes.has(i.type));
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      const ms = dateFilter === 'today' ? 24 * 60 * 60 * 1000 : dateFilter === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      items = items.filter(i => now - new Date(i.created_at).getTime() < ms);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.user_email.toLowerCase().includes(q) ||
        i.user_name.toLowerCase().includes(q)
      );
    }

    return items;
  }, [content, activeTypes, dateFilter, searchQuery]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    content.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
    return counts;
  }, [content]);

  const toggleType = (type: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}.webp`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error('Download failed'); }
  };

  const columns = [
    {
      key: 'preview',
      label: 'Preview',
      render: (item: UnifiedContent) => (
        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
          {item.thumbnail_url ? (
            <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (item: UnifiedContent) => {
        const cfg = TYPE_CONFIG[item.type];
        return (
          <Badge variant="outline" className={`rounded-full text-xs ${cfg.color}`}>
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: 'title',
      label: 'Description',
      sortable: true,
      render: (item: UnifiedContent) => (
        <p className="text-sm line-clamp-1 max-w-[200px]">{item.title}</p>
      ),
    },
    {
      key: 'user_email',
      label: 'User',
      sortable: true,
      render: (item: UnifiedContent) => (
        <div className="text-sm">
          <div className="font-medium truncate max-w-[160px]">{item.user_email}</div>
          {item.user_name && <div className="text-xs text-muted-foreground">{item.user_name}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: UnifiedContent) => (
        <Badge variant={item.status === 'completed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (item: UnifiedContent) => (
        <span className="text-sm text-muted-foreground">{format(new Date(item.created_at), 'MMM dd, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item: UnifiedContent) => (
        <div className="flex gap-1">
          {item.thumbnail_url && (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(item.thumbnail_url!, '_blank')}>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(item.thumbnail_url!, item.title)}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // KPI stats
  const kpis = [
    { label: 'Generated', count: typeCounts.generated || 0, icon: ImageIcon, color: 'border-l-blue-500' },
    { label: 'UGC', count: typeCounts.ugc || 0, icon: Sparkles, color: 'border-l-purple-500' },
    { label: 'Videos', count: typeCounts.video || 0, icon: Video, color: 'border-l-red-500' },
    { label: 'Outfit Swaps', count: typeCounts.outfit_swap || 0, icon: Shirt, color: 'border-l-amber-500' },
    { label: 'Outfit Creator', count: typeCounts.outfit_creator || 0, icon: Shirt, color: 'border-l-green-500' },
    { label: 'Backgrounds', count: typeCounts.background || 0, icon: Layers, color: 'border-l-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      {/* User filter banner */}
      {userId && userEmail && (
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Showing content for: <span className="text-primary">{userEmail}</span></span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClearUser} className="gap-1 rounded-xl">
            <X className="w-3 h-3" /> Clear filter
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-2xl bg-card/80 backdrop-blur-sm shadow-apple p-4 border-l-4 ${kpi.color} cursor-pointer hover:bg-muted/50 transition-colors ${activeTypes.has(kpi.label.toLowerCase().replace(/ /g, '_')) ? 'ring-2 ring-primary' : ''}`}
            onClick={() => {
              const typeKey = Object.keys(TYPE_CONFIG).find(k => TYPE_CONFIG[k].label === kpi.label);
              if (typeKey) toggleType(typeKey);
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <kpi.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-xl font-bold">{kpi.count}</div>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl bg-card/80 backdrop-blur-sm shadow-apple p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Type chips */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button key={key}
                onClick={() => toggleType(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeTypes.has(key) ? cfg.color + ' border-current' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'}`}
              >
                {cfg.label} ({typeCounts[key] || 0})
              </button>
            ))}
            {activeTypes.size > 0 && (
              <button onClick={() => setActiveTypes(new Set())} className="px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                Clear
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-border hidden md:block" />

          {/* Date filter */}
          <div className="flex gap-1">
            {DATE_FILTERS.map(df => (
              <button key={df.value}
                onClick={() => setDateFilter(df.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dateFilter === df.value ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
              >
                {df.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* View toggle & refresh */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-xl overflow-hidden">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-none h-8">
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="rounded-none h-8">
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchContent} className="rounded-xl gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-2xl border-0 bg-card/80 backdrop-blur-sm shadow-apple p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">All Content</h3>
            <p className="text-sm text-muted-foreground">{filteredContent.length} items{activeTypes.size > 0 ? ' (filtered)' : ''}</p>
          </div>
        </div>

        {viewMode === 'table' ? (
          <AdminDataTable
            data={filteredContent}
            columns={columns}
            searchPlaceholder="Search by description, email, or name..."
            loading={loading}
          />
        ) : (
          <>
            <div className="mb-4">
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-md rounded-xl" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredContent.map(item => (
                <div key={item.id} className="group cursor-pointer">
                  <div className="aspect-square overflow-hidden rounded-xl bg-muted relative"
                    onClick={() => item.thumbnail_url && window.open(item.thumbnail_url, '_blank')}
                  >
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <Badge variant="outline" className={`absolute top-1.5 left-1.5 text-[10px] ${TYPE_CONFIG[item.type].color}`}>
                      {TYPE_CONFIG[item.type].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 truncate">{item.user_email.split('@')[0]}</p>
                </div>
              ))}
            </div>
            {filteredContent.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">No content found.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
