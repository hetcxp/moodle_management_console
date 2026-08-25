import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { formatDate } from '../lib/utils';
import { PermissionGate } from '../components/PermissionGate';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api';
import { UserCheck, UserX, Trash2, Mail, Layers, BookOpen, ShieldAlert, UserPlus, Upload, ExternalLink, Activity, Users } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { KpiGrid } from '../components/KpiGrid';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const UsersView = ({ onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();

  const hasUpdateUsers = permissions?.is_siteadmin === 1 || permissions?.can_update_users === 1;
  const hasDeleteUsers = permissions?.is_siteadmin === 1 || permissions?.can_delete_users === 1;

  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage] = useState(20);
  const [sort, setSort] = useState('lastaccess');
  const [dir, setDir] = useState('DESC');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('-1');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [uploadCsvOpen, setUploadCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [userForm, setUserForm] = useState({ firstname: '', lastname: '', email: '', username: '', password: '' });
  const [userErrors, setUserErrors] = useState({});

  // Confirm delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = { ...filters };
      if (statusFilter !== '-1') {
        activeFilters.suspended = statusFilter;
      }
      
      const [res, kpiRes] = await Promise.all([
        AdminerApi.getUsers({
          page,
          perpage: perPage,
          sort,
          dir,
          search,
          filters: activeFilters
        }),
        AdminerApi.getUsersKpis()
      ]);
      
      setUsers(res.users || []);
      setTotalCount(res.totalcount || 0);
      setKpis(kpiRes);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al cargar usuarios',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sort, dir, search, filters, statusFilter, addToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBulkSuspend = async (ids = selectedIds) => {
    try {
      await AdminerApi.userAction({ action: 'suspend', userids: ids });
      addToast({
        type: 'success',
        title: 'Usuarios suspendidos',
        description: `Se suspendió el acceso a ${ids.length} usuario(s).`
      });
      setSelectedIds([]);
      loadUsers();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkActivate = async (ids = selectedIds) => {
    try {
      await AdminerApi.userAction({ action: 'activate', userids: ids });
      addToast({
        type: 'success',
        title: 'Usuarios activados',
        description: `Se reactivaron ${ids.length} usuario(s).`
      });
      setSelectedIds([]);
      loadUsers();
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
      await AdminerApi.userAction({ action: 'delete', userids: usersToDelete });
      addToast({
        type: 'success',
        title: 'Usuarios eliminados',
        description: `Se eliminaron ${usersToDelete.length} usuario(s) de la plataforma.`
      });
      setDeleteConfirmOpen(false);
      setSelectedIds([]);
      loadUsers();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async () => {
    let exportData = [];
    try {
      setLoading(true);
      const limit = 500;
      const pages = Math.ceil(totalCount / limit) || 1;
      
      for (let i = 0; i < pages; i++) {
        const res = await AdminerApi.getUsers({
          page: i,
          perpage: limit,
          sort,
          dir,
          search
        });
        if (res?.users) {
          exportData = [...exportData, ...res.users];
        }
      }
    } catch (err) {
      console.error("Export error", err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
      return;
    } finally {
      setLoading(false);
    }

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
            {row.is_active === 1 ? (
              <Button
                variant="ghost"
                size="icon"
                title="Suspender usuario"
                onClick={() => handleBulkSuspend([row.id])}
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
                onClick={() => handleBulkActivate([row.id])}
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
              onClick={() => handleOpenDelete([row.id])}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Directorio de Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
        onRefresh={loadUsers}
        loading={loading}
        onExportCsv={handleExport}
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
            }
          ] : []),
          ...(hasDeleteUsers ? [{
            label: 'Eliminar Usuarios',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            onClick: handleOpenDelete,
            variant: 'destructive'
          }] : [])
        ]}
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

      {/* Modal: Añadir Usuario */}
      <Dialog
        open={addUserOpen}
        onClose={() => { setAddUserOpen(false); setUserErrors({}); setUserForm({ firstname: '', lastname: '', email: '', username: '', password: '' }); }}
        title="Añadir Nuevo Usuario"
        description="Completa los datos para crear un nuevo usuario en la plataforma."
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddUserOpen(false); setUserErrors({}); setUserForm({ firstname: '', lastname: '', email: '', username: '', password: '' }); }}>Cancelar</Button>
            <Button onClick={async () => {
              const newErrors = {};
              if (!userForm.firstname || userForm.firstname.trim().length < 2) newErrors.firstname = 'El nombre debe tener al menos 2 caracteres.';
              if (!userForm.lastname || userForm.lastname.trim().length < 2) newErrors.lastname = 'El apellido debe tener al menos 2 caracteres.';
              if (!userForm.email || !/^\S+@\S+\.\S+$/.test(userForm.email)) newErrors.email = 'Debe ser un email válido.';
              if (!userForm.username || userForm.username.trim().length < 3) newErrors.username = 'El usuario debe tener al menos 3 caracteres.';
              if (!userForm.password || userForm.password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
              
              setUserErrors(newErrors);
              if (Object.keys(newErrors).length === 0) {
                setLoading(true);
                try {
                  const result = await AdminerApi.addUser(userForm);
                  if (result.success) {
                    addToast({ title: 'Usuario Creado', description: `ID: ${result.userid}`, type: 'success' });
                    setAddUserOpen(false);
                    setUserForm({ firstname: '', lastname: '', email: '', username: '', password: '' });
                    loadUsers();
                  } else {
                    addToast({ title: 'Error', description: result.message, type: 'error' });
                  }
                } catch (err) {
                  addToast({ title: 'Error', description: err.message, type: 'error' });
                } finally {
                  setLoading(false);
                }
              }
            }}>Guardar Usuario</Button>
          </>
        }
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Nombre *</label>
              <Input 
                placeholder="Ej. Juan" 
                value={userForm.firstname} 
                onChange={(e) => setUserForm({...userForm, firstname: e.target.value})}
                className={userErrors.firstname ? 'border-red-500' : ''}
              />
              {userErrors.firstname && <p className="text-xs text-red-500">{userErrors.firstname}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Apellidos *</label>
              <Input 
                placeholder="Ej. Pérez" 
                value={userForm.lastname} 
                onChange={(e) => setUserForm({...userForm, lastname: e.target.value})}
                className={userErrors.lastname ? 'border-red-500' : ''}
              />
              {userErrors.lastname && <p className="text-xs text-red-500">{userErrors.lastname}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold">Email *</label>
            <Input 
              type="email" 
              placeholder="juan.perez@ejemplo.com" 
              value={userForm.email} 
              onChange={(e) => setUserForm({...userForm, email: e.target.value})}
              className={userErrors.email ? 'border-red-500' : ''}
            />
            {userErrors.email && <p className="text-xs text-red-500">{userErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold">Nombre de usuario *</label>
            <Input 
              placeholder="juanperez" 
              value={userForm.username} 
              onChange={(e) => setUserForm({...userForm, username: e.target.value})}
              className={userErrors.username ? 'border-red-500' : ''}
            />
            {userErrors.username && <p className="text-xs text-red-500">{userErrors.username}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold">Contraseña *</label>
            <Input 
              type="password" 
              placeholder="Contraseña segura" 
              value={userForm.password} 
              onChange={(e) => setUserForm({...userForm, password: e.target.value})}
              className={userErrors.password ? 'border-red-500' : ''}
            />
            {userErrors.password && <p className="text-xs text-red-500">{userErrors.password}</p>}
          </div>
        </div>
      </Dialog>

      {/* Modal: Cargar CSV */}
      <Dialog
        open={uploadCsvOpen}
        onClose={() => { setUploadCsvOpen(false); setCsvFile(null); }}
        title="Cargar Usuarios desde CSV"
        description="Sube un archivo CSV con la lista de usuarios. El archivo debe contener cabeceras como username, firstname, lastname, email."
        footer={
          <>
            <Button variant="outline" onClick={() => { setUploadCsvOpen(false); setCsvFile(null); }}>Cancelar</Button>
            <Button 
              disabled={!csvFile || loading}
              onClick={() => {
                if (!csvFile) return;
                const reader = new FileReader();
                reader.onload = async (e) => {
                  try {
                    setLoading(true);
                    const base64Content = btoa(e.target.result);
                    const res = await AdminerApi.uploadUsersCsv(base64Content);
                    if (res.success) {
                      addToast({ title: 'Archivo subido', description: res.message, type: 'success' });
                      setUploadCsvOpen(false);
                      setCsvFile(null);
                      loadUsers();
                    } else {
                      addToast({ title: 'Error', description: res.message, type: 'error' });
                    }
                  } catch (err) {
                    addToast({ title: 'Error al procesar archivo', description: err.message, type: 'error' });
                  } finally {
                    setLoading(false);
                  }
                };
                reader.readAsText(csvFile);
            }}>Cargar Archivo</Button>
          </>
        }
      >
        <div className="pt-4">
          <div className="border-2 border-dashed border-border/60 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-muted/20 relative overflow-hidden">
            <Upload className="h-10 w-10 text-muted-foreground/60" />
            <div className="text-sm font-medium">{csvFile ? csvFile.name : 'Arrastra tu archivo CSV aquí'}</div>
            {!csvFile && <div className="text-xs text-muted-foreground">o</div>}
            <input 
              type="file" 
              accept=".csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setCsvFile(e.target.files[0])}
            />
            {!csvFile && <Button variant="secondary" size="sm" className="pointer-events-none">Seleccionar Archivo</Button>}
          </div>
        </div>
      </Dialog>

    </div>
  );
};
