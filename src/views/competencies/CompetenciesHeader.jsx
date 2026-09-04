import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/FilterBar';
import { KpiGrid } from '../../components/KpiGrid';
import { Award, Layers, Eye, Clock, Plus } from 'lucide-react';

export function CompetenciesHeader({
  totalCount, kpis, loading, exportLoading,
  search, onSearchChange,
  visibilityFilter, onVisibilityChange,
  hasManageCompetencies,
  onRefresh, onExport, onCreate, onOpenReviews,
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Marcos de Competencias</h1>
            <Badge variant="secondary">{totalCount} {totalCount === 1 ? 'marco' : 'marcos'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Estructura y gestión de competencias institucionales de Moodle.
          </p>
        </div>
      </div>

      {kpis && (
        <KpiGrid
          loading={loading}
          items={[
            {
              title: 'Marcos de Competencias',
              value: kpis.total_frameworks,
              icon: Award,
              color: 'from-amber-500 to-orange-600',
              badgeColor: 'bg-amber-500/10 text-amber-500',
              details: [
                { label: 'Visibles', value: kpis.visible_frameworks, textClass: 'text-emerald-600' },
                { label: 'Ocultos', value: kpis.hidden_frameworks, textClass: 'text-muted-foreground' },
              ],
            },
            {
              title: 'Total Competencias',
              value: kpis.total_competencies,
              icon: Layers,
              color: 'from-blue-500 to-sky-600',
              badgeColor: 'bg-blue-500/10 text-blue-500',
              details: [
                {
                  label: 'Promedio / marco',
                  value: kpis.total_frameworks > 0 ? (kpis.total_competencies / kpis.total_frameworks).toFixed(1) : 0,
                  textClass: 'text-blue-600',
                },
                {
                  label: 'Total asignadas',
                  value: kpis.total_competencies,
                  textClass: 'text-muted-foreground',
                },
              ],
            },
            {
              title: 'Marcos Visibles',
              value: kpis.visible_frameworks,
              icon: Eye,
              color: 'from-emerald-500 to-teal-600',
              badgeColor: 'bg-emerald-500/10 text-emerald-500',
              details: [
                {
                  label: 'Tasa visibilidad',
                  value: kpis.total_frameworks > 0 ? `${Math.round((kpis.visible_frameworks / kpis.total_frameworks) * 100)}%` : '0%',
                  textClass: 'text-emerald-600',
                },
                {
                  label: 'Ocultos',
                  value: kpis.hidden_frameworks,
                  textClass: 'text-amber-600',
                },
              ],
              progress: kpis.total_frameworks > 0 ? (kpis.visible_frameworks / kpis.total_frameworks) * 100 : 0,
            },
            {
              title: 'Revisiones Pendientes',
              value: kpis.pending_reviews || 0,
              icon: Clock,
              color: (kpis.pending_reviews || 0) > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-500 to-slate-600',
              badgeColor: (kpis.pending_reviews || 0) > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground',
              details: [
                {
                  label: 'Estado',
                  value: (kpis.pending_reviews || 0) > 0 ? 'Requiere atención' : 'Al día',
                  textClass: (kpis.pending_reviews || 0) > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600',
                },
              ],
              actionLabel: (kpis.pending_reviews || 0) > 0 ? 'Revisar pendientes' : 'Ver revisiones',
              onClick: onOpenReviews,
            },
          ]}
        />
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre, código o descripción..."
        onRefresh={onRefresh}
        loading={loading || exportLoading}
        onExportCsv={onExport}
        primaryAction={
          hasManageCompetencies
            ? {
                label: 'Nuevo Marco',
                onClick: onCreate,
                icon: <Plus className="h-4 w-4" />,
              }
            : null
        }
        filters={[
          {
            id: 'visible',
            value: visibilityFilter,
            onChange: onVisibilityChange,
            options: [
              { label: 'Todos los estados', value: '-1' },
              { label: 'Solo Visibles', value: '1' },
              { label: 'Solo Ocultos', value: '0' },
            ],
          },
        ]}
      />
    </>
  );
}
