import React from 'react';
import {
  ArrowLeft,
  Award,
  Layers,
  User,
  Calendar,
  Trash2,
  Printer,
  RotateCw,
  Table as TableIcon,
  LayoutGrid,
  Info,
  Pencil,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { HelpTooltip } from '../../components/ui/HelpTooltip';

export const RubricDetailHeader = ({
  rubric,
  helpData,
  onBack,
  hasManageCompetencies = false,
  isFetching = false,
  onRefresh,
  onOpenEdit,
  onOpenDelete,
  onPrint,
  viewMode = 'matrix',
  onViewModeChange,
}) => {
  if (!rubric) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const totalLevels = rubric.criteria?.reduce((acc, c) => acc + (c.levels?.length || 0), 0) || 0;
  const avgLevelsPerCrit = rubric.criteria?.length
    ? (totalLevels / rubric.criteria.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Bar: Back link & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 text-muted-foreground hover:text-foreground font-medium pl-1 pr-3"
            aria-label="Volver al banco de plantillas de rúbricas"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a Rúbricas</span>
          </Button>

          <span className="text-muted-foreground/40 hidden sm:inline">•</span>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-muted/40 font-semibold border-border">
              ID: {rubric.id}
            </Badge>
            <Badge variant="outline" className="text-xs bg-muted/40 font-semibold border-border">
              Área: {rubric.areaid}
            </Badge>
            <Badge
              variant="secondary"
              className="text-xs font-semibold bg-primary/10 text-primary border-primary/20"
            >
              Plantilla Compartida
            </Badge>
          </div>
        </div>

        {/* Action Buttons & View Mode */}
        <div className="flex items-center flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'matrix'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Vista Matriz Completa"
              aria-pressed={viewMode === 'matrix'}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Matriz</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Vista por Tarjetas de Criterios"
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Tarjetas</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Imprimir o guardar matriz en PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Imprimir / PDF</span>
          </Button>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Actualizar datos de la rúbrica"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refrescar</span>
            </Button>
          )}

          {hasManageCompetencies && onOpenEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenEdit}
              className="gap-1.5 text-xs text-foreground hover:text-primary hover:border-primary/50"
              title="Editar plantilla de rúbrica"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Editar</span>
            </Button>
          )}

          {hasManageCompetencies && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenDelete}
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
              title="Eliminar plantilla de rúbrica"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Eliminar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Title & KPIs Cards */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-2 flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight break-words">
              {rubric.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                {rubric.author_name || 'Administrador Moodle'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Última actualización: {formatDate(rubric.timemodified || rubric.timecreated)}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Puntaje Máximo */}
            <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center min-w-[120px]">
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
                <Award className="h-3.5 w-3.5" />
                <span>Puntaje Total</span>
                {helpData?.kpisHelp?.['Puntaje Total'] && (
                  <HelpTooltip text={helpData.kpisHelp['Puntaje Total']} align="center" />
                )}
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {rubric.max_score} pts
              </div>
            </div>

            {/* Total Criterios */}
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[120px]">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                <span>Criterios</span>
                {helpData?.kpisHelp?.['Criterios'] && (
                  <HelpTooltip text={helpData.kpisHelp['Criterios']} align="center" />
                )}
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {rubric.criteria_count || 0}
              </div>
            </div>

            {/* Niveles por criterio */}
            <div className="px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-center min-w-[120px]">
              <div className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center justify-center gap-1">
                <Info className="h-3.5 w-3.5" />
                <span>Prom. Niveles</span>
                {helpData?.kpisHelp?.['Prom. Niveles'] && (
                  <HelpTooltip text={helpData.kpisHelp['Prom. Niveles']} align="center" />
                )}
              </div>
              <div className="text-2xl font-black text-primary mt-0.5">
                {avgLevelsPerCrit}
              </div>
            </div>
          </div>
        </div>

        {/* Metodología / Descripción */}
        {rubric.description && (
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" />
              Descripción Metodológica e Instruccional
            </span>
            <div
              className="text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: rubric.description }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
