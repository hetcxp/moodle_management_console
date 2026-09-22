import { useState } from 'react';
import { useCohorts, useCohortsKpis, useCohortAction } from '../../hooks/useAdminerQueries';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/ui/Toast';
import { useEntityListState } from '../../hooks/useEntityListState';
import { usePaginatedExport } from '../../hooks/usePaginatedExport';
import { AdminerApi } from '../../services/adminer-api';
import { runWithConcurrency } from '../../lib/concurrency';

export const useCohortsState = () => {
  const { addToast } = useToast();
  const hasManageCohorts = usePermission('can_manage_cohorts');

  const {
    page, setPage, perPage, sort, setSort, dir, setDir, search, setSearch, filters, setFilters,
    selectedIds, setSelectedIds, clearSelection, deleteLoading, setDeleteLoading,
    modalOpen, setModalOpen, editingItem: editingCohort, openCreate: handleOpenCreate, openEdit: handleOpenEdit,
    deleteConfirmOpen, setDeleteConfirmOpen, itemsToDelete: cohortsToDeleteRaw, setItemsToDelete: _setCohortsToDelete,
    openDelete: handleOpenDelete, exportModalOpen, setExportModalOpen, exportOption, setExportOption,
  } = useEntityListState({ defaultSort: 'name', defaultDir: 'ASC', defaultPerPage: 50 });

  const cohortsToDelete = cohortsToDeleteRaw || [];
  const { exportLoading, handleExport: executeExport } = usePaginatedExport();
  const [statusFilter, setStatusFilter] = useState('-1');
  const activeFilters = { ...filters };
  if (statusFilter !== '-1') activeFilters.empty_only = statusFilter === '1';

  const { data: cohortsData, isLoading, isFetching, refetch } = useCohorts({
    page, perpage: perPage, sort, dir, search, filters: activeFilters,
  });

  const { data: kpis } = useCohortsKpis();
  const cohorts = cohortsData?.cohorts || [];
  const totalCount = cohortsData?.totalcount || 0;
  const loading = isLoading || isFetching;
  const { mutateAsync: performCohortAction } = useCohortAction();

  const handleDelete = async () => {
    if (cohortsToDelete.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of cohortsToDelete) await performCohortAction({ action: 'delete', cohortid: id });
      addToast({ type: 'success', title: 'Cohorte(s) eliminada(s)' });
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
      { label: 'ID', accessor: 'id' }, { label: 'Nombre de Cohorte', accessor: 'name' },
      { label: 'Número ID / Código', accessor: 'idnumber' }, { label: 'Miembros Totales', accessor: 'memberscount' },
      { label: 'Cursos Sincronizados', accessor: 'coursescount' }, { label: 'Descripción', accessor: 'description' },
    ];
    const detailCols = [
      { label: 'ID Cohorte', accessor: 'cohort_id' }, { label: 'Nombre Cohorte', accessor: 'cohort_name' },
      { label: 'Código Cohorte', accessor: 'cohort_idnumber' }, { label: 'ID Usuario', accessor: 'user_id' },
      { label: 'Nombre Completo', accessor: 'user_fullname' }, { label: 'Email', accessor: 'user_email' },
      { label: 'Estado', accessor: 'user_status' }, { label: 'Notas', accessor: 'message' },
    ];
    const processDetail = async (cohortsList) => {
      const results = await runWithConcurrency(cohortsList, 5, async (cohort) => {
        try {
          const detailRes = await AdminerApi.getCohortDetail(cohort.id);
          const members = detailRes?.members || [];
          if (members.length === 0) return [{ cohort_id: cohort.id, cohort_name: cohort.name, cohort_idnumber: cohort.idnumber, user_id: '', user_fullname: '', user_email: '', user_status: '', message: 'Sin miembros' }];
          return members.map((m) => ({ cohort_id: cohort.id, cohort_name: cohort.name, cohort_idnumber: cohort.idnumber, user_id: m.id, user_fullname: m.fullname, user_email: m.email, user_status: m.suspended === 0 ? 'Activo' : 'Suspendido', message: '' }));
        } catch {
          return [{ cohort_id: cohort.id, cohort_name: cohort.name, cohort_idnumber: cohort.idnumber, user_id: '', user_fullname: 'Error al obtener miembros', user_email: '', user_status: '', message: 'Error' }];
        }
      });
      return results.flat();
    };
    await executeExport({
      fetchFn: AdminerApi.getCohorts, params: { sort, dir, search, filters: activeFilters }, dataKey: 'cohorts',
      filename: exportOption === 'visible' ? 'cohortes_moodle' : 'cohortes_usuarios_moodle',
      columns: exportOption === 'visible' ? cols : detailCols,
      processData: exportOption === 'visible' ? null : processDetail,
    });
    setExportModalOpen(false);
  };

  return {
    cohorts, totalCount, loading, kpis,
    page, setPage, perPage, sort, setSort, dir, setDir,
    search, setSearch, statusFilter, setStatusFilter, filters, setFilters,
    selectedIds, setSelectedIds, clearSelection, hasManageCohorts,
    modalOpen, setModalOpen, editingCohort,
    deleteConfirmOpen, setDeleteConfirmOpen, cohortsToDelete, deleteLoading,
    exportModalOpen, setExportModalOpen, exportOption, setExportOption, exportLoading, refetch,
    handleOpenCreate, handleOpenEdit, handleOpenDelete, handleDelete, handleExport,
  };
};
