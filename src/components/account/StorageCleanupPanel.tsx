import { useState } from "react";
import { HardDrive, Search, Trash2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface StorageCleanupPanelProps {
  onClose: () => void;
}

interface SourceRow {
  id: string;
  file_name: string;
  file_size: number | null;
  storage_path: string;
  public_url: string;
  created_at: string;
}

interface DuplicateGroup {
  key: string;
  strategy: "public_url" | "storage_path" | "name_size";
  original: SourceRow;
  duplicates: SourceRow[];
  totalWastedBytes: number;
}

type ScanState = "idle" | "scanning" | "results" | "cleaning" | "done";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const detectBucket = (publicUrl: string): string =>
  publicUrl?.includes("/ugc-inputs/") ? "ugc-inputs" : "source-images";

export function StorageCleanupPanel({ onClose }: StorageCleanupPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [cleanupProgress, setCleanupProgress] = useState(0);
  const [cleanupResult, setCleanupResult] = useState<{
    deleted: number;
    failed: number;
    freedBytes: number;
  } | null>(null);

  const totalDuplicates = duplicateGroups.reduce((s, g) => s + g.duplicates.length, 0);
  const totalWasted = duplicateGroups.reduce((s, g) => s + g.totalWastedBytes, 0);

  const handleScan = async () => {
    if (!user) return;
    setScanState("scanning");
    setDuplicateGroups([]);

    try {
      const { data, error } = await supabase
        .from("source_images")
        .select("id, file_name, file_size, storage_path, public_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }); // oldest first → kept as original

      if (error) throw error;

      const rows = (data || []) as SourceRow[];
      const groups: DuplicateGroup[] = [];
      const usedIds = new Set<string>();

      // Pass 1: same public_url
      const byUrl = new Map<string, SourceRow[]>();
      for (const row of rows) {
        if (!row.public_url) continue;
        const existing = byUrl.get(row.public_url) ?? [];
        byUrl.set(row.public_url, [...existing, row]);
      }
      byUrl.forEach((rowList, key) => {
        if (rowList.length < 2) return;
        const [original, ...duplicates] = rowList;
        rowList.forEach(r => usedIds.add(r.id));
        groups.push({
          key,
          strategy: "public_url",
          original,
          duplicates,
          totalWastedBytes: duplicates.reduce((s, r) => s + (r.file_size ?? 0), 0),
        });
      });

      // Pass 2: same storage_path (among unused rows)
      const byPath = new Map<string, SourceRow[]>();
      for (const row of rows) {
        if (usedIds.has(row.id) || !row.storage_path) continue;
        const existing = byPath.get(row.storage_path) ?? [];
        byPath.set(row.storage_path, [...existing, row]);
      }
      byPath.forEach((rowList, key) => {
        if (rowList.length < 2) return;
        const [original, ...duplicates] = rowList;
        rowList.forEach(r => usedIds.add(r.id));
        groups.push({
          key,
          strategy: "storage_path",
          original,
          duplicates,
          totalWastedBytes: duplicates.reduce((s, r) => s + (r.file_size ?? 0), 0),
        });
      });

      // Pass 3: same file_name + file_size (among still unused)
      const byNameSize = new Map<string, SourceRow[]>();
      for (const row of rows) {
        if (usedIds.has(row.id) || !row.file_name || row.file_size == null) continue;
        const key = `${row.file_name}::${row.file_size}`;
        const existing = byNameSize.get(key) ?? [];
        byNameSize.set(key, [...existing, row]);
      }
      byNameSize.forEach((rowList, key) => {
        if (rowList.length < 2) return;
        const [original, ...duplicates] = rowList;
        groups.push({
          key,
          strategy: "name_size",
          original,
          duplicates,
          totalWastedBytes: duplicates.reduce((s, r) => s + (r.file_size ?? 0), 0),
        });
      });

      setDuplicateGroups(groups);
      setScanState("results");
    } catch (err) {
      console.error("[StorageCleanup] Scan failed:", err);
      toast({ title: "Scan failed", description: "Could not scan for duplicates.", variant: "destructive" });
      setScanState("idle");
    }
  };

  const handleCleanup = async () => {
    setScanState("cleaning");
    setCleanupProgress(0);

    const allDuplicates = duplicateGroups.flatMap(g => g.duplicates);
    let deleted = 0;
    let failed = 0;
    let freedBytes = 0;

    for (let i = 0; i < allDuplicates.length; i++) {
      const dup = allDuplicates[i];
      try {
        const bucket = detectBucket(dup.public_url);
        await supabase.storage.from(bucket).remove([dup.storage_path]);

        const { error } = await supabase
          .from("source_images")
          .delete()
          .eq("id", dup.id)
          .eq("user_id", user!.id);

        if (error) throw error;
        deleted++;
        freedBytes += dup.file_size ?? 0;
      } catch {
        failed++;
      }
      setCleanupProgress(Math.round(((i + 1) / allDuplicates.length) * 100));
    }

    setCleanupResult({ deleted, failed, freedBytes });
    setScanState("done");
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const strategyLabel: Record<DuplicateGroup["strategy"], string> = {
    public_url: "Same URL",
    storage_path: "Same storage path",
    name_size: "Same name & size",
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Storage Cleanup
          </CardTitle>
          <CardDescription>
            Find and remove duplicate source images to free up storage space.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Idle ── */}
          {scanState === "idle" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This tool scans your source images for duplicates using three strategies: identical URL, identical storage path, and identical file name + file size. Only the oldest copy of each duplicate is kept.
              </p>
              <Button onClick={handleScan}>
                <Search className="h-4 w-4 mr-2" />
                Scan for Duplicates
              </Button>
            </div>
          )}

          {/* ── Scanning ── */}
          {scanState === "scanning" && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Search className="h-8 w-8 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Scanning your source images…</p>
            </div>
          )}

          {/* ── Results ── */}
          {scanState === "results" && (
            <div className="space-y-4">
              {duplicateGroups.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <p className="font-medium">No duplicates found</p>
                  <p className="text-sm text-muted-foreground">Your source images are clean.</p>
                  <Button variant="outline" size="sm" onClick={() => setScanState("idle")}>
                    Scan Again
                  </Button>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="rounded-lg bg-muted/40 border border-border/50 p-4 flex flex-wrap gap-6">
                    <div>
                      <p className="text-2xl font-bold">{duplicateGroups.length}</p>
                      <p className="text-xs text-muted-foreground">duplicate groups</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalDuplicates}</p>
                      <p className="text-xs text-muted-foreground">duplicate files</p>
                    </div>
                    {totalWasted > 0 && (
                      <div>
                        <p className="text-2xl font-bold">{formatBytes(totalWasted)}</p>
                        <p className="text-xs text-muted-foreground">wasted storage</p>
                      </div>
                    )}
                  </div>

                  {/* Group list */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {duplicateGroups.map(group => (
                      <div key={group.key} className="rounded-md border border-border/50 bg-muted/20">
                        <button
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                          onClick={() => toggleGroup(group.key)}
                        >
                          {expandedGroups.has(group.key) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{group.original.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {strategyLabel[group.strategy]} · {group.duplicates.length} duplicate{group.duplicates.length !== 1 ? "s" : ""}
                              {group.totalWastedBytes > 0 && ` · ${formatBytes(group.totalWastedBytes)} wasted`}
                            </p>
                          </div>
                        </button>
                        {expandedGroups.has(group.key) && (
                          <div className="border-t border-border/50 px-3 pb-3 space-y-1 pt-2">
                            <p className="text-xs text-muted-foreground font-medium mb-1">Keeping (oldest):</p>
                            <p className="text-xs pl-2 text-foreground">{group.original.file_name} — {new Date(group.original.created_at).toLocaleDateString()}</p>
                            <Separator className="my-1" />
                            <p className="text-xs text-muted-foreground font-medium mb-1">Will delete:</p>
                            {group.duplicates.map(dup => (
                              <p key={dup.id} className="text-xs pl-2 text-destructive">
                                {dup.file_name} — {new Date(dup.created_at).toLocaleDateString()}
                                {dup.file_size && ` (${formatBytes(dup.file_size)})`}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clean Up {totalDuplicates} Duplicate{totalDuplicates !== 1 ? "s" : ""}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete {totalDuplicates} duplicate file{totalDuplicates !== 1 ? "s" : ""}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {totalDuplicates} duplicate source image{totalDuplicates !== 1 ? "s" : ""} from storage and the database.
                            The oldest copy of each duplicate will be kept.
                            {totalWasted > 0 && ` This will free up approximately ${formatBytes(totalWasted)}.`}
                            <br /><br />
                            <strong>This action cannot be undone.</strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleCleanup}
                          >
                            Delete Duplicates
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" onClick={() => setScanState("idle")}>
                      Reset
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Cleaning ── */}
          {scanState === "cleaning" && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Deleting duplicates…</p>
              <Progress value={cleanupProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{cleanupProgress}%</p>
            </div>
          )}

          {/* ── Done ── */}
          {scanState === "done" && cleanupResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-lg font-semibold">Cleanup Complete</p>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{cleanupResult.deleted}</p>
                    <p className="text-xs text-muted-foreground">deleted</p>
                  </div>
                  {cleanupResult.failed > 0 && (
                    <div>
                      <p className="text-2xl font-bold text-destructive">{cleanupResult.failed}</p>
                      <p className="text-xs text-muted-foreground">failed</p>
                    </div>
                  )}
                  {cleanupResult.freedBytes > 0 && (
                    <div>
                      <p className="text-2xl font-bold">{formatBytes(cleanupResult.freedBytes)}</p>
                      <p className="text-xs text-muted-foreground">freed</p>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={() => { setScanState("idle"); setDuplicateGroups([]); setCleanupResult(null); }}>
                Scan Again
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
