import React, { useState, useEffect, useRef, memo } from 'react';
import { Search, X, RotateCw, Plus, Download } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export const FilterBar = memo(({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [], // array of { id, label, value, options: [{ label, value }], onChange }
  onRefresh,
  loading = false,
  primaryAction, // { label, icon, onClick, variant }
  secondaryAction, // { label, icon, onClick, variant }
  onExportCsv,
  className = ''
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const timeoutRef = useRef(null);

  // Sync external search value changes (e.g. clear from outside)
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  const handleSearchChange = (val) => {
    setLocalSearch(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSearchChange(val);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={`flex flex-col gap-4 p-4 bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-sm mb-6 ${className}`}>
      {/* Top Row: Search & Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            aria-label="Campo de búsqueda"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 h-10 bg-background/80 w-full"
          />
          {localSearch && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onExportCsv && (
            <Button
              variant="outline"
              onClick={onExportCsv}
              className="gap-2 h-10 bg-background/80"
              title="Exportar a CSV"
              aria-label="Exportar a CSV"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'outline'}
              onClick={secondaryAction.onClick}
              className="gap-2 h-10 shadow-sm"
              aria-label={secondaryAction.label}
            >
              {secondaryAction.icon}
              <span className="hidden sm:inline">{secondaryAction.label}</span>
            </Button>
          )}

          {primaryAction && (
            <Button
              variant={primaryAction.variant || 'default'}
              onClick={primaryAction.onClick}
              className="gap-2 h-10 shadow-sm"
              aria-label={primaryAction.label}
            >
              {primaryAction.icon || <Plus className="h-4 w-4" aria-hidden="true" />}
              <span>{primaryAction.label}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Row: Filters & Refresh */}
      {(filters.length > 0 || onRefresh) && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {filters.map((filter) => {
            const filterId = filter.id ?? filter.label;
            return (
              <div key={filterId} className="min-w-[160px] flex-1 sm:flex-none">
                <label htmlFor={`filter-${filterId}`} className="sr-only">Filtrar por {filter.label}</label>
                <select
                  id={`filter-${filterId}`}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all"
                  aria-label={filter.label}
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              title="Refrescar lista"
              aria-label="Refrescar datos"
              className="h-10 w-10 shrink-0 bg-background/80 ml-auto sm:ml-0"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

FilterBar.displayName = 'FilterBar';
