import React, { useState, useEffect } from 'react';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Loader2, Search, ChevronLeft, ChevronRight, Inbox, DownloadCloud } from 'lucide-react';

export const ReportSelectorModal = ({
  open,
  onClose,
  title,
  description,
  exporting,
  onExport,
  search,
  setSearch,
  page,
  setPage,
  totalPages,
  loading,
  data = [],
  renderItem,
  emptyTitle = "Sin resultados",
  emptyMessage = "No se encontraron elementos con los filtros actuales.",
  extraFilters = null,
  allSelectedMessage = "Seleccionar página actual",
  warningMessage = null
}) => {
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
    }
  }, [open]);

  const handleToggleRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (data.length === 0) return;
    
    const pageIds = data.map(item => item.id);
    const allCurrentPageSelected = pageIds.every(id => selectedIds.includes(id));

    if (allCurrentPageSelected) {
      // Unselect current page
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      // Select current page
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const allCurrentPageSelected = data.length > 0 && data.every(item => selectedIds.includes(item.id));

  return (
    <Dialog
      open={open}
      onClose={!exporting ? onClose : undefined}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={exporting}>Cancelar</Button>
          <Button onClick={() => onExport(selectedIds)} disabled={selectedIds.length === 0 || exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando CSV...
              </>
            ) : (
              <>
                <DownloadCloud className="h-4 w-4 mr-2" />
                Exportar Detalle ({selectedIds.length})
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-2">
        {warningMessage && selectedIds.length > 5 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg p-3 text-xs flex gap-2 items-start">
            <span className="text-base leading-none">⚠️</span>
            <p>{warningMessage}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {setSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); if (setPage) setPage(0); }}
                disabled={exporting}
              />
            </div>
          )}
          {extraFilters}
        </div>

        {/* List */}
        <div className="relative border border-border/80 rounded-lg overflow-hidden bg-card min-h-[300px] max-h-[400px] flex flex-col">
          {loading && data.length === 0 && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          
          <div className="bg-muted/50 border-b border-border/50 p-2 px-3 flex items-center gap-3">
             <Checkbox 
                checked={allCurrentPageSelected} 
                onChange={handleSelectAll} 
                disabled={data.length === 0 || exporting}
             />
             <span className="text-xs font-medium text-muted-foreground">{allSelectedMessage}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {data.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Inbox className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{emptyTitle}</h3>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  {emptyMessage}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {data.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5' : ''} ${exporting ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={() => !exporting && handleToggleRow(item.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}}
                        className="pointer-events-none"
                      />
                      {renderItem(item)}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Pagination */}
        {setPage && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Mostrando página {page + 1} de {totalPages || 1}</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 0 || loading || exporting}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page >= ((totalPages || 1) - 1) || loading || exporting}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
