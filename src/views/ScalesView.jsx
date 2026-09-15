import React from 'react';
import { useLocation } from 'wouter';
import { useScalesState } from './scales/useScalesState';
import { ScalesHeader } from './scales/ScalesHeader';
import { ScalesTable } from './scales/ScalesTable';
import { ScaleDeleteModal } from './scales/ScaleDeleteModal';
import { ScaleFormModal } from './competencies/ScaleFormModal';

export const ScalesView = ({ onBack, parentLabel = 'Competencias' }) => {
  const [, setLocation] = useLocation();
  const handleBack = onBack || (() => setLocation('/competencies'));

  const state = useScalesState();

  return (
    <div className="space-y-6 animate-fadeIn">
      <ScalesHeader
        handleBack={handleBack}
        parentLabel={parentLabel}
        scalesCount={state.scales.length}
        scales={state.scales}
        kpis={state.kpis}
        isLoading={state.isLoading}
        isFetching={state.isFetching}
        helpData={state.helpData}
        search={state.search}
        onSearchChange={state.setSearch}
        statusFilter={state.statusFilter}
        onStatusFilterChange={state.setStatusFilter}
        onRefresh={() => state.refetch()}
        hasManageCompetencies={state.hasManageCompetencies}
        onOpenCreate={state.handleOpenCreate}
      />

      <ScalesTable
        filteredScales={state.filteredScales}
        hasManageCompetencies={state.hasManageCompetencies}
        search={state.search}
        statusFilter={state.statusFilter}
        onOpenEdit={state.handleOpenEdit}
        onOpenDelete={state.handleOpenDelete}
      />

      <ScaleFormModal
        open={state.formModalOpen}
        onClose={() => {
          state.setFormModalOpen(false);
          state.setEditingScale(null);
        }}
        scale={state.editingScale}
        onSuccess={() => state.refetch()}
      />

      <ScaleDeleteModal
        open={state.deleteConfirmOpen}
        onClose={() => {
          state.setDeleteConfirmOpen(false);
          state.setScaleToDelete(null);
        }}
        scaleToDelete={state.scaleToDelete}
        onConfirmDelete={state.handleConfirmDelete}
        deleteLoading={state.deleteLoading}
      />
    </div>
  );
};

