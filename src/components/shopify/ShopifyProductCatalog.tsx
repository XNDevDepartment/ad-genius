import { Search, Package, ArrowUpDown, Filter, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ShopifyProduct, SortOption } from "@/hooks/useShopifyDashboard";
import { useState } from "react";

interface Props {
  products: ShopifyProduct[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  vendorFilter: string;
  onVendorChange: (v: string) => void;
  typeFilter: string;
  onTypeChange: (t: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  vendors: string[];
  productTypes: string[];
  statuses: string[];
  onOpenProduct: (p: ShopifyProduct) => void;
  totalCount: number;
}

export function ShopifyProductCatalog({
  products, searchQuery, onSearchChange,
  vendorFilter, onVendorChange, typeFilter, onTypeChange,
  statusFilter, onStatusChange, sortBy, onSortChange,
  vendors, productTypes, statuses, onOpenProduct, totalCount,
}: Props) {
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const statusColor = (s: string) => {
    if (s === "active") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (s === "draft") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={vendorFilter} onValueChange={onVendorChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {productTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="w-[150px] h-9">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title A–Z</SelectItem>
              <SelectItem value="synced_at">Recently Synced</SelectItem>
            </SelectContent>
          </Select>

          {/* Layout toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden ml-auto">
            <button
              onClick={() => setLayout("grid")}
              className={`p-2 ${layout === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLayout("list")}
              className={`p-2 ${layout === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Showing {products.length} of {totalCount} products
      </p>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting your filters or sync your store.</p>
        </div>
      ) : layout === "grid" ? (
        /* Grid layout */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group overflow-hidden"
              onClick={() => onOpenProduct(p)}
            >
              <div className="aspect-square bg-muted relative overflow-hidden">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <Badge className={`absolute top-2 right-2 text-[10px] ${statusColor(p.status)}`}>
                  {p.status}
                </Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-sm truncate">{p.title}</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground truncate">{p.vendor || "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.variants?.length || 0} variant{(p.variants?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                {p.product_type && (
                  <span className="text-[10px] text-muted-foreground mt-1 block">{p.product_type}</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List layout */
        <div className="space-y-2">
          {products.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
              onClick={() => onOpenProduct(p)}
            >
              <CardContent className="flex items-center gap-4 p-3">
                <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden shrink-0">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{p.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{p.vendor || "—"}</span>
                    <span>{p.product_type || "—"}</span>
                    <span>{p.variants?.length || 0} variants</span>
                  </div>
                </div>
                <Badge className={`text-[10px] shrink-0 ${statusColor(p.status)}`}>
                  {p.status}
                </Badge>
                <Button size="sm" variant="outline" className="shrink-0">
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
