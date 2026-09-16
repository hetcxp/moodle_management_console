import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/FilterBar';
import { KpiGrid } from '../../components/KpiGrid';
import { Award, Layers, Eye, Clock, Plus, Sliders, FileSpreadsheet } from 'lucide-react';
import { useHelp } from '../../context/HelpContext';

export function CompetenciesHeader({
  totalCount, kpis, loading, exportLoading,
  search, onSearchChange,
  visibilityFilter, onVisibilityChange,
  hasManageCompetencies,
  onRefresh, onExport, onCreate, onOpenReviews, onOpenScales, onOpenRubrics,
}) {
  const { helpData } = useHelp();

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
          kpiHelpMap={helpData?.kpisHelp || {}}
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
        secondaryAction={
          hasManageCompetencies && onOpenScales
            ? {
                label: 'Escalas',
                onClick: onOpenScales,
                icon: <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" aria-hidden="true" />,
                variant: 'outline',
                className: 'group border-indigo-300/80 dark:border-indigo-700/60 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/40 dark:to-blue-950/20 text-indigo-700 dark:text-indigo-300 hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/60 dark:hover:to-blue-900/40 hover:border-indigo-400 font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]',
              }
            : null
        }
        extraActions={
          onOpenRubrics
            ? [
                {
                  label: 'Rúbricas',
                  onClick: onOpenRubrics,
                  icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" aria-hidden="true" />,
                  variant: 'outline',
                  className: 'group border-emerald-300/80 dark:border-emerald-700/60 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 text-emerald-700 dark:text-emerald-300 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/60 dark:hover:to-teal-900/40 hover:border-emerald-400 font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]',
                },
              ]
            : []
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
