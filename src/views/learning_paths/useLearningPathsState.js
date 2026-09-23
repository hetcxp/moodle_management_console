import { useMemo } from 'react';
import {
  useLearningPaths,
  useDeleteLearningPath,
  useCheckLpDependencies,
} from '../../hooks/useAdminerQueries';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/ui/Toast';
import { useEntityListState } from '../../hooks/useEntityListState';
import { AdminerApi } from '../../services/adminer-api';
import { API_CONFIG } from '../../config/api';

export function useLearningPathsState() {
  const { addToast } = useToast();

  const hasCreatePerm = usePermission('can_create_courses');
  const hasDeletePerm = usePermission('can_delete_courses');

  const {
    page, setPage, perPage, setPerPage, search, setSearch,
    modalOpen: createModalOpen, setModalOpen: setCreateModalOpen,
    deleteConfirmOpen, setDeleteConfirmOpen,
    itemsToDelete: pathToDelete, setItemsToDelete: setPathToDelete,
  } = useEntityListState({ defaultPerPage: 20 });

  // Verificación de dependencias de plugins
  const { data: depData, isLoading: depsLoading } = useCheckLpDependencies();
  const dependencies = useMemo(() => {
    return {
      isReady: depData?.is_ready ?? true,
      missing: depData?.missing ?? [],
      loading: depsLoading,
    };
  }, [depData, depsLoading]);

  // Consulta de rutas
  const {
    data: pathsData,
    isLoading,
    isFetching,
    refetch,
  } = useLearningPaths({
    page,
    perpage: perPage,
    search,
  });

  const paths = useMemo(() => pathsData?.items || [], [pathsData?.items]);
  const totalCount = pathsData?.total || 0;
  const loading = isLoading || isFetching;

  // KPIs calculados
  const kpis = useMemo(() => {
    const visibleCount = paths.filter((p) => p.visible === 1).length;
    const hiddenCount = paths.filter((p) => p.visible === 0).length;
    const totalSubcourses = paths.reduce((acc, p) => acc + (p.subcourse_count || 0), 0);
    const avgSub = paths.length > 0 ? (totalSubcourses / paths.length).toFixed(1) : '0';

    return [
      { title: 'Total Rutas', value: totalCount, badgeColor: 'bg-primary/10 text-primary' },
      { title: 'Visibles', value: visibleCount, badgeColor: 'bg-emerald-500/10 text-emerald-500' },
      { title: 'Ocultas', value: hiddenCount, badgeColor: 'bg-amber-500/10 text-amber-500' },
      { title: 'Subcursos Promedio', value: avgSub, badgeColor: 'bg-blue-500/10 text-blue-500' },
    ];
  }, [paths, totalCount]);

  const deleteMutation = useDeleteLearningPath();

  const handleDeleteRequest = (path) => {
    if (path.enrolled_count > 0) {
      addToast({
        title: 'Acción bloqueada',
        message: `No se puede eliminar la ruta "${path.fullname}": contiene ${path.enrolled_count} estudiantes matriculados. Solo se permite ocultarla.`,
        type: 'error',
      });
      return;
    }
    setPathToDelete(path);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pathToDelete) return;
    try {
      const res = await deleteMutation.mutateAsync(pathToDelete.id);
      if (res?.action_taken === 'hidden') {
        addToast({
          title: 'Ruta Ocultada',
          message: `La ruta contenía registros de estudiantes y fue ocultada por seguridad en lugar de ser borrada.`,
          type: 'warning',
        });
      } else {
        addToast({
          title: 'Ruta Eliminada',
          message: `La ruta "${pathToDelete.fullname}" fue eliminada exitosamente.`,
          type: 'success',
        });
      }
      setDeleteConfirmOpen(false);
      setPathToDelete(null);
      refetch();
    } catch (err) {
      addToast({
        title: 'Error al eliminar',
        message: err?.message || 'No se pudo eliminar la ruta.',
        type: 'error',
      });
    }
  };

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
      addToast({ type: 'error', title: 'Error', message: 'No se pudo generar la URL de acceso directo a Moodle.' });
      window.open(`${API_CONFIG.baseUrl}/course/view.php?id=${courseId}`, '_blank');
    }
  };

  return {
    paths,
    totalCount,
    loading,
    page,
    perPage,
    search,
    kpis,
    dependencies,
    hasCreatePerm,
    hasDeletePerm,
    createModalOpen,
    deleteConfirmOpen,
    pathToDelete,
    deleteLoading: deleteMutation.isPending,
    setPage,
    setPerPage,
    setSearch,
    setCreateModalOpen,
    setDeleteConfirmOpen,
    refetch,
    handleDeleteRequest,
    handleConfirmDelete,
    handleViewInMoodle,
  };
}
