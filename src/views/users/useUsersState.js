import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useUsersKpis, useUserAction } from '../../hooks/useAdminerQueries';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/ui/Toast';
import { exportToCsv } from '../../components/CsvExporter';
import { formatDate } from '../../lib/utils';
import { runWithConcurrency } from '../../lib/concurrency';
import { AdminerApi } from '../../services/adminer-api';

export function useUsersState() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const hasUpdateUsers = usePermission('can_update_users');
  const hasDeleteUsers = usePermission('can_delete_users');

  const [page, setPage] = useState(0);
  const [perPage] = useState(20);
  const [sort, setSort] = useState('lastaccess');
  const [dir, setDir] = useState('DESC');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('-1');
  const [filters, setFilters] = useState({});

  const activeFilters = { ...filters };
  if (statusFilter !== '-1') activeFilters.suspended = statusFilter;

  const { data: usersData, isLoading, isFetching, refetch } = useUsers({
    page, perpage: perPage, sort, dir, search, filters: activeFilters
  });

  const { data: kpis } = useUsersKpis();
  const users = usersData?.users || [];
  const totalCount = usersData?.totalcount || 0;
  const { mutateAsync: performUserAction } = useUserAction();
  const { selectedIds, setSelectedIds, clearSelection } = useBulkSelection();

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [uploadCsvOpen, setUploadCsvOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [tempPassConfirmOpen, setTempPassConfirmOpen] = useState(false);
  const [usersForTempPass, setUsersForTempPass] = useState([]);
  const [tempPassLoading, setTempPassLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [exportLoading, setExportLoading] = useState(false);

  const loading = isLoading || isFetching;

  const handleBulkSuspend = async (ids = selectedIds) => {
    try {
      await performUserAction({ action: 'suspend', userids: ids });
      addToast({ type: 'success', title: 'Usuarios suspendidos', description: `Se suspendió el acceso a ${ids.length} usuario(s).` });
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkActivate = async (ids = selectedIds) => {
    try {
      await performUserAction({ action: 'activate', userids: ids });
      addToast({ type: 'success', title: 'Usuarios activados', description: `Se reactivaron ${ids.length} usuario(s).` });
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleOpenDelete = (ids = selectedIds) => { setUsersToDelete(ids); setDeleteConfirmOpen(true); };

  const handleExecuteDelete = async () => {
    setDeleteLoading(true);
    try {
      await performUserAction({ action: 'delete', userids: usersToDelete });
      addToast({ type: 'success', title: 'Usuarios eliminados', description: `Se eliminaron ${usersToDelete.length} usuario(s) de la plataforma.` });
      setDeleteConfirmOpen(false);
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenTempPassConfirm = (ids = selectedIds) => { setUsersForTempPass(ids); setTempPassConfirmOpen(true); };

  const handleExecuteSendTempPassword = async () => {
    setTempPassLoading(true);
    try {
      await performUserAction({ action: 'send_temp_password', userids: usersForTempPass });
      addToast({ type: 'success', title: 'Contraseña temporal enviada', description: `Se envió el correo a ${usersForTempPass.length} usuario(s).` });
      setTempPassConfirmOpen(false);
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setTempPassLoading(false);
    }
  };

  const handleExport = async () => {
    let exportData = [];
    try {
      setExportLoading(true);
      const limit = 500;
      const pages = Math.ceil(totalCount / limit) || 1;
      for (let i = 0; i < pages; i++) {
        const res = await AdminerApi.getUsers({ page: i, perpage: limit, sort, dir, search, filters: activeFilters });
        if (res?.users) exportData.push(...res.users);
      }

      if (exportOption === 'visible') {
        const cols = [
          { label: 'ID', accessor: 'id' },
          { label: 'Usuario', accessor: 'username' },
          { label: 'Nombre Completo', accessor: 'fullname' },
          { label: 'Email', accessor: 'email' },
          { label: 'Estado', accessor: (r) => (r.is_active === 1 ? 'Activo' : 'Suspendido') },
          { label: 'Último Acceso', accessor: (r) => formatDate(r.lastaccess) },
          { label: 'Cohortes', accessor: 'cohorts_count' },
          { label: 'Cursos Inscritos', accessor: 'enrolled_courses' },
          { label: 'Cursos Completados', accessor: 'completed_courses' },
          { label: 'Progreso (%)', accessor: 'progress' }
        ];
        exportToCsv('usuarios_moodle', exportData, cols);
      } else {
        const usersFailed = [];
        const detailedRowsArrays = await runWithConcurrency(exportData, 5, async (user) => {
          try {
            const detail = await AdminerApi.getUserDetail(user.id);
            if (detail?.courses && detail.courses.length > 0) {
              return detail.courses.map(course => ({
                user_id: user.id, user_fullname: user.fullname, user_email: user.email,
                user_status: user.is_active === 1 ? 'Activo' : 'Suspendido', user_progress: user.progress || 0,
                course_id: course.id, course_fullname: course.fullname, course_shortname: course.shortname,
                course_progress: course.progress || 0, course_enrollment_status: course.enrolstatus === 0 ? 'Activa' : 'Suspendida'
              }));
            }
            return [{ user_id: user.id, user_fullname: user.fullname, user_email: user.email, user_status: user.is_active === 1 ? 'Activo' : 'Suspendido', user_progress: user.progress || 0, course_id: '', course_fullname: '', course_shortname: '', course_progress: '', course_enrollment_status: '' }];
          } catch (e) {
            // eslint-disable-next-line no-console
            if (import.meta.env.DEV) console.error('Error fetching detail for user', user.id, e);
            usersFailed.push(user.id);
            return [{ user_id: user.id, user_fullname: user.fullname, user_email: user.email, user_status: user.is_active === 1 ? 'Activo' : 'Suspendido', user_progress: user.progress || 0, course_id: '', course_fullname: '', course_shortname: '', course_progress: '', course_enrollment_status: '' }];
          }
        });
        const detailedData = detailedRowsArrays.flat();
        if (usersFailed.length > 0) {
          addToast({ type: 'warning', title: 'Exportación incompleta', description: `No se pudo obtener detalle de ${usersFailed.length} usuario(s).` });
        }
        const cols = [
          { label: 'ID Usuario', accessor: 'user_id' }, { label: 'Nombre Usuario', accessor: 'user_fullname' },
          { label: 'Email', accessor: 'user_email' }, { label: 'Estado Usuario', accessor: 'user_status' },
          { label: 'Progreso Prom. Usuario (%)', accessor: 'user_progress' }, { label: 'ID Curso', accessor: 'course_id' },
          { label: 'Curso', accessor: 'course_fullname' }, { label: 'Nombre Corto', accessor: 'course_shortname' },
          { label: 'Estado Matriculación', accessor: 'course_enrollment_status' }, { label: 'Progreso Curso (%)', accessor: 'course_progress' }
        ];
        exportToCsv('usuarios_cursos_moodle', detailedData, cols);
      }
      setExportModalOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.error('Export error', err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  return {
    users, totalCount, kpis, loading, activeFilters,
    page, setPage, perPage, sort, dir, setSort, setDir, setFilters,
    search, setSearch, statusFilter, setStatusFilter,
    selectedIds, setSelectedIds, clearSelection,
    hasUpdateUsers, hasDeleteUsers,
    handleBulkSuspend, handleBulkActivate, handleOpenDelete, handleExecuteDelete,
    handleOpenTempPassConfirm, handleExecuteSendTempPassword, handleExport,
    addUserOpen, setAddUserOpen, uploadCsvOpen, setUploadCsvOpen,
    deleteConfirmOpen, setDeleteConfirmOpen, usersToDelete, deleteLoading,
    tempPassConfirmOpen, setTempPassConfirmOpen, usersForTempPass, tempPassLoading,
    exportModalOpen, setExportModalOpen, exportOption, setExportOption, exportLoading,
    refetch, queryClient,
  };
}
