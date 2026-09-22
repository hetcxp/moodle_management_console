import { useState, useEffect, useMemo } from 'react';
import {
  useCompetencyFrameworks,
  useCompetencyKpis,
  useCompetencyFrameworkAction,
  useScales,
} from '../../hooks/useAdminerQueries';
import { AdminerApi } from '../../services/adminer-api';
import { useToast } from '../../components/ui/Toast';
import { useEntityListState } from '../../hooks/useEntityListState';
import { usePaginatedExport } from '../../hooks/usePaginatedExport';
import { useAuth } from '../../context/AuthContext';

export function useCompetenciesState() {
  const { addToast } = useToast();
  const { permissions } = useAuth();

  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const {
    page, setPage, perPage, setPerPage, sort, setSort, dir, setDir, search, setSearch, filters, setFilters,
    selectedIds, setSelectedIds, clearSelection,
    deleteLoading, setDeleteLoading,
    modalOpen, setModalOpen, editingItem: editingFramework, setEditingItem: setEditingFramework,
    deleteConfirmOpen, setDeleteConfirmOpen,
    itemsToDelete: frameworksToDeleteRaw, setItemsToDelete: _setFrameworksToDelete,
    openDelete: handleOpenDelete,
    exportModalOpen, setExportModalOpen,
  } = useEntityListState({ defaultSort: 'shortname', defaultDir: 'ASC', defaultPerPage: 50 });

  const frameworksToDelete = frameworksToDeleteRaw || [];
  const { exportLoading, handleExport: executeExport } = usePaginatedExport();

  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const activeFilters = { ...filters };
  if (visibilityFilter !== '-1') {
    activeFilters.visible = visibilityFilter;
  }

  const { data: frameworksData, isLoading, isFetching, refetch } = useCompetencyFrameworks({
    page,
    perpage: perPage,
    sort,
    dir,
    search,
    filters: activeFilters,
  });

  const { data: kpis } = useCompetencyKpis();
  const { data: scalesData } = useScales();
  const scales = useMemo(() => scalesData?.scales || [], [scalesData?.scales]);

  const frameworks = frameworksData?.frameworks || [];
  const totalCount = frameworksData?.totalcount || 0;
  const loading = isLoading || isFetching;

  const { mutateAsync: performFrameworkAction } = useCompetencyFrameworkAction();

  const [formData, setFormData] = useState({
    shortname: '',
    idnumber: '',
    description: '',
    scaleid: 0,
    visible: 1,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  useEffect(() => {
    if (!editingFramework && scales.length > 0 && formData.scaleid === 0) {
      const defaultScale = scales.find((s) => s.isdefault === 1) || scales[0];
      if (defaultScale) {
        setFormData((prev) => ({ ...prev, scaleid: defaultScale.id }));
      }
    }
  }, [scales, editingFramework, formData.scaleid]);

  const handleOpenCreate = () => {
    setEditingFramework(null);
    const defaultScale = scales.find((s) => s.isdefault === 1) || scales[0];
    setFormData({
      shortname: '',
      idnumber: '',
      description: '',
      scaleid: defaultScale ? defaultScale.id : 0,
      visible: 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (framework) => {
    setEditingFramework(framework);
    setFormData({
      shortname: framework.shortname,
      idnumber: framework.idnumber,
      description: framework.description,
      scaleid: framework.scaleid || (scales[0]?.id || 0),
      visible: framework.visible !== undefined ? framework.visible : 1,
    });
    setModalOpen(true);
  };

  const handleSaveFramework = async (e) => {
    e.preventDefault();
    if (!formData.shortname.trim()) {
      addToast({ type: 'error', title: 'Error', description: 'El nombre del marco es obligatorio.' });
      return;
    }
    setFormLoading(true);
    try {
      if (editingFramework) {
        await performFrameworkAction({
          action: 'edit',
          frameworkid: editingFramework.id,
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
          scaleid: Number(formData.scaleid),
          visible: formData.visible ? 1 : 0,
        });
        addToast({ type: 'success', title: 'Marco de competencias actualizado' });
      } else {
        await performFrameworkAction({
          action: 'create',
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
          scaleid: Number(formData.scaleid),
          visible: formData.visible ? 1 : 0,
        });
        addToast({ type: 'success', title: 'Marco de competencias creado' });
      }
      setModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al guardar', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleVisibility = async (framework) => {
    try {
      await performFrameworkAction({
        action: 'toggle_visibility',
        frameworkid: framework.id,
      });
      addToast({
        type: 'success',
        title: 'Visibilidad actualizada',
        description: `El marco ahora está ${framework.visible ? 'oculto' : 'visible'}.`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleDelete = async () => {
    if (frameworksToDelete.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of frameworksToDelete) {
        await performFrameworkAction({ action: 'delete', frameworkid: id });
      }
      addToast({ type: 'success', title: 'Marco(s) eliminado(s)' });
      setDeleteConfirmOpen(false);
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async () => {
    const cols = [
      { label: 'ID', accessor: 'id' },
      { label: 'Nombre del Marco', accessor: 'shortname' },
      { label: 'Código / ID Number', accessor: 'idnumber' },
      { label: 'Escala de Evaluación', accessor: 'scalename' },
      { label: 'Competencias Nivel 1', accessor: 'competenciescount' },
      { label: 'Estado', accessor: (r) => (r.visible ? 'Visible' : 'Oculto') },
      { label: 'Descripción', accessor: 'description' },
    ];

    await executeExport({
      fetchFn: AdminerApi.getCompetencyFrameworks,
      params: { sort, dir, search, filters: activeFilters },
      dataKey: 'frameworks',
      filename: 'marcos_competencias_moodle',
      columns: cols,
    });
    setExportModalOpen(false);
  };

  return {
    frameworks, totalCount, kpis, scales, loading,
    page, setPage, perPage, setPerPage, sort, dir, setSort, setDir, setFilters,
    search, setSearch, visibilityFilter, setVisibilityFilter,
    selectedIds, setSelectedIds, clearSelection,
    hasManageCompetencies,
    modalOpen, setModalOpen, editingFramework, formData, setFormData, formLoading,
    deleteConfirmOpen, setDeleteConfirmOpen, frameworksToDelete, deleteLoading,
    exportModalOpen, setExportModalOpen, exportLoading,
    reviewsModalOpen, setReviewsModalOpen,
    handleOpenCreate, handleOpenEdit, handleSaveFramework,
    handleToggleVisibility, handleOpenDelete, handleDelete, handleExport,
    refetch,
  };
}
