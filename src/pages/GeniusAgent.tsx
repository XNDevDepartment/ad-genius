// Genius Agent Configuration Page (Admin-only for now)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Calendar, Clock, Users, Settings2, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGeniusAgentConfig } from "@/hooks/useGeniusAgentConfig";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { LoadingFallback } from "@/components/LoadingFallback";
import { format } from "date-fns";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`
}));

const STYLES = [
  { value: "lifestyle", label: "Lifestyle" },
  { value: "studio", label: "Studio" },
  { value: "cinematic", label: "Cinematic" },
  { value: "natural", label: "Natural" },
  { value: "minimal", label: "Minimal" },
  { value: "professional", label: "Professional" },
];

export default function GeniusAgent() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { config, history, loading, saving, saveConfig, toggleActive } = useGeniusAgentConfig();
  const [newAudience, setNewAudience] = useState("");

  if (authLoading || loading) {
    return <LoadingFallback />;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Restricted</h1>
        <p className="text-muted-foreground">Genius Agent is currently available for administrators only.</p>
        <Button onClick={() => navigate("/create")}>Back to Create</Button>
      </div>
    );
  }

  const handleDayToggle = (day: number) => {
    const currentDays = config?.schedule_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    saveConfig({ schedule_days: newDays });
  };

  const handleHourToggle = (hour: number) => {
    const currentHours = config?.schedule_hours || [];
    const newHours = currentHours.includes(hour)
      ? currentHours.filter(h => h !== hour)
      : [...currentHours, hour].sort((a, b) => a - b);
    saveConfig({ schedule_hours: newHours });
  };

  const handleAddAudience = () => {
    if (!newAudience.trim()) return;
    const audiences = config?.audiences || [];
    if (!audiences.includes(newAudience.trim())) {
      saveConfig({ audiences: [...audiences, newAudience.trim()] });
    }
    setNewAudience("");
  };

  const handleRemoveAudience = (audience: string) => {
    const audiences = config?.audiences || [];
    saveConfig({ audiences: audiences.filter(a => a !== audience) });
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Genius Agent</h1>
            <Badge variant="secondary">Beta</Badge>
          </div>
          <p className="text-muted-foreground">Automate your content production</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {config?.is_active ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={config?.is_active || false}
            onCheckedChange={toggleActive}
            disabled={saving}
          />
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          {/* Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule
              </CardTitle>
              <CardDescription>
                Choose when the agent should generate content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Days */}
              <div className="space-y-2">
                <Label>Active Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <Button
                      key={day.value}
                      variant={config?.schedule_days?.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDayToggle(day.value)}
                      disabled={saving}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Hours */}
              <div className="space-y-2">
                <Label>Active Hours</Label>
                <div className="flex flex-wrap gap-2">
                  {HOURS.map(hour => (
                    <Button
                      key={hour.value}
                      variant={config?.schedule_hours?.includes(hour.value) ? "default" : "outline"}
                      size="sm"
                      className="w-16"
                      onClick={() => handleHourToggle(hour.value)}
                      disabled={saving}
                    >
                      {hour.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Content per run */}
              <div className="space-y-2">
                <Label>Images per Run</Label>
                <Select
                  value={String(config?.content_per_run || 1)}
                  onValueChange={(v) => saveConfig({ content_per_run: parseInt(v) })}
                  disabled={saving}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} image{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Audiences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Target Audiences
              </CardTitle>
              <CardDescription>
                Define your target audiences. The agent will randomly pick one for each generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Young professionals aged 25-35 interested in fitness"
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAudience()}
                />
                <Button onClick={handleAddAudience} disabled={saving || !newAudience.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {(config?.audiences || []).map((audience, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{audience}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAudience(audience)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {(config?.audiences || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No audiences defined. Add at least one to enable the agent.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Style Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Generation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Photography Style</Label>
                  <Select
                    value={config?.preferred_style || "lifestyle"}
                    onValueChange={(v) => saveConfig({ preferred_style: v })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Product Highlight</Label>
                  <Select
                    value={config?.highlight_product || "yes"}
                    onValueChange={(v) => saveConfig({ highlight_product: v })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes - Product as hero (40-60% frame)</SelectItem>
                      <SelectItem value="no">No - Environment first (20-35% frame)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
              <CardDescription>
                Recent content generated by the agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No generations yet. Enable the agent and wait for scheduled runs.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((job) => (
                      <div
                        key={job.id}
                        className="flex gap-4 p-4 rounded-lg border"
                      >
                        {job.result_url ? (
                          <img
                            src={job.result_url}
                            alt="Generated"
                            className="w-20 h-20 object-cover rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              job.status === "completed" ? "default" :
                              job.status === "failed" ? "destructive" : "secondary"
                            }>
                              {job.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(job.created_at), "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {job.audience}
                          </p>
                          {job.error && (
                            <p className="text-xs text-destructive mt-1">{job.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
