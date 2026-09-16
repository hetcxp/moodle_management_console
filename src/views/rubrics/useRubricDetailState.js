import { useState, useMemo } from 'react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useRubricTemplates, useRubricTemplateAction } from '../../hooks/queries/useCompetencyQueries';

export const useRubricDetailState = ({ templateId, onBack }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | 'cards'
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: rubricsData, isLoading, isFetching, refetch } = useRubricTemplates({
    page: 0,
    perpage: 100,
  });

  const { mutateAsync: performRubricAction, isPending: actionLoading } = useRubricTemplateAction();

  const rubric = useMemo(() => {
    if (!rubricsData?.templates) return null;
    return rubricsData.templates.find((t) => String(t.id) === String(templateId)) || null;
  }, [rubricsData?.templates, templateId]);

  const handleOpenEdit = () => {
    setEditModalOpen(true);
  };

  const handleSaveRubric = async (formData) => {
    if (!rubric) return;
    try {
      await performRubricAction({
        action: 'update',
        templateid: rubric.id,
        name: formData.name,
        description: formData.description,
        criteria: formData.criteria,
      });
      addToast({
        title: 'Plantilla actualizada',
        description: `La rúbrica "${formData.name}" fue actualizada exitosamente.`,
        type: 'success',
      });
      setEditModalOpen(false);
      await refetch();
    } catch (err) {
      addToast({
        title: 'Error al actualizar rúbrica',
        description: err?.message || 'No se pudo actualizar la plantilla de rúbrica.',
        type: 'error',
      });
      throw err;
    }
  };

  const handleOpenDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!rubric) return;
    try {
      await performRubricAction({
        action: 'delete',
        templateid: rubric.id,
      });
      addToast({
        title: 'Plantilla eliminada',
        description: `La rúbrica "${rubric.name}" fue eliminada correctamente.`,
        type: 'success',
      });
      setDeleteConfirmOpen(false);
      if (onBack) {
        onBack();
      }
    } catch (err) {
      addToast({
        title: 'Error al eliminar',
        description: err?.message || 'No se pudo eliminar la plantilla de rúbrica.',
        type: 'error',
      });
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return {
    rubric,
    isLoading,
    isFetching,
    refetch,
    hasManageCompetencies,
    viewMode,
    setViewMode,
    editModalOpen,
    setEditModalOpen,
    handleOpenEdit,
    handleSaveRubric,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    actionLoading,
    handleOpenDelete,
    handleConfirmDelete,
    handlePrint,
  };
};
