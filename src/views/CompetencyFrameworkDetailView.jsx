import React from 'react';
import { useLocation } from 'wouter';
import { useFrameworkDetailState } from './competencies/useFrameworkDetailState';
import { FrameworkDetailHeader } from './competencies/FrameworkDetailHeader';
import { CompetenciesTree } from './competencies/CompetenciesTree';
import { CompetencyCoursesModal } from './competencies/CompetencyCoursesModal';
import { CompetencyReviewsModal } from './competencies/CompetencyReviewsModal';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';

export const CompetencyFrameworkDetailView = ({ frameworkId, onBack, onNavigateToDetail }) => {
  const [, setLocation] = useLocation();
  const handleBack = onBack || (() => setLocation('/competencies'));
  const handleNavigateToDetail = onNavigateToDetail || ((entity, id) => {
    if (entity === 'competency') {
      if (typeof id === 'object' && id.frameworkId && id.competencyId) {
        setLocation(`/competencies/${id.frameworkId}/competency/${id.competencyId}`);
      } else {
        setLocation(`/competencies/${id}`);
      }
    } else {
      setLocation(`/${entity}s/${id}`);
    }
  });
  const state = useFrameworkDetailState({ frameworkId, onNavigateToDetail: handleNavigateToDetail });

  return (
    <div className="space-y-6 animate-fadeIn">
      <FrameworkDetailHeader
        framework={state.framework}
        loading={state.loading}
        search={state.search}
        onSearchChange={(val) => {
          state.setSearch(val);
          state.setPage(0);
        }}
        onBack={handleBack}
        hasManageCompetencies={state.hasManageCompetencies}
        onToggleVisibility={state.handleToggleVisibility}
        onOpenFrameworkReviews={state.handleOpenFrameworkReviews}
        onRefresh={() => state.refetch()}
        onExport={() => state.setExportModalOpen(true)}
        onCreateCompetency={state.handleOpenCreate}
      />

      <CompetenciesTree
        competencies={state.competencies}
        loading={state.loading}
        totalCount={state.totalCount}
        page={state.page}
        perPage={state.perPage}
        sort={state.sort}
        dir={state.dir}
        onPageChange={state.setPage}
        onSortChange={(newSort, newDir) => {
          state.setSort(newSort);
          state.setDir(newDir);
          state.setPage(0);
        }}
        onOpenCompetencyDetail={state.handleOpenCompetencyDetail}
        onOpenCreateSubcomp={state.handleOpenCreateSubcomp}
        onOpenReviewsForCompetency={state.handleOpenReviewsForCompetency}
        onOpenEdit={state.handleOpenEdit}
        onOpenDelete={state.handleOpenDelete}
      />

      {/* Modal: Crear / Editar Competencia */}
      <Dialog
        open={state.modalOpen}
        onClose={() => state.setModalOpen(false)}
        title={
          state.editingCompetency
            ? 'Editar Competencia'
            : state.formData.parentid > 0
            ? 'Nueva Subcompetencia'
            : 'Nueva Competencia (Nivel 1)'
        }
        description={
          state.formData.parentid > 0
            ? 'Crea una subcompetencia jerárquica asociada a una competencia padre.'
            : 'Define la competencia institucional dentro de este marco.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => state.setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={state.handleSaveCompetency} disabled={state.formLoading}>
              {state.formLoading
                ? 'Guardando...'
                : state.editingCompetency
                ? 'Guardar Cambios'
                : state.formData.parentid > 0
                ? 'Crear Subcompetencia'
                : 'Crear Competencia'}
            </Button>
          </>
        }
      >
        <form onSubmit={state.handleSaveCompetency} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Jerarquía / Nivel</label>
            {state.editingCompetency && (state.competencies.some((c) => c.parentid === state.editingCompetency.id) || (state.editingCompetency.childrencount || 0) > 0) ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Nivel 1 (Competencia Principal)</span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Esta competencia tiene subcompetencias asociadas y no puede convertirse en subcompetencia.
                </p>
              </div>
            ) : (
              <select
                value={state.formData.parentid}
                onChange={(e) => state.setFormData({ ...state.formData, parentid: Number(e.target.value) })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="0">Nivel 1 (Competencia Principal)</option>
                {state.competencies
                  .filter((c) => (c.parentid || 0) === 0 && (!state.editingCompetency || c.id !== state.editingCompetency.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      Subcompetencia de: {c.shortname} {c.idnumber ? `(${c.idnumber})` : ''}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre de la Competencia *</label>
            <Input
              value={state.formData.shortname}
              onChange={(e) => state.setFormData({ ...state.formData, shortname: e.target.value })}
              placeholder="Ej. Análisis de Datos y Visualización"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Número ID / Código</label>
            <Input
              value={state.formData.idnumber}
              onChange={(e) => state.setFormData({ ...state.formData, idnumber: e.target.value })}
              placeholder="Ej. COMP-DATA-01"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Descripción</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={state.formData.description}
              onChange={(e) => state.setFormData({ ...state.formData, description: e.target.value })}
              placeholder="Criterios y alcance de la competencia..."
            />
          </div>
        </form>
      </Dialog>

      {/* Modal: Confirmar Borrado */}
      <Dialog
        open={state.deleteConfirmOpen}
        onClose={() => state.setDeleteConfirmOpen(false)}
        title="¿Eliminar competencia?"
        description={`¿Estás seguro de que deseas eliminar la competencia "${state.competencyToDelete?.shortname}"? Esta acción es irreversible.`}
        footer={
          <>
            <Button variant="outline" onClick={() => state.setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={state.handleDeleteCompetency} disabled={state.deleteLoading}>
              {state.deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </>
        }
      />

      {/* Modal: Exportación CSV */}
      <Dialog
        open={state.exportModalOpen}
        onClose={() => state.setExportModalOpen(false)}
        title="Exportar Competencias"
        description="Descarga un archivo CSV con las competencias de nivel 1 de este marco."
        footer={
          <>
            <Button variant="outline" onClick={() => state.setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={state.handleExport}>
              Descargar CSV
            </Button>
          </>
        }
      >
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            Se exportarán las {state.totalCount} competencias del marco &quot;{state.framework?.shortname}&quot;.
          </p>
        </div>
      </Dialog>

      {/* Modal: Gestionar Cursos Vinculados */}
      <CompetencyCoursesModal
        open={state.coursesModalOpen}
        onClose={() => state.setCoursesModalOpen(false)}
        competency={state.selectedCompetencyForCourses}
        frameworkId={frameworkId}
        onNavigateToDetail={handleNavigateToDetail}
      />

      {/* Modal: Revisiones Pendientes */}
      <CompetencyReviewsModal
        open={state.reviewsModalOpen}
        onClose={() => {
          state.setReviewsModalOpen(false);
          state.setSelectedCompetencyForReviews(null);
        }}
        frameworkId={Number(frameworkId)}
        competencyId={state.selectedCompetencyForReviews ? state.selectedCompetencyForReviews.id : 0}
        title={
          state.selectedCompetencyForReviews
            ? `Revisiones: ${state.selectedCompetencyForReviews.shortname}`
            : `Revisiones: ${state.framework?.shortname || 'Marco'}`
        }
      />
    </div>
  );
};
