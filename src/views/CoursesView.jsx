import React from 'react';
import { useLocation } from 'wouter';
import { useCoursesState } from './courses/useCoursesState';
import { CoursesHeader } from './courses/CoursesHeader';
import { CoursesTable } from './courses/CoursesTable';
import { CourseCreateModal } from './courses/CourseCreateModal';
import { CourseMoveModal } from './courses/CourseMoveModal';
import { CourseCsvModal } from './courses/CourseCsvModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';

export const CoursesView = ({ onNavigateToDetail }) => {
  const [, setLocation] = useLocation();
  const state = useCoursesState();

  return (
    <div className="space-y-6 animate-fadeIn">
      <CoursesHeader
        totalCount={state.totalCount}
        kpis={state.kpis}
        loading={state.loading}
        search={state.search}
        onSearchChange={(val) => { state.setSearch(val); state.setPage(0); }}
        categoryFilter={state.categoryFilter}
        onCategoryChange={(val) => { state.setCategoryFilter(val); state.setPage(0); }}
        visibilityFilter={state.visibilityFilter}
        onVisibilityChange={(val) => { state.setVisibilityFilter(val); state.setPage(0); }}
        emptyOnly={state.emptyOnly}
        onEmptyOnlyChange={(val) => { state.setEmptyOnly(val === '1'); state.setPage(0); }}
        categoriesList={state.categoriesList}
        hasCreateCourse={state.hasCreateCourse}
        onRefresh={() => state.refetch()}
        onExport={() => state.setExportModalOpen(true)}
        onCreate={() => state.setCreateModalOpen(true)}
        onImportCsv={() => state.setCsvModalOpen(true)}
      />

      <CoursesTable
        courses={state.courses}
        loading={state.loading}
        totalCount={state.totalCount}
        page={state.page}
        perPage={state.perPage}
        sort={state.sort}
        dir={state.dir}
        selectedIds={state.selectedIds}
        setSelectedIds={state.setSelectedIds}
        hasUpdateCourse={state.hasUpdateCourse}
        hasManageCategory={state.hasManageCategory}
        hasDeleteCourse={state.hasDeleteCourse}
        onPageChange={state.setPage}
        onSortChange={(s, d) => { state.setSort(s); state.setDir(d); state.setPage(0); }}
        onFilterChange={(f) => { state.setFilters(f); state.setPage(0); }}
        onRowClick={(row) => (onNavigateToDetail ? onNavigateToDetail('course', row.id) : setLocation(`/courses/${row.id}`))}
        onViewInMoodle={state.handleViewInMoodle}
        onBulkHide={state.handleBulkHide}
        onBulkShow={state.handleBulkShow}
        onOpenMoveModal={state.handleOpenMoveModal}
        onOpenDeleteModal={state.handleOpenDeleteModal}
      />

      <CourseCreateModal
        open={state.createModalOpen}
        onClose={() => state.setCreateModalOpen(false)}
        onSuccess={() => state.setCreateModalOpen(false)}
        categoriesList={state.categoriesList}
      />

      <CourseMoveModal
        open={state.moveModalOpen}
        onClose={() => state.setMoveModalOpen(false)}
        onSuccess={() => { state.setMoveModalOpen(false); state.clearSelection(); }}
        categoriesList={state.categoriesList}
        coursesToMove={state.coursesToMove}
      />

      <CourseCsvModal
        open={state.csvModalOpen}
        onClose={() => state.setCsvModalOpen(false)}
        onSuccess={() => state.setCsvModalOpen(false)}
      />

      <ConfirmDialog
        open={state.deleteConfirmOpen}
        onClose={() => state.setDeleteConfirmOpen(false)}
        onConfirm={state.handleExecuteDelete}
        title="¿Eliminar cursos seleccionados?"
        description="Esta acción eliminará completamente los cursos de Moodle. Esta acción no se puede deshacer."
        loading={state.deleteLoading}
        confirmText={`Sí, eliminar ${state.coursesToDelete.length} curso(s)`}
      />

      <Dialog
        open={state.exportModalOpen}
        onClose={() => state.setExportModalOpen(false)}
        title="Opciones de Exportación"
        description="Selecciona el formato de exportación."
        footer={
          <>
            <Button variant="outline" onClick={() => state.setExportModalOpen(false)}>Cancelar</Button>
            <Button onClick={state.handleExport} disabled={state.exportLoading}>
              {state.exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Tipo de Exportación</label>
            <Select value={state.exportOption} onChange={(e) => state.setExportOption(e.target.value)}>
              <option value="visible">Exportar Resumen (solo información visible)</option>
              <option value="with_users">Exportar con Detalles (cursos con detalle de usuarios)</option>
            </Select>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
