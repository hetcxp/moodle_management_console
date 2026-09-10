import { useState, useEffect } from 'react';
import { useCategoriesFlat, useCategoryAction } from '../../hooks/useAdminerQueries';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';
import { exportToCsv } from '../../components/CsvExporter';

export const useCategoriesState = () => {
  const { addToast } = useToast();
  const hasManageCategory = usePermission('can_manage_categories');

  const { data: flatCatsData, isLoading: loading, refetch: loadData } = useCategoriesFlat();
  const categoryAction = useCategoryAction();

  const flatCategories = flatCatsData?.categories || [];

  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const { selectedIds, setSelectedIds, clearSelection } = useBulkSelection();

  // Filtering & Sorting
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [sort, setSort] = useState('name');
  const [dir, setDir] = useState('ASC');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [exportLoading, setExportLoading] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, visibilityFilter, sort, dir]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleToggleVisibility = async (id, isVisible) => {
    const action = isVisible ? 'hide' : 'show';
    try {
      await categoryAction.mutateAsync({ action, categoryids: [Number(id)] });
      addToast({ type: 'success', title: isVisible ? 'Categoría ocultada' : 'Categoría visible' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkAction = async (action, ids) => {
    try {
      await categoryAction.mutateAsync({ action, categoryids: ids.map(Number) });
      addToast({
        type: 'success',
        title: `Categorías ${action === 'hide' ? 'ocultadas' : action === 'delete' ? 'eliminadas' : 'visibles'}`
      });
      clearSelection();
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

  // KPIs
  const totalCategories = flatCategories.length;
  const visibleCategories = flatCategories.filter((c) => c.visible === 1).length;
  const hiddenCategories = flatCategories.filter((c) => c.visible === 0).length;
  const totalCourses = flatCategories.reduce((sum, cat) => sum + (cat.coursecount || 0), 0);

  // Filter & Sort
  const filteredCategories = flatCategories.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesVis = visibilityFilter === '-1' || String(c.visible) === visibilityFilter;
    return matchesSearch && matchesVis;
  });

  filteredCategories.sort((a, b) => {
    let valA = a[sort];
    let valB = b[sort];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return dir === 'ASC' ? -1 : 1;
    if (valA > valB) return dir === 'ASC' ? 1 : -1;
    return 0;
  });

  const totalCount = filteredCategories.length;
  const paginatedData = filteredCategories.slice(page * perPage, (page + 1) * perPage);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      if (exportOption === 'visible') {
        const columns = [
          { label: 'ID', accessor: 'id' },
          { label: 'Categoría', accessor: 'name' },
          { label: 'Subcategoría de', accessor: 'parentname' },
          { label: 'Cursos', accessor: 'coursecount' },
          { label: 'Estado', accessor: (row) => (row.visible === 1 ? 'Visible' : 'Oculto') },
          { label: 'Progreso (%)', accessor: (row) => row.progress || 0 }
        ];
        exportToCsv('categorias_moodle', filteredCategories, columns);
      } else {
        const exportData = [];
        for (const cat of filteredCategories) {
          try {
            const detail = await AdminerApi.getCategoryDetail(cat.id);
            if (detail.courses && detail.courses.length > 0) {
              for (const course of detail.courses) {
                exportData.push({
                  cat_id: cat.id,
                  cat_name: cat.name,
                  cat_parentname: cat.parentname,
                  cat_visible: cat.visible === 1 ? 'Visible' : 'Oculto',
                  cat_progress: cat.progress || 0,
                  course_id: course.id,
                  course_name: course.fullname || course.name,
                  course_progress: course.progress || 0
                });
              }
            } else {
              exportData.push({
                cat_id: cat.id,
                cat_name: cat.name,
                cat_parentname: cat.parentname,
                cat_visible: cat.visible === 1 ? 'Visible' : 'Oculto',
                cat_progress: cat.progress || 0,
                course_id: '',
                course_name: '',
                course_progress: ''
              });
            }
          } catch (e) {
            if (import.meta.env.DEV) console.error('Error fetching detail for category', cat.id, e);
          }
        }

        const columns = [
          { label: 'ID Categoría', accessor: 'cat_id' },
          { label: 'Categoría', accessor: 'cat_name' },
          { label: 'Subcategoría de', accessor: 'cat_parentname' },
          { label: 'Estado Categoría', accessor: 'cat_visible' },
          { label: 'Progreso Categoría (%)', accessor: 'cat_progress' },
          { label: 'ID Curso', accessor: 'course_id' },
          { label: 'Curso', accessor: 'course_name' },
          { label: 'Progreso Curso (%)', accessor: 'course_progress' }
        ];
        exportToCsv('categorias_cursos_moodle', exportData, columns);
      }
      setExportModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error en la exportación', description: err.message });
    } finally {
      setExportLoading(false);
    }
  };

  return {
    flatCategories,
    paginatedData,
    loading,
    loadData,
    page,
    setPage,
    perPage,
    sort,
    setSort,
    dir,
    setDir,
    search,
    setSearch,
    visibilityFilter,
    setVisibilityFilter,
    selectedIds,
    setSelectedIds,
    clearSelection,
    hasManageCategory,
    modalOpen,
    setModalOpen,
    editingCategory,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    categoryToDelete,
    setCategoryToDelete,
    deleteLoading,
    exportModalOpen,
    setExportModalOpen,
    exportOption,
    setExportOption,
    exportLoading,
    totalCategories,
    visibleCategories,
    hiddenCategories,
    totalCourses,
    totalCount,
    handleOpenCreate,
    handleOpenEdit,
    handleToggleVisibility,
    handleBulkAction,
    handleDelete,
    handleExport
  };
};
