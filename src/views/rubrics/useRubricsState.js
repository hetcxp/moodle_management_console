import { useState, useMemo } from 'react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useHelp } from '../../context/HelpContext';
import { useRubricTemplates, useRubricTemplateAction } from '../../hooks/queries/useCompetencyQueries';

export const useRubricsState = () => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  const { helpData } = useHelp();
  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 50;

  const { data: rubricsData, isLoading, isFetching, refetch } = useRubricTemplates({
    search,
    page,
    perpage: perPage,
  });

  const { mutateAsync: performRubricAction, isPending: actionLoading } = useRubricTemplateAction();

  const templates = useMemo(() => rubricsData?.templates || [], [rubricsData?.templates]);
  const totalCount = rubricsData?.total ?? templates.length;

  // Modals state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedRubric, setSelectedRubric] = useState(null);

  const [formModalOpen, setFormModalOpen] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rubricToDelete, setRubricToDelete] = useState(null);

  // KPIs
  const kpis = useMemo(() => {
    const total = totalCount;
    if (templates.length === 0) {
      return { total, totalCriteria: 0, avgCriteria: 0, avgMaxScore: 0 };
    }
    const sumCriteria = templates.reduce((acc, t) => acc + (t.criteria_count || 0), 0);
    const sumMaxScore = templates.reduce((acc, t) => acc + (t.max_score || 0), 0);
    const avgCriteria = (sumCriteria / templates.length).toFixed(1);
    const avgMaxScore = Math.round(sumMaxScore / templates.length);

    return {
      total,
      totalCriteria: sumCriteria,
      avgCriteria,
      avgMaxScore,
    };
  }, [totalCount, templates]);

  const handleOpenPreview = (rubric) => {
    setSelectedRubric(rubric);
    setPreviewModalOpen(true);
  };

  const handleOpenCreate = () => {
    setFormModalOpen(true);
  };

  const handleOpenDelete = (rubric) => {
    setRubricToDelete(rubric);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!rubricToDelete) return;
    try {
      await performRubricAction({
        action: 'delete',
        templateid: rubricToDelete.id,
      });
      addToast({
        title: 'Plantilla eliminada',
        description: `La rúbrica "${rubricToDelete.name}" fue eliminada del banco de plantillas.`,
        type: 'success',
      });
      setDeleteConfirmOpen(false);
      setRubricToDelete(null);
    } catch (err) {
      addToast({
        title: 'Error al eliminar',
        description: err?.message || 'No se pudo eliminar la plantilla de rúbrica.',
        type: 'error',
      });
    }
  };

  const handleSaveRubric = async (formData) => {
    try {
      await performRubricAction({
        action: 'create',
        name: formData.name,
        description: formData.description,
        criteria: formData.criteria,
      });
      addToast({
        title: 'Rúbrica creada',
        description: `La plantilla "${formData.name}" se guardó exitosamente en el banco compartido.`,
        type: 'success',
      });
      setFormModalOpen(false);
    } catch (err) {
      addToast({
        title: 'Error al crear rúbrica',
        description: err?.message || 'No se pudo guardar la plantilla de rúbrica.',
        type: 'error',
      });
      throw err;
    }
  };

  return {
    templates,
    totalCount,
    isLoading,
    isFetching,
    actionLoading,
    refetch,
    search,
    setSearch,
    page,
    setPage,
    perPage,
    kpis,
    helpData,
    hasManageCompetencies,
    // Preview modal
    previewModalOpen,
    setPreviewModalOpen,
    selectedRubric,
    handleOpenPreview,
    // Form modal
    formModalOpen,
    setFormModalOpen,
    handleOpenCreate,
    handleSaveRubric,
    // Delete modal
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    rubricToDelete,
    handleOpenDelete,
    handleConfirmDelete,
  };
};
