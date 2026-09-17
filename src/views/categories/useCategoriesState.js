import { useMemo } from 'react';
import { useCategoriesFlat, useCategoryAction } from '../../hooks/useAdminerQueries';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/ui/Toast';
import { useEntityListState } from '../../hooks/useEntityListState';
import { useCategoriesFilters } from './useCategoriesFilters';
import { useCategoriesExport } from './useCategoriesExport';

export const useCategoriesState = () => {
  const { addToast } = useToast();
  const hasManageCategory = usePermission('can_manage_categories');
  const { data: flatCatsData, isLoading: loading, refetch: loadData } = useCategoriesFlat();
  const categoryAction = useCategoryAction();

  const flatCategories = useMemo(() => flatCatsData?.categories || [], [flatCatsData?.categories]);
  const filters = useCategoriesFilters(flatCategories);
  const exporter = useCategoriesExport({ filteredCategories: filters.filteredCategories, addToast });

  const {
    modalOpen, setModalOpen,
    editingItem: editingCategory, setEditingItem: setEditingCategory,
    openCreate: handleOpenCreate, openEdit: handleOpenEdit,
    deleteConfirmOpen, setDeleteConfirmOpen,
    itemsToDelete: categoryToDelete, setItemsToDelete: setCategoryToDelete,
    deleteLoading, setDeleteLoading,
  } = useEntityListState();

  const handleToggleVisibility = async (id, isVisible) => {
    try {
      await categoryAction.mutateAsync({ action: isVisible ? 'hide' : 'show', categoryids: [Number(id)] });
      addToast({ type: 'success', title: isVisible ? 'Categoría ocultada' : 'Categoría visible' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkAction = async (action, ids) => {
    try {
      await categoryAction.mutateAsync({ action, categoryids: ids.map(Number) });
      addToast({ type: 'success', title: `Categorías ${action === 'hide' ? 'ocultadas' : action === 'delete' ? 'eliminadas' : 'visibles'}` });
      filters.clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setDeleteLoading(true);
    try {
      await categoryAction.mutateAsync({ action: 'delete', categoryids: [categoryToDelete.id] });
      addToast({ type: 'success', title: 'Categoría eliminada' });
      setDeleteConfirmOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const visibleCategories = useMemo(() => flatCategories.filter((c) => c.visible === 1).length, [flatCategories]);
  const hiddenCategories = useMemo(() => flatCategories.filter((c) => c.visible === 0).length, [flatCategories]);
  const totalCourses = useMemo(() => flatCategories.reduce((sum, cat) => sum + (cat.coursecount || 0), 0), [flatCategories]);

  return {
    flatCategories, paginatedData: filters.paginatedData, loading, loadData,
    page: filters.page, setPage: filters.setPage, perPage: filters.perPage,
    sort: filters.sort, setSort: filters.setSort, dir: filters.dir, setDir: filters.setDir,
    search: filters.search, setSearch: filters.setSearch,
    visibilityFilter: filters.visibilityFilter, setVisibilityFilter: filters.setVisibilityFilter,
    selectedIds: filters.selectedIds, setSelectedIds: filters.setSelectedIds, clearSelection: filters.clearSelection,
    hasManageCategory, modalOpen, setModalOpen, editingCategory,
    deleteConfirmOpen, setDeleteConfirmOpen, categoryToDelete, setCategoryToDelete, deleteLoading,
    exportModalOpen: exporter.exportModalOpen, setExportModalOpen: exporter.setExportModalOpen,
    exportOption: exporter.exportOption, setExportOption: exporter.setExportOption,
    exportLoading: exporter.exportLoading,
    totalCategories: flatCategories.length, visibleCategories, hiddenCategories, totalCourses,
    totalCount: filters.totalCount,
    handleOpenCreate, handleOpenEdit, handleToggleVisibility, handleBulkAction, handleDelete,
    handleExport: exporter.handleExport,
  };
};
