import { useState, useMemo } from 'react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useHelp } from '../../context/HelpContext';
import { useEntityListState } from '../../hooks/useEntityListState';
import { useScales, useScaleAction } from '../../hooks/queries/useCompetencyQueries';

export const useScalesState = () => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  const { helpData } = useHelp();
  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const {
    search, setSearch,
    modalOpen: formModalOpen, setModalOpen: setFormModalOpen,
    editingItem: editingScale, setEditingItem: setEditingScale,
    openCreate: handleOpenCreate, openEdit: handleOpenEdit,
    deleteConfirmOpen, setDeleteConfirmOpen,
    itemsToDelete: scaleToDelete, setItemsToDelete: setScaleToDelete,
    openDelete: handleOpenDelete,
  } = useEntityListState();

  const { data: scalesData, isLoading, isFetching, refetch } = useScales();
  const { mutateAsync: performScaleAction, isPending: deleteLoading } = useScaleAction();

  const scales = useMemo(() => scalesData?.scales || [], [scalesData?.scales]);

  const [statusFilter, setStatusFilter] = useState('all');

  // Filtered scales
  const filteredScales = useMemo(() => {
    return scales.filter((scale) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = scale.name?.toLowerCase().includes(q);
        const matchesItems = scale.items?.some((it) => it?.toLowerCase().includes(q));
        if (!matchesName && !matchesItems) return false;
      }

      if (statusFilter === 'in_use') {
        return (scale.frameworks_count || 0) > 0;
      }
      if (statusFilter === 'unused') {
        return (scale.frameworks_count || 0) === 0;
      }
      if (statusFilter === 'locked') {
        return scale.locked === 1;
      }

      return true;
    });
  }, [scales, search, statusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = scales.length;
    const inUse = scales.filter((s) => (s.frameworks_count || 0) > 0).length;
    const locked = scales.filter((s) => s.locked === 1).length;
    const totalItems = scales.reduce((acc, s) => acc + (s.items?.length || 0), 0);
    const avgLevels = total > 0 ? (totalItems / total).toFixed(1) : 0;

    return { total, inUse, locked, avgLevels };
  }, [scales]);

  const handleConfirmDelete = async () => {
    if (!scaleToDelete) return;
    try {
      await performScaleAction({
        action: 'delete',
        scaleid: scaleToDelete.id,
      });
      addToast({
        title: 'Escala eliminada',
        description: `La escala "${scaleToDelete.name}" fue eliminada correctamente.`,
        type: 'success',
      });
      setDeleteConfirmOpen(false);
      setScaleToDelete(null);
    } catch (err) {
      addToast({
        title: 'Error al eliminar',
        description: err?.message || 'No se pudo eliminar la escala.',
        type: 'error',
      });
    }
  };

  return {
    scales,
    filteredScales,
    kpis,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    hasManageCompetencies,
    isLoading,
    isFetching,
    refetch,
    formModalOpen,
    setFormModalOpen,
    editingScale,
    setEditingScale,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    scaleToDelete,
    setScaleToDelete,
    deleteLoading,
    helpData,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDelete,
    handleConfirmDelete,
  };
};
