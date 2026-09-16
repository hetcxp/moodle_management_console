import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Layers, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { RubricDetailHeader } from './rubrics/RubricDetailHeader';
import { RubricMatrixTable } from './rubrics/RubricMatrixTable';
import { RubricDeleteModal } from './rubrics/RubricDeleteModal';
import { RubricFormModal } from './rubrics/RubricFormModal';
import { useRubricDetailState } from './rubrics/useRubricDetailState';

export const RubricDetailView = ({
  templateId,
  onBack,
  _onNavigateToDetail,
}) => {
  const [, setLocation] = useLocation();
  const handleBack = onBack || (() => setLocation('/competencies/rubrics'));

  const state = useRubricDetailState({
    templateId,
    onBack: handleBack,
  });

  if (state.isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-muted-foreground animate-fadeIn">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Cargando matriz analítica de la rúbrica...</span>
      </div>
    );
  }

  if (!state.rubric) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-12 text-center space-y-4 max-w-xl mx-auto my-12 animate-fadeIn">
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Layers className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Plantilla de rúbrica no encontrada</h2>
          <p className="text-xs text-muted-foreground">
            No se encontró ninguna plantilla de rúbrica con el identificador #{templateId}. Es posible que haya sido eliminada o que no tengas permisos de acceso.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a Plantillas de Rúbricas</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <RubricDetailHeader
        rubric={state.rubric}
        onBack={handleBack}
        hasManageCompetencies={state.hasManageCompetencies}
        isFetching={state.isFetching}
        onRefresh={state.refetch}
        onOpenEdit={state.handleOpenEdit}
        onOpenDelete={state.handleOpenDelete}
        onPrint={state.handlePrint}
        viewMode={state.viewMode}
        onViewModeChange={state.setViewMode}
      />

      <RubricMatrixTable
        rubric={state.rubric}
        viewMode={state.viewMode}
      />

      <RubricFormModal
        open={state.editModalOpen}
        initialData={state.rubric}
        onClose={() => state.setEditModalOpen(false)}
        onSave={state.handleSaveRubric}
      />

      <RubricDeleteModal
        open={state.deleteConfirmOpen}
        onClose={() => state.setDeleteConfirmOpen(false)}
        rubricToDelete={state.rubric}
        onConfirmDelete={state.handleConfirmDelete}
        deleteLoading={state.actionLoading}
      />
    </div>
  );
};
