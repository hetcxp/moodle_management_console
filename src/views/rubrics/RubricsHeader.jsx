import React from 'react';
import {
  ChevronLeft,
  FileSpreadsheet,
  Layers,
  Award,
  Sliders,
  Plus,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { KpiGrid } from '../../components/KpiGrid';
import { FilterBar } from '../../components/FilterBar';

export const RubricsHeader = ({
  handleBack,
  parentLabel = 'Competencias',
  rubricsCount = 0,
  kpis,
  isLoading,
  isFetching,
  helpData,
  search,
  onSearchChange,
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
                Plantillas de Rúbricas
              </h1>
              <Badge variant="secondary">
                {rubricsCount} {rubricsCount === 1 ? 'plantilla' : 'plantillas'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Catálogo y administración centralizada de plantillas de rúbricas analíticas compartidas en Moodle.
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
            title: 'Total Plantillas',
            value: kpis.total,
            icon: FileSpreadsheet,
            color: 'from-blue-500 to-indigo-600',
            badgeColor: 'bg-blue-500/10 text-blue-500',
            details: [
              { label: 'En el banco', value: kpis.total, textClass: 'text-blue-600 font-semibold' },
            ],
          },
          {
            title: 'Criterios Evaluativos',
            value: kpis.totalCriteria,
            icon: Layers,
            color: 'from-emerald-500 to-teal-600',
            badgeColor: 'bg-emerald-500/10 text-emerald-500',
            details: [
              { label: 'Criterios analíticos', value: kpis.totalCriteria, textClass: 'text-emerald-600' },
            ],
          },
          {
            title: 'Promedio Criterios / Rúbrica',
            value: kpis.avgCriteria,
            icon: Sliders,
            color: 'from-purple-500 to-pink-600',
            badgeColor: 'bg-purple-500/10 text-purple-500',
            details: [
              { label: 'Profundidad media', value: `${kpis.avgCriteria} criterios`, textClass: 'text-purple-600 font-semibold' },
            ],
          },
          {
            title: 'Puntaje Máximo Promedio',
            value: `${kpis.avgMaxScore} pts`,
            icon: Award,
            color: 'from-amber-500 to-orange-600',
            badgeColor: 'bg-amber-500/10 text-amber-500',
            details: [
              { label: 'Escala analítica', value: '100% ponderado', textClass: 'text-amber-600 font-semibold' },
            ],
          },
        ]}
      />

      {/* Search & Actions Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre, código o descripción de rúbrica..."
        onRefresh={onRefresh}
        loading={isLoading || isFetching}
        primaryAction={
          hasManageCompetencies
            ? {
                label: 'Nueva Rúbrica',
                onClick: onOpenCreate,
                icon: <Plus className="h-4 w-4" aria-hidden="true" />,
              }
            : null
        }
      />
    </div>
  );
};
