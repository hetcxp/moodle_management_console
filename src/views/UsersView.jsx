import React from 'react';
import { useUsersState } from './users/useUsersState';
import { UsersHeader } from './users/UsersHeader';
import { UsersTable } from './users/UsersTable';
import { UserCreateModal } from './users/UserCreateModal';
import { UserCsvModal } from './users/UserCsvModal';
import { UserExportModal } from './users/UserExportModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const UsersView = ({ onNavigateToDetail }) => {
  const state = useUsersState();

  return (
    <div className="space-y-6 animate-fadeIn">
      <UsersHeader
        totalCount={state.totalCount}
        kpis={state.kpis}
        loading={state.loading}
        search={state.search}
        onSearchChange={(val) => { state.setSearch(val); state.setPage(0); }}
        statusFilter={state.statusFilter}
        onStatusChange={(val) => { state.setStatusFilter(val); state.setPage(0); }}
        hasUpdateUsers={state.hasUpdateUsers}
        onRefresh={() => state.refetch()}
        onExport={() => state.setExportModalOpen(true)}
        onAddUser={() => state.setAddUserOpen(true)}
        onUploadCsv={() => state.setUploadCsvOpen(true)}
      />

      <UsersTable
        users={state.users}
        loading={state.loading}
        totalCount={state.totalCount}
        page={state.page}
        perPage={state.perPage}
        sort={state.sort}
        dir={state.dir}
        selectedIds={state.selectedIds}
        setSelectedIds={state.setSelectedIds}
        hasUpdateUsers={state.hasUpdateUsers}
        hasDeleteUsers={state.hasDeleteUsers}
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
        onRowClick={(row) => onNavigateToDetail?.('user', row.id)}
        onBulkSuspend={state.handleBulkSuspend}
        onBulkActivate={state.handleBulkActivate}
        onOpenDelete={state.handleOpenDelete}
        onOpenTempPassConfirm={state.handleOpenTempPassConfirm}
      />

      <ConfirmDialog
        open={state.tempPassConfirmOpen}
        onClose={() => state.setTempPassConfirmOpen(false)}
        onConfirm={state.handleExecuteSendTempPassword}
        title="¿Enviar link de contraseña temporal?"
        description="Esta acción enviará un correo electrónico a los usuarios seleccionados con una contraseña temporal e instrucciones de ingreso. Al iniciar sesión, se les pedirá cambiar su contraseña."
        loading={state.tempPassLoading}
        confirmText={`Sí, enviar a ${state.usersForTempPass.length} usuario(s)`}
      />

      <ConfirmDialog
        open={state.deleteConfirmOpen}
        onClose={() => state.setDeleteConfirmOpen(false)}
        onConfirm={state.handleExecuteDelete}
        title="¿Eliminar usuarios seleccionados?"
        description="Esta acción eliminará las cuentas de usuario de Moodle. Los administradores del sitio no serán afectados."
        loading={state.deleteLoading}
        confirmText={`Sí, eliminar ${state.usersToDelete.length} usuario(s)`}
      />

      <UserCreateModal
        open={state.addUserOpen}
        onClose={() => state.setAddUserOpen(false)}
        onSuccess={() => state.refetch()}
      />

      <UserCsvModal
        open={state.uploadCsvOpen}
        onClose={() => state.setUploadCsvOpen(false)}
        onSuccess={() => state.refetch()}
      />

      <UserExportModal
        open={state.exportModalOpen}
        onClose={() => state.setExportModalOpen(false)}
        exportOption={state.exportOption}
        setExportOption={state.setExportOption}
        onExport={state.handleExport}
        loading={state.exportLoading}
      />
    </div>
  );
};
