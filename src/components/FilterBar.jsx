import React, { useState, useEffect } from 'react';
import { Search, X, RotateCw, Plus, Download } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export const FilterBar = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [], // array of { id, label, value, options: [{ label, value }], onChange }
  onRefresh,
  loading = false,
  primaryAction, // { label, icon, onClick, variant }
  onExportCsv,
  className = ''
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);

  // Debounce search effect (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, searchValue, onSearchChange]);

  // Sync external search value changes
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  return (
    <div className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-sm mb-6 ${className}`}>
      {/* Left side: Search & filters */}
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 pr-8 h-10 bg-background/80"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        {filters.map((filter) => (
          <div key={filter.id} className="min-w-[160px]">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Refresh button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            title="Refrescar lista"
            className="h-10 w-10 shrink-0 bg-background/80"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          </Button>
        )}
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {onExportCsv && (
          <Button
            variant="outline"
            onClick={onExportCsv}
            className="gap-2 h-10 bg-background/80"
            title="Exportar a CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        )}

        {primaryAction && (
          <Button
            variant={primaryAction.variant || 'default'}
            onClick={primaryAction.onClick}
            className="gap-2 h-10 shadow-sm"
          >
            {primaryAction.icon || <Plus className="h-4 w-4" />}
            <span>{primaryAction.label}</span>
          </Button>
        )}
      </div>
    </div>
  );
};
