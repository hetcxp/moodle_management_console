import React from 'react';
import { Button } from '../ui/Button';

export const DataTableToolbar = ({ selectedIds = [], onSelectionChange, bulkActions = [] }) => {
  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 p-3 px-4 bg-card/95 text-card-foreground backdrop-blur-md rounded-xl shadow-xl border border-border animate-fadeIn">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
          {selectedIds.length}
        </span>
        <span className="text-sm font-medium">elementos seleccionados</span>
        <button
          onClick={() => onSelectionChange?.([])}
          className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
        >
          Deseleccionar todos
        </button>
      </div>

      <div className="flex items-center gap-2">
        {bulkActions.map((action, idx) => (
          <Button
            key={idx}
            size="sm"
            variant={action.variant || 'default'}
            onClick={() => action.onClick(selectedIds)}
            className="gap-1.5 h-8 text-xs font-semibold"
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
