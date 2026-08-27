import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const DataTablePagination = ({ 
  page, 
  perPage, 
  currentDataLength, 
  displayTotalCount, 
  totalPages, 
  loading, 
  onPageChange 
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/70 bg-muted/20 text-xs text-muted-foreground">
      <div>
        Mostrando <span className="font-semibold text-foreground">{currentDataLength > 0 ? page * perPage + 1 : 0}</span> a{' '}
        <span className="font-semibold text-foreground">{Math.min((page + 1) * perPage, displayTotalCount)}</span> de{' '}
        <span className="font-semibold text-foreground">{displayTotalCount}</span> resultados
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0 || loading}
          onClick={() => onPageChange?.(page - 1)}
          className="h-8 px-2 gap-1 text-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Anterior</span>
        </Button>

        <div className="px-3 py-1 font-medium text-foreground">
          Página {page + 1} de {totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1 || loading}
          onClick={() => onPageChange?.(page + 1)}
          className="h-8 px-2 gap-1 text-xs"
        >
          <span>Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
