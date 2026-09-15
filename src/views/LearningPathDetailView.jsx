import React from 'react';
import { useLocation } from 'wouter';
import { useLearningPathDetailState } from './learning_paths/useLearningPathDetailState';
import { LearningPathStructureTab } from './learning_paths/LearningPathStructureTab';
import { LearningPathEnrolTab } from './learning_paths/LearningPathEnrolTab';
import { LearningPathProgressTab } from './learning_paths/LearningPathProgressTab';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ChevronLeft,
  Milestone,
  Calendar,
  Layers,
  CheckCircle2,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { formatDateOnly } from '../lib/utils';

export function LearningPathDetailView({
  id,
  onBack,
  _onNavigateToDetail,
  parentLabel = 'Rutas de Aprendizaje',
}) {
  const [, setLocation] = useLocation();
  const fallbackBack = React.useCallback(() => setLocation('/learning-paths'), [setLocation]);
  const handleBack = onBack || fallbackBack;

  const {
    path,
    loading,
    error,
    activeTab,
    setActiveTab,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    savingStructure,
    enrolling,
    deleting,
    handleSaveStructure,
    handleAssignCohorts,
    handleRemoveCohort,
    handleDeleteRequest,
    handleConfirmDelete,
  } = useLearningPathDetailState(id, handleBack);

  if (loading && !path) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground animate-fadeIn">
        Cargando detalles de la ruta de aprendizaje...
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className="p-8 text-center space-y-4 animate-fadeIn">
        <div className="text-destructive font-semibold">
          {error?.message || 'No se pudo cargar la ruta de aprendizaje solicitada.'}
        </div>
        <Button variant="outline" onClick={handleBack}>
          Volver al listado
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header y Migas de Pan */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            {parentLabel}
          </Button>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[300px]">
            {path.fullname}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Milestone className="h-6 w-6 text-primary" />
                <span>{path.fullname}</span>
              </h1>
              <Badge variant={path.visible === 1 ? 'success' : 'warning'}>
                {path.visible === 1 ? 'Visible' : 'Oculto'}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">
                {path.shortname}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Inicio: {formatDateOnly(path.startdate)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {path.sections?.length || 0} módulos enlazados
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {path.cohorts?.length || 0} cohortes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
              onClick={handleDeleteRequest}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Eliminar Ruta
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('structure')}
            className={`py-2.5 px-1 inline-flex items-center gap-2 border-b-2 text-xs font-bold transition-colors ${
              activeTab === 'structure'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Estructura Modular
          </button>

          <button
            onClick={() => setActiveTab('enrolments')}
            className={`py-2.5 px-1 inline-flex items-center gap-2 border-b-2 text-xs font-bold transition-colors ${
              activeTab === 'enrolments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Matrículas y Cohortes
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`py-2.5 px-1 inline-flex items-center gap-2 border-b-2 text-xs font-bold transition-colors ${
              activeTab === 'progress'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Seguimiento de Progreso
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'structure' && (
          <LearningPathStructureTab
            path={path}
            onSave={handleSaveStructure}
            saving={savingStructure}
          />
        )}

        {activeTab === 'enrolments' && (
          <LearningPathEnrolTab
            path={path}
            onAssignCohorts={handleAssignCohorts}
            onRemoveCohort={handleRemoveCohort}
            loading={enrolling}
          />
        )}

        {activeTab === 'progress' && (
          <LearningPathProgressTab path={path} />
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Ruta de Aprendizaje"
        description={`¿Estás seguro de que deseas eliminar permanentemente la ruta "${path?.fullname}"? Se eliminará el curso contenedor y su configuración.`}
        confirmText="Eliminar Ruta"
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
