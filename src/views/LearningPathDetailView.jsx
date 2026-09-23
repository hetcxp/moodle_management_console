import React, { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useLearningPathDetailState } from './learning_paths/useLearningPathDetailState';
import { LearningPathDetailKpis } from './learning_paths/LearningPathDetailKpis';
import { LearningPathStructureTab } from './learning_paths/LearningPathStructureTab';
import { LearningPathCohortsTab } from './learning_paths/LearningPathCohortsTab';
import { LearningPathUsersTab } from './learning_paths/LearningPathUsersTab';
import { LearningPathProgressTab } from './learning_paths/LearningPathProgressTab';
import { UnsavedChangesDialog } from './learning_paths/UnsavedChangesDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ChevronLeft,
  ChevronRight,
  Milestone,
  Calendar,
  Layers,
  CheckCircle2,
  Trash2,
  BookOpen,
  ExternalLink,
  Users,
} from 'lucide-react';
import { formatDateOnly } from '../lib/utils';

export function LearningPathDetailView({
  id,
  onBack,
  _onNavigateToDetail,
  parentLabel = 'Rutas de Aprendizaje',
}) {
  const [, setLocation] = useLocation();
  const fallbackBack = useCallback(() => setLocation('/learning-paths'), [setLocation]);
  const handleBack = onBack || fallbackBack;

  const {
    path,
    loading,
    error,
    activeTab,
    setActiveTab,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    isStructureDirty,
    setIsStructureDirty,
    structureDraft,
    setStructureDraft,
    savingStructure,
    enrolling,
    deleting,
    handleSaveStructure,
    handleAssignCohorts,
    handleRemoveCohort,
    handleAssignUsers,
    handleRemoveUser,
    handleDeleteRequest,
    handleConfirmDelete,
    handleViewInMoodle,
  } = useLearningPathDetailState(id, handleBack);

  // Estado de navegación interceptada cuando hay cambios sin guardar en la estructura
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const handleGuardedTabChange = (targetTab) => {
    if (targetTab === activeTab) return;
    if (isStructureDirty && activeTab === 'structure') {
      setPendingNavigation({ type: 'tab', targetTab });
      return;
    }
    setActiveTab(targetTab);
  };

  const handleGuardedBack = () => {
    if (isStructureDirty && activeTab === 'structure') {
      setPendingNavigation({ type: 'back' });
      return;
    }
    handleBack();
  };

  const handleDiscardNavigation = () => {
    setIsStructureDirty(false);
    const nav = pendingNavigation;
    setPendingNavigation(null);
    if (!nav) return;
    if (nav.type === 'tab') {
      setActiveTab(nav.targetTab);
    } else if (nav.type === 'back') {
      handleBack();
    }
  };

  const handleSaveAndContinueNavigation = async () => {
    if (!structureDraft) {
      handleDiscardNavigation();
      return;
    }
    const ok = await handleSaveStructure(structureDraft);
    if (ok) {
      setIsStructureDirty(false);
      const nav = pendingNavigation;
      setPendingNavigation(null);
      if (!nav) return;
      if (nav.type === 'tab') {
        setActiveTab(nav.targetTab);
      } else if (nav.type === 'back') {
        handleBack();
      }
    }
  };

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

  const linkedModulesCount = path.sections?.filter((s) => s.subcourse_course_id).length || 0;
  const enrolledUsersCount = path.users?.length ?? (path.progress_matrix?.length || 0);
  const cohortsCount = path.cohorts?.length || 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header y Migas de Pan */}
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm font-medium text-muted-foreground">
          <button
            onClick={handleGuardedBack}
            className="flex items-center hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {parentLabel}
          </button>
          <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
          <span className="text-foreground truncate max-w-[300px]">{path.fullname}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <Milestone className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {path.fullname}
                </h1>
                <Badge variant={path.visible === 1 ? 'success' : 'warning'}>
                  {path.visible === 1 ? 'Visible' : 'Oculto'}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">
                  {path.shortname}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Inicio: {formatDateOnly(path.startdate)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {linkedModulesCount} {linkedModulesCount === 1 ? 'módulo' : 'módulos'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  {cohortsCount} {cohortsCount === 1 ? 'cohorte' : 'cohortes'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleViewInMoodle(path.id)}
              title="Ver curso contenedor en Moodle"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver en Moodle
            </Button>
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

      {/* Indicadores Clave (KPIs) */}
      <LearningPathDetailKpis path={path} />

      {/* Pestañas de Navegación Tipo Píldora */}
      <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50">
        <button
          onClick={() => handleGuardedTabChange('structure')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'structure'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Estructura Modular</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            {linkedModulesCount}
          </Badge>
        </button>

        <button
          onClick={() => handleGuardedTabChange('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'users'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Usuarios Matriculados</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            {enrolledUsersCount}
          </Badge>
        </button>

        <button
          onClick={() => handleGuardedTabChange('cohorts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'cohorts'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Cohortes Vinculadas</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            {cohortsCount}
          </Badge>
        </button>

        <button
          onClick={() => handleGuardedTabChange('progress')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'progress'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Seguimiento de Progreso</span>
        </button>
      </div>

      {/* Contenido de Paneles de Pestañas */}
      <div className="pt-2">
        {activeTab === 'structure' && (
          <LearningPathStructureTab
            path={path}
            onSave={handleSaveStructure}
            saving={savingStructure}
            onViewInMoodle={handleViewInMoodle}
            onDirtyChange={(dirty, payload) => {
              setIsStructureDirty(dirty);
              setStructureDraft(payload);
            }}
          />
        )}

        {activeTab === 'users' && (
          <LearningPathUsersTab
            path={path}
            onAssignUsers={handleAssignUsers}
            onRemoveUser={handleRemoveUser}
            loading={enrolling}
          />
        )}

        {activeTab === 'cohorts' && (
          <LearningPathCohortsTab
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

      {/* Diálogo de Confirmación para Eliminar Ruta */}
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

      {/* Diálogo Tripartito para Cambios Sin Guardar en Estructura (Opción B) */}
      <UnsavedChangesDialog
        open={Boolean(pendingNavigation)}
        onStay={() => setPendingNavigation(null)}
        onDiscard={handleDiscardNavigation}
        onSaveAndContinue={handleSaveAndContinueNavigation}
        loading={savingStructure}
      />
    </div>
  );
}

