import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useUsersKpis, useUserAction } from '../hooks/useAdminerQueries';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { AdminerApi } from '../services/adminer-api';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { formatDate } from '../lib/utils';
import { PermissionGate } from '../components/PermissionGate';
import { usePermission } from '../hooks/usePermission';
import { runWithConcurrency } from '../lib/concurrency';
import { API_CONFIG } from '../config/api';
import { UserCheck, UserX, Trash2, Mail, Layers, BookOpen, ShieldAlert, UserPlus, Upload, ExternalLink, Activity, Users, KeyRound } from 'lucide-react';
import { KpiGrid } from '../components/KpiGrid';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UserCreateModal } from './users/UserCreateModal';
import { UserCsvModal } from './users/UserCsvModal';
import { UserExportModal } from './users/UserExportModal';

export const UsersView = ({ onNavigateToDetail }) => {
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
  if (statusFilter !== '-1') {
    activeFilters.suspended = statusFilter;
  }

  const { data: usersData, isLoading, isFetching, refetch } = useUsers({
    page,
    perpage: perPage,
    sort,
    dir,
    search,
    filters: activeFilters
  });

  const { data: kpis } = useUsersKpis();

  const users = usersData?.users || [];
  const totalCount = usersData?.totalcount || 0;
  const { mutateAsync: performUserAction } = useUserAction();
  const { selectedIds, setSelectedIds, clearSelection } = useBulkSelection();
  
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [uploadCsvOpen, setUploadCsvOpen] = useState(false);

  // Confirm delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Confirm temp password modal
  const [tempPassConfirmOpen, setTempPassConfirmOpen] = useState(false);
  const [usersForTempPass, setUsersForTempPass] = useState([]);
  const [tempPassLoading, setTempPassLoading] = useState(false);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [exportLoading, setExportLoading] = useState(false);

  const loading = isLoading || isFetching || isActionLoading || exportLoading;

  // Removed local loadUsers and useEffect

  const handleBulkSuspend = async (ids = selectedIds) => {
    try {
      await performUserAction({ action: 'suspend', userids: ids });
      addToast({
        type: 'success',
        title: 'Usuarios suspendidos',
        description: `Se suspendió el acceso a ${ids.length} usuario(s).`
      });
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkActivate = async (ids = selectedIds) => {
    try {
      await performUserAction({ action: 'activate', userids: ids });
      addToast({
        type: 'success',
        title: 'Usuarios activados',
        description: `Se reactivaron ${ids.length} usuario(s).`
      });
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleOpenDelete = (ids = selectedIds) => {
    setUsersToDelete(ids);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDelete = async () => {
    setDeleteLoading(true);
    try {
      await performUserAction({ action: 'delete', userids: usersToDelete });
      addToast({
        type: 'success',
        title: 'Usuarios eliminados',
        description: `Se eliminaron ${usersToDelete.length} usuario(s) de la plataforma.`
      });
      setDeleteConfirmOpen(false);
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenTempPassConfirm = (ids = selectedIds) => {
    setUsersForTempPass(ids);
    setTempPassConfirmOpen(true);
  };

  const handleExecuteSendTempPassword = async () => {
    setTempPassLoading(true);
    try {
      await performUserAction({ action: 'send_temp_password', userids: usersForTempPass });
      addToast({
        type: 'success',
        title: 'Contraseña temporal enviada',
        description: `Se envió el correo con la contraseña temporal e instrucciones a ${usersForTempPass.length} usuario(s).`
      });
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
        const res = await AdminerApi.getUsers({
          page: i,
          perpage: limit,
          sort,
          dir,
          search,
          filters: activeFilters
        });
        if (res?.users) {
          exportData = [...exportData, ...res.users];
        }
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
                user_id: user.id,
                user_fullname: user.fullname,
                user_email: user.email,
                user_status: user.is_active === 1 ? 'Activo' : 'Suspendido',
                user_progress: user.progress || 0,
                course_id: course.id,
                course_fullname: course.fullname,
                course_shortname: course.shortname,
                course_progress: course.progress || 0,
                course_enrollment_status: course.enrolstatus === 0 ? 'Activa' : 'Suspendida'
              }));
            } else {
              return [{
                user_id: user.id,
                user_fullname: user.fullname,
                user_email: user.email,
                user_status: user.is_active === 1 ? 'Activo' : 'Suspendido',
                user_progress: user.progress || 0,
                course_id: '',
                course_fullname: '',
                course_shortname: '',
                course_progress: '',
                course_enrollment_status: ''
              }];
            }
          } catch (e) {
            console.error('Error fetching detail for user', user.id, e);
            usersFailed.push(user.id);
            return [{
              user_id: user.id,
              user_fullname: user.fullname,
              user_email: user.email,
              user_status: user.is_active === 1 ? 'Activo' : 'Suspendido',
              user_progress: user.progress || 0,
              course_id: '',
              course_fullname: '',
              course_shortname: '',
              course_progress: '',
              course_enrollment_status: ''
            }];
          }
        });
        const detailedData = detailedRowsArrays.flat();
        if (usersFailed.length > 0) {
          addToast({
            type: 'warning',
            title: 'Exportación incompleta',
            description: `No se pudo obtener detalle de ${usersFailed.length} usuario(s). Sus filas se exportaron con datos básicos.`
          });
        }
        
        const cols = [
          { label: 'ID Usuario', accessor: 'user_id' },
          { label: 'Nombre Usuario', accessor: 'user_fullname' },
          { label: 'Email', accessor: 'user_email' },
          { label: 'Estado Usuario', accessor: 'user_status' },
          { label: 'Progreso Prom. Usuario (%)', accessor: 'user_progress' },
          { label: 'ID Curso', accessor: 'course_id' },
          { label: 'Curso', accessor: 'course_fullname' },
          { label: 'Nombre Corto', accessor: 'course_shortname' },
          { label: 'Estado Matriculación', accessor: 'course_enrollment_status' },
          { label: 'Progreso Curso (%)', accessor: 'course_progress' }
        ];
        exportToCsv('usuarios_cursos_moodle', detailedData, cols);
      }
      setExportModalOpen(false);
    } catch (err) {
      console.error("Export error", err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    {
      header: 'Usuario',
      sortKey: 'firstname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
            {row.fullname ? row.fullname.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              {row.fullname}
              {row.is_admin === 1 && (
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground opacity-70" />
              <span>{row.email}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Estado',
      sortKey: 'suspended',
      filterType: 'select',
      filterOptions: [
        { label: 'Activo', value: '0' },
        { label: 'Suspendido', value: '1' }
      ],
      cell: (row) => (
        <Badge variant={row.is_active === 1 ? 'success' : 'destructive'}>
          {row.is_active === 1 ? 'Activo' : 'Suspendido'}
        </Badge>
      )
    },
    {
      header: 'Cohortes',
      sortKey: 'cohorts',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Layers className="h-3.5 w-3.5" />
          <span>{row.cohorts_count}</span>
        </div>
      )
    },
    {
      header: 'Cursos & Progreso',
      sortKey: 'progress',
      className: 'min-w-[160px]',
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span>{row.progress}% completado</span>
            <span className="text-muted-foreground">{row.completed_courses}/{row.enrolled_courses}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                row.progress === 100
                  ? 'bg-emerald-500'
                  : row.progress > 0
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30'
              }`}
              style={{ width: `${Math.min(row.progress, 100)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      header: 'Último Acceso',
      sortKey: 'lastaccess',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.lastaccess)}
        </span>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost" size="icon" title="Ver en Moodle"
            onClick={async (e) => {
                e.stopPropagation();
                try {
                    const res = await AdminerApi.getAutologinUrl(`/user/profile.php?id=${row.id}`);
                    window.open(res?.url || `${API_CONFIG.baseUrl}/user/profile.php?id=${row.id}`, '_blank');
                } catch { window.open(`${API_CONFIG.baseUrl}/user/profile.php?id=${row.id}`, '_blank'); }
            }}
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>

          <PermissionGate capability="can_update_users">
            <Button
              variant="ghost"
              size="icon"
              title="Enviar link de contraseña temporal"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTempPassConfirm([row.id]);
              }}
              disabled={row.is_admin === 1}
              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            {row.is_active === 1 ? (
              <Button
                variant="ghost"
                size="icon"
                title="Suspender usuario"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBulkSuspend([row.id]);
                }}
                disabled={row.is_admin === 1}
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <UserX className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                title="Activar usuario"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBulkActivate([row.id]);
                }}
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            )}
          </PermissionGate>

          <PermissionGate capability="can_delete_users">
            <Button
              variant="ghost"
              size="icon"
              title="Eliminar usuario"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDelete([row.id]);
              }}
              disabled={row.is_admin === 1}
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Directorio de Usuarios</h1>
            <Badge variant="secondary">{totalCount} {totalCount === 1 ? 'usuario' : 'usuarios'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Supervisa el estado de las cuentas, cohortes y avance en los cursos.
          </p>
        </div>
      </div>

      {kpis && (
        <KpiGrid 
          loading={loading}
          items={[
            { title: 'Total Usuarios', value: kpis.total_users, icon: Users, badgeColor: 'bg-primary/10 text-primary' },
            { title: 'Activos', value: kpis.active_users, icon: UserCheck, badgeColor: 'bg-emerald-500/10 text-emerald-500' },
            { title: 'Suspendidos', value: kpis.suspended_users, icon: UserX, badgeColor: 'bg-rose-500/10 text-rose-500' },
            { title: 'Progreso Promedio', value: `${kpis.avg_progress}%`, icon: Activity, badgeColor: 'bg-blue-500/10 text-blue-500' }
          ]} 
        />
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(0); }}
        searchPlaceholder="Buscar por nombre, email o usuario..."
        onRefresh={() => refetch()}
        loading={loading}
        onExportCsv={() => setExportModalOpen(true)}
        primaryAction={hasUpdateUsers ? {
          label: 'Añadir Usuario',
          onClick: () => setAddUserOpen(true),
          icon: <UserPlus className="h-4 w-4" />
        } : null}
        secondaryAction={hasUpdateUsers ? {
          label: 'Cargar CSV',
          onClick: () => setUploadCsvOpen(true),
          icon: <Upload className="h-4 w-4" />
        } : null}
        filters={[
          {
            id: 'suspended',
            value: statusFilter,
            onChange: (val) => { setStatusFilter(val); setPage(0); },
            options: [
              { label: 'Todos los estados', value: '-1' },
              { label: 'Solo Activos', value: '0' },
              { label: 'Solo Suspendidos', value: '1' }
            ]
          }
        ]}
      />

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        sort={sort}
        dir={dir}
        onSortChange={(newSort, newDir) => {
          setSort(newSort);
          setDir(newDir);
          setPage(0);
        }}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setPage(0);
        }}
        onRowClick={(row) => onNavigateToDetail?.('user', row.id)}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={[
          ...(hasUpdateUsers ? [
            {
              label: 'Activar Cuentas',
              icon: <UserCheck className="h-3.5 w-3.5" />,
              onClick: handleBulkActivate,
              variant: 'success'
            },
            {
              label: 'Suspender Cuentas',
              icon: <UserX className="h-3.5 w-3.5" />,
              onClick: handleBulkSuspend,
              variant: 'warning'
            },
            {
              label: 'Enviar Contraseña Temporal',
              icon: <KeyRound className="h-3.5 w-3.5" />,
              onClick: handleOpenTempPassConfirm,
              variant: 'secondary'
            }
          ] : []),
          ...(hasDeleteUsers ? [{
            label: 'Eliminar Usuarios',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            onClick: handleOpenDelete,
            variant: 'destructive'
          }] : [])
        ]}
        virtualize={true}
      />

      {/* Modal: Confirmar Envío de Contraseña Temporal */}
      <ConfirmDialog
        open={tempPassConfirmOpen}
        onClose={() => setTempPassConfirmOpen(false)}
        onConfirm={handleExecuteSendTempPassword}
        title="¿Enviar link de contraseña temporal?"
        description="Esta acción enviará un correo electrónico a los usuarios seleccionados con una contraseña temporal e instrucciones de ingreso. Al iniciar sesión, se les pedirá cambiar su contraseña."
        loading={tempPassLoading}
        confirmText={`Sí, enviar a ${usersForTempPass.length} usuario(s)`}
      />

      {/* Modal: Confirmar Borrado */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar usuarios seleccionados?"
        description="Esta acción eliminará las cuentas de usuario de Moodle. Los administradores del sitio no serán afectados."
        loading={deleteLoading}
        confirmText={`Sí, eliminar ${usersToDelete.length} usuario(s)`}
      />

      <UserCreateModal 
        open={addUserOpen} 
        onClose={() => setAddUserOpen(false)} 
        onSuccess={() => refetch()} 
      />

      <UserCsvModal 
        open={uploadCsvOpen} 
        onClose={() => setUploadCsvOpen(false)} 
        onSuccess={() => refetch()} 
      />

      <UserExportModal 
        open={exportModalOpen} 
        onClose={() => setExportModalOpen(false)} 
        exportOption={exportOption} 
        setExportOption={setExportOption} 
        onExport={handleExport} 
        loading={exportLoading} 
      />
    </div>
  );
};
