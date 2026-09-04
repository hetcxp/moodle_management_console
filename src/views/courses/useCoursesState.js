import { useState } from 'react';
import { useCourses, useCategoriesFlat, useCourseAction } from '../../hooks/useAdminerQueries';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { usePaginatedExport } from '../../hooks/usePaginatedExport';
import { usePermission } from '../../hooks/usePermission';
import { runWithConcurrency } from '../../lib/concurrency';
import { AdminerApi } from '../../services/adminer-api';
import { useToast } from '../../components/ui/Toast';
import { formatDateOnly } from '../../lib/utils';
import { API_CONFIG } from '../../config/api';

export function useCoursesState() {
  const { addToast } = useToast();

  const hasCreateCourse = usePermission('can_create_courses');
  const hasUpdateCourse = usePermission('can_update_courses');
  const hasManageCategory = usePermission('can_manage_categories');
  const hasDeleteCourse = usePermission('can_delete_courses');

  const [page, setPage] = useState(0);
  const [perPage] = useState(20);
  const [sort, setSort] = useState('timecreated');
  const [dir, setDir] = useState('DESC');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('0');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [filters, setFilters] = useState({});
  const [emptyOnly, setEmptyOnly] = useState(false);

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
    filters: { ...filters, empty_only: emptyOnly ? 1 : 0 }
  });

  const courses = coursesData?.courses || [];
  const totalCount = coursesData?.totalcount || 0;
  const kpis = coursesData?.kpis || null;
  const loading = isLoading || isFetching;

  const { mutateAsync: performCourseAction } = useCourseAction();
  const { selectedIds, setSelectedIds, clearSelection } = useBulkSelection();
  const { exportLoading, handleExport: executeExport } = usePaginatedExport();

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [coursesToMove, setCoursesToMove] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [coursesToDelete, setCoursesToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
  const handleOpenDeleteModal = (ids = selectedIds) => { setCoursesToDelete(ids); setDeleteConfirmOpen(true); };

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

  const handleExport = () => {
    const columnsForExport = [
      { label: 'ID', accessor: 'id' },
      { label: 'Nombre Completo', accessor: 'fullname' },
      { label: 'Nombre Corto', accessor: 'shortname' },
      { label: 'Categoría', accessor: 'categoryname' },
      { label: 'Estado', accessor: (row) => (row.visible === 1 ? 'Visible' : 'Oculto') },
      { label: 'Inscritos', accessor: 'enrolledcount' },
      { label: 'Completados', accessor: 'completedcount' },
      { label: 'Cohortes', accessor: 'cohortscount' },
      { label: 'Progreso (%)', accessor: 'progress_percent' },
      { label: 'Creado', accessor: (row) => formatDateOnly(row.timecreated) },
      { label: 'Inicio', accessor: (row) => row.startdate > 0 ? formatDateOnly(row.startdate) : 'No definida' },
      { label: 'Fin', accessor: (row) => row.enddate > 0 ? formatDateOnly(row.enddate) : 'No definida' }
    ];

    const columnsDetailed = [
      { label: 'ID Curso', accessor: 'course_id' },
      { label: 'Curso', accessor: 'course_fullname' },
      { label: 'Nombre Corto', accessor: 'course_shortname' },
      { label: 'Categoría', accessor: 'course_category' },
      { label: 'Estado Curso', accessor: 'course_visible' },
      { label: 'Progreso Prom. Curso (%)', accessor: 'course_progress' },
      { label: 'ID Usuario', accessor: 'user_id' },
      { label: 'Nombre Usuario', accessor: 'user_fullname' },
      { label: 'Email', accessor: 'user_email' },
      { label: 'Rol', accessor: 'user_roles' },
      { label: 'Estado Usuario', accessor: 'user_status' },
      { label: 'Progreso Usuario (%)', accessor: 'user_progress' }
    ];

    const processDetail = async (coursesData) => {
      const detailedRowsArrays = await runWithConcurrency(coursesData, 5, async (course) => {
        try {
          const detail = await AdminerApi.getCourseDetail(course.id);
          const users = detail?.users || [];
          if (users.length === 0) {
            return [{ course_id: course.id, course_fullname: course.fullname, course_shortname: course.shortname, course_category: course.categoryname, course_visible: course.visible === 1 ? 'Visible' : 'Oculto', course_progress: course.progress_percent, user_id: '', user_fullname: '', user_email: '', user_progress: '', user_status: '', user_roles: '' }];
          }
          return users.map((u) => ({
            course_id: course.id, course_fullname: course.fullname, course_shortname: course.shortname,
            course_category: course.categoryname, course_visible: course.visible === 1 ? 'Visible' : 'Oculto',
            course_progress: course.progress_percent, user_id: u.id, user_fullname: u.fullname,
            user_email: u.email, user_roles: (u.roles || []).join(', '),
            user_status: u.is_active === 1 ? 'Activo' : 'Suspendido', user_progress: u.progress || 0
          }));
        } catch (e) {
          if (import.meta.env.DEV) console.warn('[Export Detail Error] Course ID:', course.id, e);
          return [{ course_id: course.id, course_fullname: course.fullname, course_shortname: course.shortname, course_category: course.categoryname, course_visible: course.visible === 1 ? 'Visible' : 'Oculto', course_progress: course.progress_percent, user_id: '', user_fullname: 'Error al obtener usuarios', user_email: '', user_progress: '', user_status: '', user_roles: '' }];
        }
      });
      return detailedRowsArrays.flat();
    };

    executeExport({
      fetchFn: AdminerApi.getCourses,
      params: { sort, dir, search, category: parseInt(categoryFilter, 10) || 0, visibility: parseInt(visibilityFilter, 10) || -1 },
      filename: exportOption === 'visible' ? 'cursos_moodle' : 'cursos_usuarios_moodle',
      columns: exportOption === 'visible' ? columnsForExport : columnsDetailed,
      processData: exportOption === 'visible' ? null : processDetail
    }).then(() => setExportModalOpen(false));
  };

  return {
    // Data
    courses, totalCount, kpis, loading, categoriesList,
    // Pagination & Sort
    page, setPage, perPage, sort, dir, setSort, setDir, setFilters,
    // Filters
    search, setSearch, categoryFilter, setCategoryFilter, visibilityFilter, setVisibilityFilter, emptyOnly, setEmptyOnly,
    // Selection
    selectedIds, setSelectedIds, clearSelection,
    // Permissions
    hasCreateCourse, hasUpdateCourse, hasManageCategory, hasDeleteCourse,
    // Actions
    handleViewInMoodle, handleBulkHide, handleBulkShow, handleOpenMoveModal, handleOpenDeleteModal, handleExecuteDelete, handleExport,
    // Modals state
    csvModalOpen, setCsvModalOpen,
    exportModalOpen, setExportModalOpen, exportOption, setExportOption, exportLoading,
    createModalOpen, setCreateModalOpen,
    moveModalOpen, setMoveModalOpen, coursesToMove,
    deleteConfirmOpen, setDeleteConfirmOpen, coursesToDelete, deleteLoading,
    // Refetch
    refetch,
  };
}
