import React from 'react';
import {
  ChevronLeft,
  Sliders,
  Award,
  Layers,
  Lock,
  Plus,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { KpiGrid } from '../../components/KpiGrid';
import { FilterBar } from '../../components/FilterBar';

export const ScalesHeader = ({
  handleBack,
  parentLabel = 'Competencias',
  scalesCount = 0,
  scales = [],
  kpis,
  isLoading,
  isFetching,
  helpData,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  hasManageCompetencies,
  onOpenCreate,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2 h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Volver a {parentLabel}</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Escalas de Evaluación
              </h1>
              <Badge variant="secondary">
                {scalesCount} {scalesCount === 1 ? 'escala' : 'escalas'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Catálogo y administración de escalas de calificación estándar y personalizadas de Moodle.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <KpiGrid
        loading={isLoading}
        kpiHelpMap={helpData?.kpisHelp || {}}
        items={[
          {
            title: 'Total Escalas',
            value: kpis.total,
            icon: Sliders,
            color: 'from-blue-500 to-indigo-600',
            badgeColor: 'bg-blue-500/10 text-blue-500',
            details: [
              { label: 'En uso', value: kpis.inUse, textClass: 'text-blue-600 font-semibold' },
              { label: 'Sin marcos', value: kpis.total - kpis.inUse, textClass: 'text-muted-foreground' },
            ],
          },
          {
            title: 'En Uso en Marcos',
            value: kpis.inUse,
            icon: Award,
            color: 'from-emerald-500 to-teal-600',
            badgeColor: 'bg-emerald-500/10 text-emerald-500',
            details: [
              {
                label: 'Tasa de adopción',
                value: kpis.total > 0 ? `${Math.round((kpis.inUse / kpis.total) * 100)}%` : '0%',
                textClass: 'text-emerald-600',
              },
            ],
            progress: kpis.total > 0 ? (kpis.inUse / kpis.total) * 100 : 0,
          },
          {
            title: 'Escalas Bloqueadas',
            value: kpis.locked,
            icon: Lock,
            color: kpis.locked > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-500 to-slate-600',
            badgeColor: kpis.locked > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground',
            details: [
              {
                label: 'Con registros',
                value: kpis.locked > 0 ? 'Protegidas' : 'Ninguna',
                textClass: kpis.locked > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600',
              },
            ],
          },
          {
            title: 'Niveles Promedio',
            value: kpis.avgLevels,
            icon: Layers,
            color: 'from-purple-500 to-pink-600',
            badgeColor: 'bg-purple-500/10 text-purple-500',
            details: [
              { label: 'Escala estándar', value: scales.find((s) => s.isdefault === 1)?.name || 'Por defecto', textClass: 'text-purple-600' },
            ],
          },
        ]}
      />

      {/* FilterBar */}
      <FilterBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre de escala o niveles..."
        onRefresh={onRefresh}
        loading={isLoading || isFetching}
        primaryAction={
          hasManageCompetencies
            ? {
                label: 'Nueva Escala',
                onClick: onOpenCreate,
                icon: <Plus className="h-4 w-4" />,
              }
            : null
        }
        filters={[
          {
            id: 'status',
            label: 'Estado',
            value: statusFilter,
            onChange: onStatusFilterChange,
            options: [
              { label: 'Todas las escalas', value: 'all' },
              { label: 'En uso por marcos', value: 'in_use' },
              { label: 'Sin marcos asignados', value: 'unused' },
              { label: 'Solo bloqueadas (con registros)', value: 'locked' },
            ],
          },
        ]}
      />
    </div>
  );
};
