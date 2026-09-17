import { useState, useCallback } from 'react';
import { useBulkSelection } from './useBulkSelection';

/**
 * Hook base de estado para vistas de listado/CRUD.
 */
export function useEntityListState({
  defaultSort = 'id',
  defaultDir = 'ASC',
  defaultPerPage = 20,
  defaultFilters = {},
} = {}) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [sort, setSort] = useState(defaultSort);
  const [dir, setDir] = useState(defaultDir);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(defaultFilters);

  const { selectedIds, setSelectedIds, clearSelection, hasSelection, selectionCount } = useBulkSelection();

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const openCreate = useCallback(() => { setEditingItem(null); setModalOpen(true); }, []);
  const openEdit = useCallback((item) => { setEditingItem(item); setModalOpen(true); }, []);
  const closeModal = useCallback(() => { setEditingItem(null); setModalOpen(false); }, []);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState(null);

  const openDelete = useCallback((items) => { setItemsToDelete(items); setDeleteConfirmOpen(true); }, []);
  const closeDeleteConfirm = useCallback(() => { setItemsToDelete(null); setDeleteConfirmOpen(false); }, []);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [exportLoading, setExportLoading] = useState(false);

  const withToastAction = useCallback((asyncFn, { successMsg, errorTitle = 'Error' } = {}, addToast) => {
    return async (...args) => {
      try {
        const res = await asyncFn(...args);
        if (successMsg && addToast) addToast({ type: 'success', title: successMsg });
        return res;
      } catch (err) {
        if (addToast) addToast({ type: 'error', title: errorTitle, description: err?.message || 'Error inesperado' });
        throw err;
      }
    };
  }, []);

  return {
    page, setPage, perPage, setPerPage, sort, setSort, dir, setDir,
    search, setSearch, filters, setFilters,
    selectedIds, setSelectedIds, clearSelection, hasSelection, selectionCount,
    deleteLoading, setDeleteLoading,
    modalOpen, setModalOpen, editingItem, setEditingItem, openCreate, openEdit, closeModal,
    deleteConfirmOpen, setDeleteConfirmOpen, itemsToDelete, setItemsToDelete, openDelete, closeDeleteConfirm,
    exportModalOpen, setExportModalOpen, exportOption, setExportOption, exportLoading, setExportLoading,
    withToastAction,
  };
}
