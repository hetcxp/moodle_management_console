import { useState } from 'react';
import { useCohorts, useCohortsKpis, useCohortAction } from '../../hooks/useAdminerQueries';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';
import { exportToCsv } from '../../components/CsvExporter';

export const useCohortsState = () => {
  const { addToast } = useToast();
  const hasManageCohorts = usePermission('can_manage_cohorts');

  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const [sort, setSort] = useState('name');
  const [dir, setDir] = useState('ASC');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('-1');
  const [filters, setFilters] = useState({});

  const activeFilters = { ...filters };
  if (statusFilter !== '-1') {
    activeFilters.empty_only = statusFilter === '1';
  }

  const { data: cohortsData, isLoading, isFetching, refetch } = useCohorts({
    page,
    perpage: perPage,
    sort,
    dir,
    search,
    filters: activeFilters
  });

  const { data: kpis } = useCohortsKpis();

  const cohorts = cohortsData?.cohorts || [];
  const totalCount = cohortsData?.totalcount || 0;
  const loading = isLoading || isFetching;

  const { mutateAsync: performCohortAction } = useCohortAction();
  const { selectedIds, setSelectedIds, clearSelection } = useBulkSelection();

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cohortsToDelete, setCohortsToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [exportLoading, setExportLoading] = useState(false);

  const handleOpenCreate = () => {
    setEditingCohort(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cohort) => {
    setEditingCohort(cohort);
    setModalOpen(true);
  };

  const handleOpenDelete = (ids) => {
    setCohortsToDelete(ids);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (cohortsToDelete.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of cohortsToDelete) {
        await performCohortAction({ action: 'delete', cohortid: id });
      }
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
    let exportData = cohorts;
    setExportLoading(true);

    try {
      if (totalCount > cohorts.length) {
        const res = await AdminerApi.getCohorts({
          page: 0,
          perpage: 99999,
          sort,
          dir,
          search
        });
        if (res?.cohorts) {
          exportData = res.cohorts;
        }
      }

      if (exportOption === 'visible') {
        const cols = [
          { label: 'ID', accessor: 'id' },
          { label: 'Nombre de Cohorte', accessor: 'name' },
          { label: 'Número ID / Código', accessor: 'idnumber' },
          { label: 'Miembros Totales', accessor: 'memberscount' },
          { label: 'Cursos Sincronizados', accessor: 'coursescount' },
          { label: 'Descripción', accessor: 'description' }
        ];
        exportToCsv('cohortes_moodle', exportData, cols);
      } else {
        const detailedData = [];

        for (const cohort of exportData) {
          const detailRes = await AdminerApi.getCohortDetail(cohort.id);
          const members = detailRes?.members || [];

          if (members.length === 0) {
            detailedData.push({
              cohort_id: cohort.id,
              cohort_name: cohort.name,
              cohort_idnumber: cohort.idnumber,
              user_id: '',
              user_fullname: '',
              user_email: '',
              user_status: '',
              message: 'Sin miembros'
            });
          } else {
            for (const member of members) {
              detailedData.push({
                cohort_id: cohort.id,
                cohort_name: cohort.name,
                cohort_idnumber: cohort.idnumber,
                user_id: member.id,
                user_fullname: member.fullname,
                user_email: member.email,
                user_status: member.suspended === 0 ? 'Activo' : 'Suspendido',
                message: ''
              });
            }
          }
        }

        const detailCols = [
          { label: 'ID Cohorte', accessor: 'cohort_id' },
          { label: 'Nombre Cohorte', accessor: 'cohort_name' },
          { label: 'Código Cohorte', accessor: 'cohort_idnumber' },
          { label: 'ID Usuario', accessor: 'user_id' },
          { label: 'Nombre Completo', accessor: 'user_fullname' },
          { label: 'Email', accessor: 'user_email' },
          { label: 'Estado', accessor: 'user_status' },
          { label: 'Notas', accessor: 'message' }
        ];

        exportToCsv('cohortes_usuarios_moodle', detailedData, detailCols);
      }

      setExportModalOpen(false);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Export error', err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  return {
    cohorts,
    totalCount,
    loading,
    kpis,
    page,
    setPage,
    perPage,
    sort,
    setSort,
    dir,
    setDir,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filters,
    setFilters,
    selectedIds,
    setSelectedIds,
    clearSelection,
    hasManageCohorts,
    modalOpen,
    setModalOpen,
    editingCohort,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    cohortsToDelete,
    deleteLoading,
    exportModalOpen,
    setExportModalOpen,
    exportOption,
    setExportOption,
    exportLoading,
    refetch,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDelete,
    handleDelete,
    handleExport
  };
};
