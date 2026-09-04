import React from 'react';
import { ArrowLeft, Award, Eye, EyeOff, Layers, Sliders, Calendar, Clock, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/FilterBar';
import { PermissionGate } from '../../components/PermissionGate';
import { formatDate } from '../../lib/utils';

export function FrameworkDetailHeader({
  framework,
  loading,
  search,
  onSearchChange,
  onBack,
  hasManageCompetencies,
  onToggleVisibility,
  onOpenFrameworkReviews,
  onRefresh,
  onExport,
  onCreateCompetency,
}) {
  return (
    <>
      {/* Top Back Nav & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="group mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Volver a Marcos de Competencias</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-white shadow-md shadow-amber-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {framework?.shortname || 'Marco de Competencias'}
                </h1>
                {framework && (
                  <Badge variant={framework.visible === 1 ? 'success' : 'warning'}>
                    {framework.visible === 1 ? 'Visible' : 'Oculto'}
                  </Badge>
                )}
              </div>
              {framework?.idnumber && (
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  Código: {framework.idnumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Acciones Header */}
        {framework && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap mt-4 sm:mt-0">
            <PermissionGate capability="can_manage_competencies">
              <Button
                variant="outline"
                onClick={onToggleVisibility}
                title={framework.visible === 1 ? 'Ocultar marco' : 'Hacer visible'}
              >
                {framework.visible === 1 ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2 text-amber-600" /> Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2 text-emerald-600" /> Hacer Visible
                  </>
                )}
              </Button>
            </PermissionGate>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      {framework && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Competencias (Nivel 1)</p>
              <h4 className="text-xl font-bold text-foreground">{framework.competenciescount}</h4>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Sliders className="h-5 w-5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-muted-foreground">Escala de Evaluación</p>
              <h4 className="text-sm font-bold text-foreground truncate">{framework.scalename || 'Estándar'}</h4>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Última Modificación</p>
              <h4 className="text-xs font-semibold text-foreground">
                {framework.timemodified ? formatDate(framework.timemodified) : 'N/A'}
              </h4>
            </div>
          </div>

          <div
            onClick={onOpenFrameworkReviews}
            className={`bg-card/60 backdrop-blur-md rounded-2xl border p-4 shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer hover:border-amber-500/50 ${(framework.pendingreviewscount || 0) > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-xl shrink-0 ${(framework.pendingreviewscount || 0) > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Revisiones Pendientes</p>
                <h4 className="text-xl font-bold text-foreground">{framework.pendingreviewscount || 0}</h4>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFrameworkReviews();
              }}
              className="text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
            >
              {(framework.pendingreviewscount || 0) > 0 ? 'Revisar' : 'Ver'}
            </Button>
          </div>
        </div>
      )}

      {/* FilterBar */}
      <FilterBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar competencia por nombre o código..."
        onRefresh={onRefresh}
        loading={loading}
        onExportCsv={onExport}
        primaryAction={
          hasManageCompetencies
            ? {
                label: 'Nueva Competencia',
                onClick: onCreateCompetency,
                icon: <Plus className="h-4 w-4" />,
              }
            : null
        }
      />
    </>
  );
}
