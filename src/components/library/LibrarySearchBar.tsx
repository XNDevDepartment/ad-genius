import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type DateFilter = 'all' | '7d' | '30d' | '3m';
export type TypeFilter = 'all' | 'ugc' | 'outfit_swap' | 'bulk_background';
export type SortOrder = 'newest' | 'oldest';

interface LibrarySearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (f: TypeFilter) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (s: SortOrder) => void;
}

export const LibrarySearchBar = ({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  typeFilter,
  onTypeFilterChange,
  sortOrder,
  onSortOrderChange,
}: LibrarySearchBarProps) => {
  const [inputValue, setInputValue] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(inputValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  const hasActiveFilters = searchQuery || dateFilter !== 'all' || typeFilter !== 'all' || sortOrder !== 'newest';

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by prompt..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          className="pl-9 pr-8"
        />
        {inputValue && (
          <button
            onClick={() => { setInputValue(''); onSearchChange(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Date filter */}
      <Select value={dateFilter} onValueChange={v => onDateFilterChange(v as DateFilter)}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="3m">Last 3 months</SelectItem>
        </SelectContent>
      </Select>

      {/* Type filter */}
      <Select value={typeFilter} onValueChange={v => onTypeFilterChange(v as TypeFilter)}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="ugc">UGC Images</SelectItem>
          <SelectItem value="outfit_swap">Outfit Swap</SelectItem>
          <SelectItem value="bulk_background">Backgrounds</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortOrder} onValueChange={v => onSortOrderChange(v as SortOrder)}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
