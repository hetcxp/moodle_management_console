import { useState, useEffect } from 'react';
import {
  useLearningPathDetail,
  useUpdateLpStructure,
  useManageLpEnrolments,
  useDeleteLearningPath,
} from '../../hooks/useAdminerQueries';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';
import { API_CONFIG } from '../../config/api';

export function useLearningPathDetailState(id, onNavigateBack) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('structure');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isStructureDirty, setIsStructureDirty] = useState(false);
  const [structureDraft, setStructureDraft] = useState(null);

  const {
    data: path,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useLearningPathDetail(id);

  const updateStructureMutation = useUpdateLpStructure();
  const manageEnrolmentsMutation = useManageLpEnrolments();
  const deleteMutation = useDeleteLearningPath();

  // Alerta nativa antes de recargar o cerrar pestaña del navegador si hay cambios sin guardar
  useEffect(() => {
    if (!isStructureDirty) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStructureDirty]);

  const handleSaveStructure = async ({ subcourse_course_ids, enforce_sequence }) => {
    try {
      await updateStructureMutation.mutateAsync({
        id,
        subcourse_course_ids,
        enforce_sequence,
      });
      addToast({
        title: 'Estructura Guardada',
        message: 'La secuencia formativa y las reglas de prelación se actualizaron con éxito.',
        type: 'success',
      });
      setIsStructureDirty(false);
      refetch();
      return true;
    } catch (err) {
      addToast({
        title: 'Error al actualizar estructura',
        message: err?.message || 'No se pudo guardar la estructura de la ruta.',
        type: 'error',
      });
      return false;
    }
  };

  const handleAssignCohorts = async (cohortids) => {
    try {
      await manageEnrolmentsMutation.mutateAsync({
        id,
        action: 'assign',
        cohortids,
      });
      addToast({
        title: 'Cohorte Asignada',
        message: 'La cohorte fue asignada a la ruta y la sincronización con los subcursos fue programada.',
        type: 'success',
      });
      refetch();
    } catch (err) {
      addToast({
        title: 'Error al asignar cohorte',
        message: err?.message || 'No se pudo asignar la cohorte.',
        type: 'error',
      });
    }
  };

  const handleRemoveCohort = async (cohortid) => {
    try {
      await manageEnrolmentsMutation.mutateAsync({
        id,
        action: 'remove',
        cohortids: [cohortid],
      });
      addToast({
        title: 'Cohorte Desvinculada',
        message: 'La cohorte fue removida de la ruta.',
        type: 'info',
      });
      refetch();
    } catch (err) {
      addToast({
        title: 'Error al desvincular',
        message: err?.message || 'No se pudo remover la cohorte.',
        type: 'error',
      });
    }
  };

  const handleAssignUsers = async (userids) => {
    try {
      await manageEnrolmentsMutation.mutateAsync({
        id,
        action: 'assign',
        userids,
      });
      addToast({
        title: 'Usuarios Matriculados',
        message: `${userids.length === 1 ? 'El usuario fue matriculado' : 'Los usuarios fueron matriculados'} con éxito en la ruta de aprendizaje.`,
        type: 'success',
      });
      refetch();
    } catch (err) {
      addToast({
        title: 'Error al matricular usuarios',
        message: err?.message || 'No se pudieron matricular los usuarios.',
        type: 'error',
      });
    }
  };

  const handleRemoveUser = async (userid) => {
    try {
      await manageEnrolmentsMutation.mutateAsync({
        id,
        action: 'remove',
        userids: [userid],
      });
      addToast({
        title: 'Usuario Desmatriculado',
        message: 'El usuario fue desmatriculado de la ruta de aprendizaje.',
        type: 'info',
      });
      refetch();
    } catch (err) {
      addToast({
        title: 'Error al desmatricular',
        message: err?.message || 'No se pudo remover al usuario.',
        type: 'error',
      });
    }
  };

  const handleDeleteRequest = () => {
    const studentCount = (path?.progress_matrix || []).length;
    if (studentCount > 0) {
      addToast({
        title: 'Acción bloqueada',
        message: `No se puede eliminar la ruta: cuenta con ${studentCount} estudiantes inscritos. Debe ocultarse.`,
        type: 'error',
      });
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await deleteMutation.mutateAsync(id);
      if (res?.action_taken === 'hidden') {
        addToast({
          title: 'Ruta Ocultada',
          message: 'La ruta contenía estudiantes y se configuró como oculta por seguridad.',
          type: 'warning',
        });
      } else {
        addToast({
          title: 'Ruta Eliminada',
          message: 'La ruta fue eliminada permanentemente.',
          type: 'success',
        });
      }
      setDeleteConfirmOpen(false);
      if (onNavigateBack) {
        onNavigateBack();
      }
    } catch (err) {
      addToast({
        title: 'Error al eliminar',
        message: err?.message || 'No se pudo procesar la eliminación.',
        type: 'error',
      });
    }
  };

  const handleViewInMoodle = async (courseId = id) => {
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
    path,
    loading: isLoading || isFetching,
    error,
    activeTab,
    setActiveTab,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    isStructureDirty,
    setIsStructureDirty,
    structureDraft,
    setStructureDraft,
    savingStructure: updateStructureMutation.isPending,
    enrolling: manageEnrolmentsMutation.isPending,
    deleting: deleteMutation.isPending,
    handleSaveStructure,
    handleAssignCohorts,
    handleRemoveCohort,
    handleAssignUsers,
    handleRemoveUser,
    handleDeleteRequest,
    handleConfirmDelete,
    handleViewInMoodle,
    refetch,
  };
}
