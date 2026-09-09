import React from 'react';
import { Link } from 'wouter';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PermissionGate } from '../../components/PermissionGate';
import { AdminerApi } from '../../services/adminer-api';
import { API_CONFIG } from '../../config/api';
import { formatDate } from '../../lib/utils';
import { ExternalLink, UserCheck, UserX, KeyRound, Trash2, Mail, Layers } from 'lucide-react';

export function UsersTable({
  users, loading, totalCount, page, perPage,
  sort, dir, selectedIds, setSelectedIds,
  hasUpdateUsers, hasDeleteUsers,
  onPageChange, onSortChange, onFilterChange, onRowClick,
  onBulkSuspend, onBulkActivate, onOpenDelete, onOpenTempPassConfirm,
}) {
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
              <Link 
                href={`/users/${row.id}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
              >
                {row.fullname}
              </Link>
              {row.is_admin === 1 && <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">Admin</span>}
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
      filterOptions: [{ label: 'Activo', value: '0' }, { label: 'Suspendido', value: '1' }],
      cell: (row) => <Badge variant={row.is_active === 1 ? 'success' : 'destructive'}>{row.is_active === 1 ? 'Activo' : 'Suspendido'}</Badge>
    },
    {
      header: 'Cohortes',
      sortKey: 'cohorts',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Layers className="h-3.5 w-3.5" /><span>{row.cohorts_count}</span>
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
              className={`h-full rounded-full transition-all duration-300 ${row.progress === 100 ? 'bg-emerald-500' : row.progress > 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              style={{ width: `${Math.min(row.progress, 100)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      header: 'Último Acceso',
      sortKey: 'lastaccess',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.lastaccess)}</span>
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
            <Button variant="ghost" size="icon" title="Enviar link de contraseña temporal"
              onClick={(e) => { e.stopPropagation(); onOpenTempPassConfirm([row.id]); }}
              disabled={row.is_admin === 1}
              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            {row.is_active === 1 ? (
              <Button variant="ghost" size="icon" title="Suspender usuario"
                onClick={(e) => { e.stopPropagation(); onBulkSuspend([row.id]); }}
                disabled={row.is_admin === 1}
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <UserX className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" title="Activar usuario"
                onClick={(e) => { e.stopPropagation(); onBulkActivate([row.id]); }}
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            )}
          </PermissionGate>
          <PermissionGate capability="can_delete_users">
            <Button variant="ghost" size="icon" title="Eliminar usuario"
              onClick={(e) => { e.stopPropagation(); onOpenDelete([row.id]); }}
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

  const bulkActions = [
    ...(hasUpdateUsers ? [
      { label: 'Activar Cuentas', icon: <UserCheck className="h-3.5 w-3.5" />, onClick: onBulkActivate, variant: 'success' },
      { label: 'Suspender Cuentas', icon: <UserX className="h-3.5 w-3.5" />, onClick: onBulkSuspend, variant: 'warning' },
      { label: 'Enviar Contraseña Temporal', icon: <KeyRound className="h-3.5 w-3.5" />, onClick: onOpenTempPassConfirm, variant: 'secondary' },
    ] : []),
    ...(hasDeleteUsers ? [{ label: 'Eliminar Usuarios', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: onOpenDelete, variant: 'destructive' }] : [])
  ];

  return (
    <DataTable
      columns={columns} data={users} loading={loading} totalCount={totalCount}
      page={page} perPage={perPage} onPageChange={onPageChange}
      sort={sort} dir={dir} onSortChange={onSortChange} onFilterChange={onFilterChange}
      onRowClick={onRowClick} selectable={true} selectedIds={selectedIds}
      onSelectionChange={setSelectedIds} bulkActions={bulkActions}
    />
  );
}
