import { useState } from 'react';
import { useCourses, useCategoriesFlat, useCourseAction } from '../../hooks/useAdminerQueries';
import { usePermission } from '../../hooks/usePermission';
import { useEntityListState } from '../../hooks/useEntityListState';
import { AdminerApi } from '../../services/adminer-api';
import { useToast } from '../../components/ui/Toast';
import { API_CONFIG } from '../../config/api';
import { useCoursesExport } from './useCoursesExport';

export function useCoursesState() {
  const { addToast } = useToast();

  const hasCreateCourse = usePermission('can_create_courses');
  const hasUpdateCourse = usePermission('can_update_courses');
  const hasManageCategory = usePermission('can_manage_categories');
  const hasDeleteCourse = usePermission('can_delete_courses');

  const {
    page, setPage, perPage, sort, setSort, dir, setDir, search, setSearch, filters, setFilters,
    selectedIds, setSelectedIds, clearSelection,
    deleteLoading, setDeleteLoading,
    deleteConfirmOpen, setDeleteConfirmOpen,
    itemsToDelete: coursesToDeleteRaw, setItemsToDelete: _setCoursesToDelete,
    openDelete: handleOpenDeleteModal,
  } = useEntityListState({ defaultSort: 'timecreated', defaultDir: 'DESC', defaultPerPage: 20 });

  const coursesToDelete = coursesToDeleteRaw || [];

  const [categoryFilter, setCategoryFilter] = useState('0');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [emptyOnly, setEmptyOnly] = useState(false);

  const exporter = useCoursesExport({ sort, dir, search, categoryFilter, visibilityFilter });

  const { data: categoriesData } = useCategoriesFlat();
  const categoriesList = categoriesData?.categories || [];

  const { data: coursesData, isLoading, isFetching, refetch } = useCourses({
    page,
    perpage: perPage,
    sort,
    dir,
    search,
    category: parseInt(categoryFilter, 10) || 0,
    visibility: parseInt(visibilityFilter, 10) || -1,
    filters: { ...filters, empty_only: emptyOnly ? 1 : 0 },
  });

  const courses = coursesData?.courses || [];
  const totalCount = coursesData?.totalcount || 0;
  const kpis = coursesData?.kpis || null;
  const loading = isLoading || isFetching;

  const { mutateAsync: performCourseAction } = useCourseAction();

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [coursesToMove, setCoursesToMove] = useState([]);

  const handleViewInMoodle = async (courseId) => {
    try {
      const destination = `/course/view.php?id=${courseId}`;
      const res = await AdminerApi.getAutologinUrl(destination);
      if (res && res.url) {
        window.open(res.url, '_blank');
      } else {
        window.open(`${API_CONFIG.baseUrl}${destination}`, '_blank');
      }
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'No se pudo generar la URL de acceso directo.' });
      window.open(`${API_CONFIG.baseUrl}/course/view.php?id=${courseId}`, '_blank');
    }
  };

  const handleBulkHide = async (ids = selectedIds) => {
    try {
      await performCourseAction({ action: 'hide', courseids: ids });
      addToast({ type: 'success', title: 'Cursos ocultados', description: `Se han ocultado ${ids.length} curso(s).` });
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkShow = async (ids = selectedIds) => {
    try {
      await performCourseAction({ action: 'show', courseids: ids });
      addToast({ type: 'success', title: 'Cursos visibles', description: `Se han hecho visibles ${ids.length} curso(s).` });
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleOpenMoveModal = (ids = selectedIds) => { setCoursesToMove(ids); setMoveModalOpen(true); };

  const handleExecuteDelete = async () => {
    setDeleteLoading(true);
    try {
      await performCourseAction({ action: 'delete', courseids: coursesToDelete });
      addToast({ type: 'success', title: 'Cursos eliminados', description: `Se eliminaron ${coursesToDelete.length} curso(s).` });
      setDeleteConfirmOpen(false);
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar cursos', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    courses, totalCount, kpis, loading, categoriesList,
    page, setPage, perPage, sort, dir, setSort, setDir, setFilters,
    search, setSearch, categoryFilter, setCategoryFilter, visibilityFilter, setVisibilityFilter, emptyOnly, setEmptyOnly,
    selectedIds, setSelectedIds, clearSelection,
    hasCreateCourse, hasUpdateCourse, hasManageCategory, hasDeleteCourse,
    handleViewInMoodle, handleBulkHide, handleBulkShow, handleOpenMoveModal, handleOpenDeleteModal, handleExecuteDelete,
    handleExport: exporter.handleExport,
    csvModalOpen, setCsvModalOpen,
    exportModalOpen: exporter.exportModalOpen, setExportModalOpen: exporter.setExportModalOpen,
    exportOption: exporter.exportOption, setExportOption: exporter.setExportOption,
    exportLoading: exporter.exportLoading,
    createModalOpen, setCreateModalOpen,
    moveModalOpen, setMoveModalOpen, coursesToMove,
    deleteConfirmOpen, setDeleteConfirmOpen, coursesToDelete, deleteLoading,
    refetch,
  };
}
