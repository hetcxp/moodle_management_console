import React from 'react';
import { useLearningPathsState } from './learning_paths/useLearningPathsState';
import { DependencyGuardCard } from './learning_paths/DependencyGuardCard';
import { LearningPathsHeader } from './learning_paths/LearningPathsHeader';
import { LearningPathsTable } from './learning_paths/LearningPathsTable';
import { LearningPathCreateModal } from './learning_paths/LearningPathCreateModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function LearningPathsView({ onNavigateToDetail }) {
  const {
    paths,
    totalCount,
    loading,
    page,
    perPage,
    search,
    kpis,
    dependencies,
    hasCreatePerm,
    createModalOpen,
    deleteConfirmOpen,
    pathToDelete,
    deleteLoading,
    setPage,
    setSearch,
    setCreateModalOpen,
    setDeleteConfirmOpen,
    refetch,
    handleDeleteRequest,
    handleConfirmDelete,
    handleViewInMoodle,
  } = useLearningPathsState();

  if (dependencies?.missing?.length > 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <DependencyGuardCard missing={dependencies.missing} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <LearningPathsHeader
        totalCount={totalCount}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refetch}
        onCreate={() => setCreateModalOpen(true)}
        hasCreatePerm={hasCreatePerm}
        kpis={kpis}
      />

      <LearningPathsTable
        paths={paths}
        loading={loading}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onRowClick={(row) => {
          if (onNavigateToDetail) {
            onNavigateToDetail('learning-path', row.id);
          }
        }}
        onViewInMoodle={handleViewInMoodle}
        onDelete={handleDeleteRequest}
      />

      <LearningPathCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(newPath) => {
          refetch();
          if (newPath?.id && onNavigateToDetail) {
            onNavigateToDetail('learning-path', newPath.id);
          }
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Ruta de Aprendizaje"
        description={`¿Estás seguro de que deseas eliminar permanentemente la ruta "${pathToDelete?.fullname}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Ruta"
        loading={deleteLoading}
        variant="destructive"
      />
    </div>
  );
}
