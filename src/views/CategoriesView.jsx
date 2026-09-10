import React from 'react';
import { useLocation } from 'wouter';
import { useCategoriesState } from './categories/useCategoriesState';
import { CategoriesHeader } from './categories/CategoriesHeader';
import { CategoriesTable } from './categories/CategoriesTable';
import { CategoryCreateModal } from './categories/CategoryCreateModal';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';

export const CategoriesView = ({ onNavigateToDetail }) => {
  const [, setLocation] = useLocation();
  const state = useCategoriesState();

  return (
    <div className="space-y-6 animate-fadeIn">
      <CategoriesHeader
        totalCategories={state.totalCategories}
        visibleCategories={state.visibleCategories}
        hiddenCategories={state.hiddenCategories}
        totalCourses={state.totalCourses}
        loading={state.loading}
        loadData={state.loadData}
        search={state.search}
        onSearchChange={state.setSearch}
        visibilityFilter={state.visibilityFilter}
        onVisibilityChange={state.setVisibilityFilter}
        hasManageCategory={state.hasManageCategory}
        onOpenCreate={state.handleOpenCreate}
        onOpenExport={() => state.setExportModalOpen(true)}
      />

      <CategoriesTable
        paginatedData={state.paginatedData}
        flatCategories={state.flatCategories}
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
        }}
        selectedIds={state.selectedIds}
        onSelectionChange={state.setSelectedIds}
        hasManageCategory={state.hasManageCategory}
        onRowClick={(row) =>
          onNavigateToDetail ? onNavigateToDetail('category', row.id) : setLocation(`/categories/${row.id}`)
        }
        onToggleVisibility={state.handleToggleVisibility}
        onOpenEdit={state.handleOpenEdit}
        onOpenDelete={(cat) => {
          state.setCategoryToDelete(cat);
          state.setDeleteConfirmOpen(true);
        }}
        onBulkAction={state.handleBulkAction}
      />

      <CategoryCreateModal
        open={state.modalOpen}
        onClose={() => state.setModalOpen(false)}
        editingCategory={state.editingCategory}
        flatCategories={state.flatCategories}
      />

      {/* Modal: Confirmar Borrado */}
      <Dialog
        open={state.deleteConfirmOpen}
        onClose={() => state.setDeleteConfirmOpen(false)}
        title="¿Eliminar categoría?"
        description={`¿Estás seguro de que deseas eliminar la categoría "${state.categoryToDelete?.name}"?`}
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
              <option value="visible">Exportar Resumen (solo categorías y progreso visible)</option>
              <option value="with_courses">Exportar con Detalles (categorías con cursos y progreso)</option>
            </Select>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
