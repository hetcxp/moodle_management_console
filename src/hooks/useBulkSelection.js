import { useState } from 'react';

export function useBulkSelection(initial = []) {
  const [selectedIds, setSelectedIds] = useState(initial);

  const clearSelection = () => setSelectedIds([]);
  
  return {
    selectedIds,
    setSelectedIds,
    clearSelection,
    hasSelection: selectedIds.length > 0,
    selectionCount: selectedIds.length
  };
}
