import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Eye, History, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { PromptEditorDialog } from './PromptEditorDialog';
import { PromptHistoryDialog } from './PromptHistoryDialog';
import { format } from 'date-fns';

interface AIPrompt {
  id: string;
  prompt_key: string;
  prompt_name: string;
  prompt_template: string;
  prompt_type: string;
  description: string | null;
  variables: string[];
  is_active: boolean;
  category: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export const PromptManagement = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ai_prompts')
        .select('*')
        .order('category', { ascending: true })
        .order('prompt_name', { ascending: true });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPrompts((data || []).map(p => ({
        ...p,
        variables: Array.isArray(p.variables) 
          ? p.variables.filter((v): v is string => typeof v === 'string')
          : []
      })));
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch prompts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [categoryFilter]);

  const handleEdit = (prompt: AIPrompt) => {
    setSelectedPrompt(prompt);
    setShowEditor(true);
  };

  const handleViewHistory = (prompt: AIPrompt) => {
    setSelectedPrompt(prompt);
    setShowHistory(true);
  };

  const handleToggleActive = async (prompt: AIPrompt) => {
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ is_active: !prompt.is_active })
        .eq('id', prompt.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Prompt ${prompt.is_active ? 'deactivated' : 'activated'} successfully`
      });
      fetchPrompts();
    } catch (error) {
      console.error('Error toggling prompt:', error);
      toast({
        title: "Error",
        description: "Failed to update prompt status",
        variant: "destructive"
      });
    }
  };

  const filteredPrompts = prompts.filter(prompt =>
    prompt.prompt_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.prompt_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['all', ...Array.from(new Set(prompts.map(p => p.category)))];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      outfit_swap: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      video_generation: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      ugc_generation: 'bg-green-500/10 text-green-500 border-green-500/20',
    };
    return colors[category] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      system: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      user: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      instruction: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const columns = [
    {
      key: 'prompt_name',
      label: 'Prompt Name',
      render: (prompt: AIPrompt) => (
        <div className="space-y-1">
          <div className="font-medium">{prompt.prompt_name}</div>
          <div className="text-xs text-muted-foreground font-mono">{prompt.prompt_key}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (prompt: AIPrompt) => (
        <Badge variant="outline" className={getCategoryColor(prompt.category)}>
          {prompt.category.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'prompt_type',
      label: 'Type',
      render: (prompt: AIPrompt) => (
        <Badge variant="outline" className={getTypeColor(prompt.prompt_type)}>
          {prompt.prompt_type}
        </Badge>
      )
    },
    {
      key: 'variables',
      label: 'Variables',
      render: (prompt: AIPrompt) => (
        <div className="flex flex-wrap gap-1">
          {prompt.variables && prompt.variables.length > 0 ? (
            prompt.variables.map((v, i) => (
              <code key={i} className="text-xs bg-muted px-1 py-0.5 rounded">
                {`{${v}}`}
              </code>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (prompt: AIPrompt) => (
        <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
          {prompt.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'version',
      label: 'Version',
      render: (prompt: AIPrompt) => (
        <div className="text-sm">v{prompt.version}</div>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      render: (prompt: AIPrompt) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(prompt.updated_at), 'MMM d, yyyy')}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (prompt: AIPrompt) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(prompt)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewHistory(prompt)}
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(prompt)}
          >
            <Eye className={`w-4 h-4 ${prompt.is_active ? 'text-green-500' : 'text-gray-400'}`} />
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Prompt Management</CardTitle>
              <CardDescription>
                Manage and edit AI prompts used throughout the application
              </CardDescription>
            </div>
            <Button onClick={fetchPrompts} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts by name, key, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{prompts.length}</div>
                <div className="text-sm text-muted-foreground">Total Prompts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">
                  {prompts.filter(p => p.is_active).length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {categories.length - 1}
                </div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-500">
                  {prompts.filter(p => !p.is_active).length}
                </div>
                <div className="text-sm text-muted-foreground">Inactive</div>
              </CardContent>
            </Card>
          </div>

          <AdminDataTable
            data={filteredPrompts}
            columns={columns}
            searchable={false}
          />
        </CardContent>
      </Card>

      {selectedPrompt && (
        <>
          <PromptEditorDialog
            open={showEditor}
            onOpenChange={setShowEditor}
            prompt={selectedPrompt}
            onSave={() => {
              fetchPrompts();
              setShowEditor(false);
            }}
          />
          <PromptHistoryDialog
            open={showHistory}
            onOpenChange={setShowHistory}
            promptId={selectedPrompt.id}
            promptName={selectedPrompt.prompt_name}
          />
        </>
      )}
    </div>
  );
};