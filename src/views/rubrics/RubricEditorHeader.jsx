import React from 'react';
import { ArrowLeft, Award, Layers, Save, Loader2, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { HelpTooltip } from '../../components/ui/HelpTooltip';

export const RubricEditorHeader = ({
  isEditing,
  totalMaxScore,
  criteriaCount,
  saving,
  onSave,
  onCancel,
  parentLabel = 'Rúbricas',
  helpData,
  onToggleHelp,
}) => {
  return (
    <div className="border-b border-border/70 pb-6 mb-6">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4 flex-wrap gap-y-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>Volver a {parentLabel}</span>
        </button>
        <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
        <span className="text-foreground font-semibold">
          {isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}
        </span>
      </nav>

      {/* Main Header Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 mt-0.5">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isEditing ? 'Editar Plantilla de Rúbrica' : 'Nueva Plantilla de Rúbrica'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              {isEditing
                ? 'Modifica los criterios, niveles y ponderaciones de la matriz analítica de evaluación.'
                : 'Diseña una matriz analítica de evaluación completa con criterios ponderados y niveles cualitativos.'}
            </p>
          </div>
        </div>

        {/* Real-time score & actions */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
            <Award className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div className="flex items-center gap-1">
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">Puntaje Máximo</p>
                {helpData?.kpisHelp?.['Puntaje Máximo'] && (
                  <HelpTooltip text={helpData.kpisHelp['Puntaje Máximo']} align="center" />
                )}
              </div>
              <p className="text-base font-black leading-none">{`${totalMaxScore} pts`}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border text-muted-foreground">
            <Layers className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div className="flex items-center gap-1">
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">Criterios</p>
                {helpData?.kpisHelp?.['Criterios'] && (
                  <HelpTooltip text={helpData.kpisHelp['Criterios']} align="center" />
                )}
              </div>
              <p className="text-base font-black text-foreground leading-none">{criteriaCount}</p>
            </div>
          </div>

          {onToggleHelp && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onToggleHelp}
              title="Abrir panel de ayuda contextual (?)"
              aria-label="Abrir panel de ayuda contextual"
              className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="h-10 px-4 text-xs font-semibold"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="h-10 px-5 text-xs font-bold gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{isEditing ? 'Guardar Cambios' : 'Crear Plantilla'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
