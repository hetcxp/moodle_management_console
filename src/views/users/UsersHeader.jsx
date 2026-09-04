import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/FilterBar';
import { KpiGrid } from '../../components/KpiGrid';
import { UserPlus, Upload, UserCheck, UserX, Activity, Users } from 'lucide-react';

export function UsersHeader({
  totalCount, kpis, loading,
  search, onSearchChange,
  statusFilter, onStatusChange,
  hasUpdateUsers,
  onRefresh, onExport, onAddUser, onUploadCsv,
}) {
  return (
    <>
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
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre, email o usuario..."
        onRefresh={onRefresh}
        loading={loading}
        onExportCsv={onExport}
        primaryAction={hasUpdateUsers ? { label: 'Añadir Usuario', onClick: onAddUser, icon: <UserPlus className="h-4 w-4" /> } : null}
        secondaryAction={hasUpdateUsers ? { label: 'Cargar CSV', onClick: onUploadCsv, icon: <Upload className="h-4 w-4" /> } : null}
        filters={[
          {
            id: 'suspended',
            value: statusFilter,
            onChange: onStatusChange,
            options: [
              { label: 'Todos los estados', value: '-1' },
              { label: 'Solo Activos', value: '0' },
              { label: 'Solo Suspendidos', value: '1' }
            ]
          }
        ]}
      />
    </>
  );
}
