import React from 'react';
import { useCompetenciesState } from './competencies/useCompetenciesState';
import { CompetenciesHeader } from './competencies/CompetenciesHeader';
import { CompetenciesTable } from './competencies/CompetenciesTable';
import { CompetencyReviewsModal } from './competencies/CompetencyReviewsModal';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';

export const CompetenciesView = ({ onNavigateToDetail }) => {
  const state = useCompetenciesState();

  return (
    <div className="space-y-6 animate-fadeIn">
      <CompetenciesHeader
        totalCount={state.totalCount}
        kpis={state.kpis}
        loading={state.loading}
        exportLoading={state.exportLoading}
        search={state.search}
        onSearchChange={(val) => { state.setSearch(val); state.setPage(0); }}
        visibilityFilter={state.visibilityFilter}
        onVisibilityChange={(val) => { state.setVisibilityFilter(val); state.setPage(0); }}
        hasManageCompetencies={state.hasManageCompetencies}
        onRefresh={() => state.refetch()}
        onExport={() => state.setExportModalOpen(true)}
        onCreate={state.handleOpenCreate}
        onOpenReviews={() => state.setReviewsModalOpen(true)}
      />

      <CompetenciesTable
        frameworks={state.frameworks}
        loading={state.loading}
        totalCount={state.totalCount}
        page={state.page}
        perPage={state.perPage}
        sort={state.sort}
        dir={state.dir}
        selectedIds={state.selectedIds}
        setSelectedIds={state.setSelectedIds}
        hasManageCompetencies={state.hasManageCompetencies}
        onPageChange={state.setPage}
        onSortChange={(newSort, newDir) => {
          state.setSort(newSort);
          state.setDir(newDir);
          state.setPage(0);
        }}
        onFilterChange={(newFilters) => {
          state.setFilters(newFilters);
          state.setPage(0);
        }}
        onRowClick={(row) => onNavigateToDetail?.('competency_framework', row.id)}
        onToggleVisibility={state.handleToggleVisibility}
        onOpenEdit={state.handleOpenEdit}
        onOpenDelete={state.handleOpenDelete}
      />

      {/* Modal: Crear / Editar Marco */}
      <Dialog
        open={state.modalOpen}
        onClose={() => state.setModalOpen(false)}
        title={state.editingFramework ? 'Editar Marco de Competencias' : 'Nuevo Marco de Competencias'}
        description="Configura el marco y su escala de calificación predeterminada."
        footer={
          <>
            <Button variant="outline" onClick={() => state.setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={state.handleSaveFramework} disabled={state.formLoading}>
              {state.formLoading
                ? 'Guardando...'
                : state.editingFramework
                ? 'Guardar Cambios'
                : 'Crear Marco'}
            </Button>
          </>
        }
      >
        <form onSubmit={state.handleSaveFramework} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre del Marco *</label>
            <Input
              value={state.formData.shortname}
              onChange={(e) => state.setFormData({ ...state.formData, shortname: e.target.value })}
              placeholder="Ej. Marco de Habilidades Digitales 2026"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Número ID / Código</label>
            <Input
              value={state.formData.idnumber}
              onChange={(e) => state.setFormData({ ...state.formData, idnumber: e.target.value })}
              placeholder="Ej. DIGITAL-2026"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Escala de Evaluación</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={state.formData.scaleid}
              onChange={(e) => state.setFormData({ ...state.formData, scaleid: Number(e.target.value) })}
            >
              {state.scales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isdefault === 1 ? '(Por defecto del sitio)' : ''} — [{s.items.join(', ')}]
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Define la escala con la que se medirán las competencias vinculadas a este marco.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Descripción</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={state.formData.description}
              onChange={(e) => state.setFormData({ ...state.formData, description: e.target.value })}
              placeholder="Detalle o propósito del marco de competencias..."
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="framework_visible_toggle"
              checked={Boolean(state.formData.visible)}
              onChange={(e) => state.setFormData({ ...state.formData, visible: e.target.checked ? 1 : 0 })}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <label htmlFor="framework_visible_toggle" className="text-xs font-medium text-foreground cursor-pointer">
              Marco visible para docentes y estudiantes
            </label>
          </div>
        </form>
      </Dialog>

      {/* Modal: Confirmar Borrado */}
      <Dialog
        open={state.deleteConfirmOpen}
        onClose={() => state.setDeleteConfirmOpen(false)}
        title="¿Eliminar marco(s) de competencias?"
        description={`¿Estás seguro de que deseas eliminar ${state.frameworksToDelete.length} marco(s)? Todas las competencias vinculadas serán eliminadas. Esta acción es irreversible.`}
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

      {/* Modal: Exportación CSV */}
      <Dialog
        open={state.exportModalOpen}
        onClose={() => state.setExportModalOpen(false)}
        title="Exportar Marcos de Competencias"
        description="Descarga un resumen en formato CSV con todos los marcos y su escala asociada."
        footer={
          <>
            <Button variant="outline" onClick={() => state.setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={state.handleExport} disabled={state.exportLoading}>
              {state.exportLoading ? 'Exportando...' : 'Descargar CSV'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            Se exportarán los {state.totalCount} registros coincidentes con los filtros actuales.
          </p>
        </div>
      </Dialog>

      {/* Modal: Revisiones Pendientes Globales */}
      <CompetencyReviewsModal
        open={state.reviewsModalOpen}
        onClose={() => state.setReviewsModalOpen(false)}
        title="Revisiones de Competencias Pendientes"
      />
    </div>
  );
};
