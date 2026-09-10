import React from 'react';
import { useLocation } from 'wouter';
import { useCohortsState } from './cohorts/useCohortsState';
import { CohortsHeader } from './cohorts/CohortsHeader';
import { CohortsTable } from './cohorts/CohortsTable';
import { CohortCreateModal } from './cohorts/CohortCreateModal';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';

export const CohortsView = ({ onNavigateToDetail }) => {
  const [, setLocation] = useLocation();
  const state = useCohortsState();

  return (
    <div className="space-y-6 animate-fadeIn">
      <CohortsHeader
        totalCount={state.totalCount}
        kpis={state.kpis}
        loading={state.loading}
        search={state.search}
        onSearchChange={(val) => {
          state.setSearch(val);
          state.setPage(0);
        }}
        statusFilter={state.statusFilter}
        onStatusFilterChange={(val) => {
          state.setStatusFilter(val);
          state.setPage(0);
        }}
        onRefresh={() => state.refetch()}
        hasManageCohorts={state.hasManageCohorts}
        onOpenCreate={state.handleOpenCreate}
        onOpenExport={() => state.setExportModalOpen(true)}
      />

      <CohortsTable
        cohorts={state.cohorts}
        loading={state.loading}
        totalCount={state.totalCount}
        page={state.page}
        perPage={state.perPage}
        onPageChange={state.setPage}
        sort={state.sort}
        dir={state.dir}
        onSortChange={(newSort, newDir) => {
          state.setSort(newSort);
          state.setDir(newDir);
          state.setPage(0);
        }}
        selectedIds={state.selectedIds}
        onSelectionChange={state.setSelectedIds}
        hasManageCohorts={state.hasManageCohorts}
        onRowClick={(row) =>
          onNavigateToDetail ? onNavigateToDetail('cohort', row.id) : setLocation(`/cohorts/${row.id}`)
        }
        onOpenEdit={state.handleOpenEdit}
        onOpenDelete={state.handleOpenDelete}
      />

      <CohortCreateModal
        open={state.modalOpen}
        onClose={() => state.setModalOpen(false)}
        editingCohort={state.editingCohort}
      />

      {/* Modal: Confirmar Borrado */}
      <Dialog
        open={state.deleteConfirmOpen}
        onClose={() => state.setDeleteConfirmOpen(false)}
        title="¿Eliminar cohorte(s)?"
        description={`¿Estás seguro de que deseas eliminar ${state.cohortsToDelete.length} cohorte(s)? Esta acción desvinculará a los miembros asociados.`}
        footer={
          <>
            <Button variant="outline" onClick={() => state.setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={state.handleDelete} disabled={state.deleteLoading}>
              {state.deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </>
        }
      />

      {/* Modal: Opciones de Exportación */}
      <Dialog
        open={state.exportModalOpen}
        onClose={() => state.setExportModalOpen(false)}
        title="Opciones de Exportación"
        description="Selecciona el formato de exportación."
        footer={
          <>
            <Button variant="outline" onClick={() => state.setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={state.handleExport} disabled={state.exportLoading}>
              {state.exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Tipo de Exportación</label>
            <Select
              value={state.exportOption}
              onChange={(e) => state.setExportOption(e.target.value)}
            >
              <option value="visible">Exportar Resumen (solo información visible)</option>
              <option value="with_members">Exportar con Detalles (cohortes con lista de miembros)</option>
            </Select>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
