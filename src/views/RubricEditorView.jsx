import React from 'react';
import { useRoute } from 'wouter';
import {
  ArrowLeft,
  AlertCircle,
  Plus,
  Save,
  Loader2,
  FileText,
  HelpCircle,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { RubricEditorHeader } from './rubrics/RubricEditorHeader';
import { RubricCriterionCard } from './rubrics/RubricCriterionCard';
import { useRubricEditorState } from './rubrics/useRubricEditorState';

export const RubricEditorView = ({
  templateId: propTemplateId,
  onBack,
  parentLabel = 'Rúbricas',
}) => {
  const [, editParams] = useRoute('/competencies/rubrics/:id/edit');
  const effectiveTemplateId = propTemplateId || editParams?.id || null;

  const state = useRubricEditorState({
    templateId: effectiveTemplateId,
    onBack,
  });

  if (state.isLoadingTemplate) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-muted-foreground animate-fadeIn">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Cargando plantilla de rúbrica para edición...</span>
      </div>
    );
  }

  if (state.templateNotFound) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-12 text-center space-y-4 max-w-xl mx-auto my-12 animate-fadeIn">
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Layers className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Plantilla no encontrada</h2>
          <p className="text-xs text-muted-foreground">
            No se encontró la plantilla de rúbrica #{effectiveTemplateId} para editar. Es posible que haya sido eliminada.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="outline" onClick={state.handleCancel} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a {parentLabel}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* Top Header */}
      <RubricEditorHeader
        isEditing={state.isEditing}
        totalMaxScore={state.totalMaxScore}
        criteriaCount={state.criteria.length}
        saving={state.saving}
        onSave={state.handleSave}
        onCancel={state.handleCancel}
        parentLabel={parentLabel}
        helpData={state.helpData}
        onToggleHelp={state.toggleHelp}
      />

      {/* Pedagogical Guidance Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-3.5 transition-all">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span>Orientaciones para el Diseño de Rúbricas</span>
            </h3>
            {state.toggleHelp && (
              <button
                type="button"
                onClick={state.toggleHelp}
                className="text-primary hover:underline font-semibold flex items-center gap-1 text-xs"
              >
                <span>Ver guía completa (?)</span>
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Una rúbrica analítica efectiva desglosa una competencia en dimensiones observables. 
            Define un mínimo de 2 niveles cualitativos por criterio comenzando desde 0 pts. El nivel con mayor puntuación será destacado automáticamente como <span className="font-bold text-foreground">Desempeño Óptimo</span>.
          </p>
        </div>
      </div>

      {/* Validation or API Error Banner */}
      {state.error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-3 animate-fadeIn"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Atención requerida al guardar</p>
            <p className="text-xs opacity-90 mt-0.5">{state.error}</p>
          </div>
        </div>
      )}

      {/* General Information Card */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Información General</h2>
            <p className="text-xs text-muted-foreground">
              Define el nombre representativo y la descripción o propósito formativo de la rúbrica.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="rubric-name" className="text-xs font-bold text-foreground">
              Nombre de la Plantilla de Rúbrica *
            </label>
            <Input
              id="rubric-name"
              placeholder="Ej: Rúbrica de Proyecto Final y Competencias Investigativas"
              value={state.name}
              onChange={(e) => state.setName(e.target.value)}
              className="font-medium"
              autoFocus={!state.isEditing}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rubric-description" className="text-xs font-bold text-foreground">
              Descripción pedagógica o contexto de evaluación
            </label>
            <textarea
              id="rubric-description"
              rows={3}
              placeholder="Detalla las instrucciones de aplicación, escala esperada o pautas para el evaluador..."
              value={state.description}
              onChange={(e) => state.setDescription(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
            />
          </div>
        </div>
      </div>

      {/* Criteria Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>Criterios y Niveles de Desempeño</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {state.criteria.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cada criterio define una dimensión a valorar y una progresión de niveles con puntaje y definición cualitativa.
            </p>
          </div>

          <Button
            type="button"
            onClick={state.handleAddCriterion}
            variant="outline"
            className="gap-2 border-dashed font-semibold shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir Criterio</span>
          </Button>
        </div>

        {/* List of Criteria */}
        <div className="space-y-5">
          {state.criteria.map((crit, idx) => (
            <RubricCriterionCard
              key={crit.id || idx}
              criterion={crit}
              criterionIndex={idx}
              totalCriteria={state.criteria.length}
              onDescChange={state.handleCriterionDescChange}
              onRemoveCriterion={state.handleRemoveCriterion}
              onDuplicateCriterion={state.handleDuplicateCriterion}
              onMoveCriterion={state.handleMoveCriterion}
              onAddLevel={state.handleAddLevel}
              onRemoveLevel={state.handleRemoveLevel}
              onLevelChange={state.handleLevelChange}
            />
          ))}
        </div>

        {/* Big Add Button at bottom of criteria */}
        <button
          type="button"
          onClick={state.handleAddCriterion}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-bold text-muted-foreground hover:text-primary flex items-center justify-center gap-2 group"
        >
          <div className="p-1 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
            <Plus className="h-4 w-4" />
          </div>
          <span>Añadir Otro Criterio de Evaluación</span>
        </button>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-lg border-t border-border/70 py-3.5 px-4 sm:px-8 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Puntaje total: <span className="text-amber-600 dark:text-amber-400 font-extrabold">{state.totalMaxScore} pts</span></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground border-l border-border pl-4">
              <Layers className="h-3.5 w-3.5" />
              <span>{state.criteria.length} criterio(s)</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={state.handleCancel}
              disabled={state.saving}
              className="text-xs font-semibold h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={state.handleSave}
              disabled={state.saving}
              className="text-xs font-bold h-9 px-4 gap-2 shadow-sm"
            >
              {state.saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{state.isEditing ? 'Guardar Cambios' : 'Crear Plantilla'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
