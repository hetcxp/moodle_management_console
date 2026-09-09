import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox, Loader2, Filter, X } from 'lucide-react';
import { Checkbox } from './ui/Checkbox';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';
import { DataTableToolbar } from './datatable/DataTableToolbar';
import { DataTablePagination } from './datatable/DataTablePagination';

export const DataTable = memo(({
  columns = [], // [{ header, accessor, sortKey, cell, className, filterType, filterOptions }]
  data = [],
  loading = false,
  totalCount = 0,
  page = 0,
  perPage = 20,
  onPageChange,
  sort = '',
  dir = 'DESC',
  onSortChange,
  onFilterChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions = [],
  keyField = 'id',
  emptyMessage = 'No se encontraron registros',
  className = '',
  onRowClick
}) => {
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [localFilters, setLocalFilters] = useState({});
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setOpenFilterKey(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyFilter = (key, value) => {
    const newFilters = { ...localFilters };
    if (value === '' || value === undefined || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setLocalFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const processedData = useMemo(() => {
    if (onFilterChange) return data; // Backend handles filtering
    if (Object.keys(localFilters).length === 0) return data;

    return data.filter(row => {
      return Object.entries(localFilters).every(([key, value]) => {
        if (value === '' || value == null) return true;
        const col = columns.find(c => (c.sortKey || c.accessor) === key);
        if (!col) return true;
        
        let rowValue;
        if (typeof col.accessor === 'function') {
          rowValue = col.accessor(row);
        } else if (col.accessor) {
          rowValue = row[col.accessor];
        } else {
          rowValue = row[key]; // fallback if accessor is undefined but sortKey is used
        }

        if (rowValue == null) return false;

        if (col.filterType === 'select') {
          return String(rowValue) === String(value);
        }
        return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [data, localFilters, onFilterChange, columns]);

  // Calculate selection based on processedData
  const allIdsOnPage = processedData.map((item) => item[keyField]);
  const isAllSelected = allIdsOnPage.length > 0 && allIdsOnPage.every((id) => selectedIds.includes(id));
  const isSomeSelected = allIdsOnPage.some((id) => selectedIds.includes(id)) && !isAllSelected;

  const handleSelectAll = (checked) => {
    if (checked) {
      const merged = Array.from(new Set([...selectedIds, ...allIdsOnPage]));
      onSelectionChange?.(merged);
    } else {
      const filtered = selectedIds.filter((id) => !allIdsOnPage.includes(id));
      onSelectionChange?.(filtered);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, id]);
    } else {
      onSelectionChange?.(selectedIds.filter((item) => item !== id));
    }
  };

  const handleSort = (sortKey) => {
    if (!sortKey || !onSortChange) return;
    if (sort === sortKey) {
      onSortChange(sortKey, dir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      onSortChange(sortKey, 'ASC');
    }
  };

  // If local filtering is active and no onFilterChange, we might need to adjust totalCount for display
  const displayTotalCount = onFilterChange ? totalCount : processedData.length;
  const totalPages = Math.ceil(displayTotalCount / perPage) || 1;
  const currentDataLength = onFilterChange ? data.length : processedData.length;


  return (
    <div className={cn('relative space-y-4', className)}>
      {/* Floating Bulk Actions Bar */}
      {selectable && (
        <DataTableToolbar 
          selectedIds={selectedIds} 
          onSelectionChange={onSelectionChange} 
          bulkActions={bulkActions} 
        />
      )}

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="overflow-x-auto relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-xs">
              <div className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-xl border border-border">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Cargando datos...</span>
              </div>
            </div>
          )}

          <table className="w-full text-left text-sm border-collapse" aria-busy={loading}>
            <caption className="sr-only">Tabla de datos, mostrando {processedData.length} de {displayTotalCount} registros</caption>
            <thead>
              <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {selectable && (
                  <th className="w-12 px-4 py-3.5 text-center">
                    <Checkbox
                      id="select-all-header"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Seleccionar todas las filas"
                      className={isSomeSelected ? 'bg-primary/50' : ''}
                    />
                  </th>
                )}

                {columns.map((col, idx) => {
                  const filterKey = col.sortKey || col.accessor;
                  const isSortable = !!col.sortKey;
                  const isCurrentSort = sort === col.sortKey;
                  const isFilterable = !!col.filterType && typeof filterKey === 'string';
                  const hasActiveFilter = isFilterable && localFilters[filterKey] !== undefined;

                  return (
                    <th
                      key={idx}
                      aria-sort={isSortable ? (isCurrentSort ? (dir === 'ASC' ? 'ascending' : 'descending') : 'none') : undefined}
                      className={cn(
                        'px-4 py-3.5 select-none relative',
                        isSortable && 'hover:bg-muted/70 hover:text-foreground',
                        col.className
                      )}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div 
                          className={cn("flex items-center gap-1.5 flex-1", isSortable && "cursor-pointer")}
                          onClick={() => isSortable && handleSort(col.sortKey)}
                        >
                          <span>{col.header}</span>
                          {isSortable && (
                            <span className="text-muted-foreground">
                              {isCurrentSort ? (
                                dir === 'ASC' ? (
                                  <ChevronUp className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                        {isFilterable && (
                          <div className="relative" ref={openFilterKey === filterKey ? filterRef : null}>
                            <button
                              aria-label={`Filtrar por ${col.header}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenFilterKey(openFilterKey === filterKey ? null : filterKey);
                              }}
                              className={cn(
                                "p-1 rounded transition-colors",
                                hasActiveFilter ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                              )}
                            >
                              <Filter className="h-3.5 w-3.5" />
                            </button>
                            
                            {/* Filter Popover */}
                            {openFilterKey === filterKey && (
                              <div className="absolute z-30 mt-2 p-3 bg-card border border-border rounded-xl shadow-xl top-full right-0 w-56 normal-case tracking-normal font-normal">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-foreground">Filtrar {col.header}</span>
                                  {hasActiveFilter && (
                                    <button 
                                      aria-label="Limpiar filtro"
                                      onClick={() => handleApplyFilter(filterKey, '')}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                      title="Limpiar filtro"
                                    >
                                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                                {col.filterType === 'select' ? (
                                  <select
                                    className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={localFilters[filterKey] || ''}
                                    onChange={(e) => handleApplyFilter(filterKey, e.target.value)}
                                  >
                                    <option value="">Todos</option>
                                    {(col.filterOptions || []).map((opt, i) => (
                                      <option key={i} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="flex gap-2">
                                    <Input 
                                      placeholder="Buscar..." 
                                      defaultValue={localFilters[filterKey] || ''}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleApplyFilter(filterKey, e.target.value);
                                          setOpenFilterKey(null);
                                        }
                                      }}
                                      onBlur={(e) => handleApplyFilter(filterKey, e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/50">
              {processedData.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="py-16 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Inbox className="h-10 w-10 stroke-[1.2] text-muted-foreground opacity-60" aria-hidden="true" />
                      {Object.keys(localFilters).length > 0 ? (
                        <>
                          <p className="text-sm font-medium text-muted-foreground">Sin resultados para los filtros aplicados</p>
                          <button
                            type="button"
                            onClick={() => {
                              setLocalFilters({});
                              if (onFilterChange) onFilterChange({});
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Limpiar filtros
                          </button>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                processedData.map((row, index) => {
                  const rowId = row[keyField];
                  const isSelected = selectedIds.includes(rowId);

                  return (
                    <tr
                      key={rowId || index}
                      onClick={(e) => {
                        if (onRowClick && !e.target.closest('a, button, input, select, textarea, [role="button"]')) {
                          onRowClick(row);
                        }
                      }}
                      className={cn(
                        'transition-colors hover:bg-muted/30 group',
                        isSelected && 'bg-primary/5 hover:bg-primary/10',
                        onRowClick && 'cursor-pointer'
                      )}
                    >
                      {selectable && (
                        <td 
                          className="w-12 px-4 py-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            id={`select-${rowId}`}
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                            aria-label={`Seleccionar fila ${rowId}`}
                          />
                        </td>
                      )}

                      {columns.map((col, colIdx) => (
                        <td key={colIdx} className={cn('px-4 py-3.5 align-middle', col.className)}>
                          {col.cell
                            ? col.cell(row)
                            : typeof col.accessor === 'function'
                            ? col.accessor(row)
                            : row[col.accessor]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <DataTablePagination 
          page={page}
          perPage={perPage}
          currentDataLength={currentDataLength}
          displayTotalCount={displayTotalCount}
          totalPages={totalPages}
          loading={loading}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
});

DataTable.displayName = 'DataTable';
