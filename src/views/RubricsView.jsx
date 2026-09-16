import React from 'react';
import { useLocation } from 'wouter';
import { useRubricsState } from './rubrics/useRubricsState';
import { RubricsHeader } from './rubrics/RubricsHeader';
import { RubricsTable } from './rubrics/RubricsTable';
import { RubricPreviewModal } from './rubrics/RubricPreviewModal';
import { RubricFormModal } from './rubrics/RubricFormModal';
import { RubricDeleteModal } from './rubrics/RubricDeleteModal';

export const RubricsView = ({ onBack, parentLabel = 'Competencias' }) => {
  const [, setLocation] = useLocation();
  const handleBack = onBack || (() => setLocation('/competencies'));

  const state = useRubricsState();

  return (
    <div className="space-y-6 animate-fadeIn">
      <RubricsHeader
        handleBack={handleBack}
        parentLabel={parentLabel}
        rubricsCount={state.totalCount}
        kpis={state.kpis}
        isLoading={state.isLoading}
        isFetching={state.isFetching}
        helpData={state.helpData}
        search={state.search}
        onSearchChange={state.setSearch}
        onRefresh={() => state.refetch()}
        hasManageCompetencies={state.hasManageCompetencies}
        onOpenCreate={state.handleOpenCreate}
      />

      <RubricsTable
        templates={state.templates}
        isLoading={state.isLoading}
        hasManageCompetencies={state.hasManageCompetencies}
        search={state.search}
        onOpenPreview={state.handleOpenPreview}
        onOpenDelete={state.handleOpenDelete}
      />

      <RubricPreviewModal
        open={state.previewModalOpen}
        onClose={() => {
          state.setPreviewModalOpen(false);
        }}
        rubric={state.selectedRubric}
      />

      <RubricFormModal
        open={state.formModalOpen}
        onClose={() => {
          state.setFormModalOpen(false);
        }}
        onSave={state.handleSaveRubric}
      />

      <RubricDeleteModal
        open={state.deleteConfirmOpen}
        onClose={() => {
          state.setDeleteConfirmOpen(false);
        }}
        rubricToDelete={state.rubricToDelete}
        onConfirmDelete={state.handleConfirmDelete}
        deleteLoading={state.actionLoading}
      />
    </div>
  );
};
