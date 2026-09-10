import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { KpiGrid } from '../../components/KpiGrid';
import { FilterBar } from '../../components/FilterBar';
import { Layers, Users, AlertCircle, BookOpen, Plus } from 'lucide-react';

export const CohortsHeader = ({
  totalCount,
  kpis,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  hasManageCohorts,
  onOpenCreate,
  onOpenExport
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Cohortes de Moodle</h1>
            <Badge variant="secondary">
              {totalCount} {totalCount === 1 ? 'cohorte' : 'cohortes'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Grupos globales de usuarios sincronizados en la plataforma.
          </p>
        </div>
      </div>

      {kpis && (
        <KpiGrid
          loading={loading}
          items={[
            {
              title: 'Total Cohortes',
              value: kpis.total_cohorts,
              icon: Layers,
              color: 'from-primary to-indigo-600',
              badgeColor: 'bg-primary/10 text-primary'
            },
            {
              title: 'Total Miembros',
              value: kpis.total_members,
              icon: Users,
              color: 'from-emerald-500 to-teal-600',
              badgeColor: 'bg-emerald-500/10 text-emerald-500'
            },
            {
              title: 'Cohortes Vacías',
              value: kpis.empty_cohorts,
              icon: AlertCircle,
              color: 'from-amber-500 to-orange-600',
              badgeColor: 'bg-amber-500/10 text-amber-500'
            },
            {
              title: 'Cursos Vinculados',
              value: kpis.synced_courses,
              icon: BookOpen,
              color: 'from-blue-500 to-sky-600',
              badgeColor: 'bg-blue-500/10 text-blue-500'
            }
          ]}
        />
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre de cohorte o ID..."
        onRefresh={onRefresh}
        loading={loading}
        onExportCsv={onOpenExport}
        primaryAction={
          hasManageCohorts
            ? {
                label: 'Nueva Cohorte',
                onClick: onOpenCreate,
                icon: <Plus className="h-4 w-4" />
              }
            : null
        }
        filters={[
          {
            id: 'empty_only',
            value: statusFilter,
            onChange: onStatusFilterChange,
            options: [
              { label: 'Todas las cohortes', value: '-1' },
              { label: 'Solo vacías', value: '1' },
              { label: 'Con miembros', value: '0' }
            ]
          }
        ]}
      />
    </div>
  );
};
