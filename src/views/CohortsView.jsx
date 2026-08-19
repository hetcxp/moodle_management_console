import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { Layers, Users, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { PermissionGate } from '../components/PermissionGate';

export const CohortsView = ({ onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  
  const hasManageCohorts = permissions?.is_siteadmin === 1 || permissions?.can_manage_cohorts === 1;

  const [cohorts, setCohorts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [formData, setFormData] = useState({ name: '', idnumber: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cohortToDelete, setCohortToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadCohorts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCohorts({ page, perpage: perPage, search, filters });
      setCohorts(res.cohorts || []);
      setTotalCount(res.totalcount || 0);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al cargar cohortes',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, filters, addToast]);

  useEffect(() => {
    loadCohorts();
  }, [loadCohorts]);

  const handleOpenCreate = () => {
    setEditingCohort(null);
    setFormData({ name: '', idnumber: '', description: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (cohort) => {
    setEditingCohort(cohort);
    setFormData({
      name: cohort.name,
      idnumber: cohort.idnumber,
      description: cohort.description
    });
    setModalOpen(true);
  };

  const handleSaveCohort = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingCohort) {
        await AdminerApi.cohortAction({
          action: 'edit',
          cohortid: editingCohort.id,
          name: formData.name,
          idnumber: formData.idnumber,
          description: formData.description
        });
        addToast({ type: 'success', title: 'Cohorte actualizada' });
      } else {
        await AdminerApi.cohortAction({
          action: 'create',
          name: formData.name,
          idnumber: formData.idnumber,
          description: formData.description
        });
        addToast({ type: 'success', title: 'Cohorte creada' });
      }
      setModalOpen(false);
      loadCohorts();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!cohortToDelete) return;
    setDeleteLoading(true);
    try {
      await AdminerApi.cohortAction({ action: 'delete', cohortid: cohortToDelete.id });
      addToast({ type: 'success', title: 'Cohorte eliminada' });
      setDeleteConfirmOpen(false);
      loadCohorts();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = () => {
    const cols = [
      { label: 'ID', accessor: 'id' },
      { label: 'Nombre de Cohorte', accessor: 'name' },
      { label: 'Número ID / Código', accessor: 'idnumber' },
      { label: 'Miembros Totales', accessor: 'memberscount' },
      { label: 'Descripción', accessor: 'description' }
    ];
    exportToCsv('cohortes_moodle', cohorts, cols);
  };

  const columns = [
    {
      header: 'Cohorte',
      sortKey: 'name',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.name}</div>
            {row.idnumber && (
              <div className="text-xs font-mono text-muted-foreground">
                Código: {row.idnumber}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Miembros Asignados',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.memberscount} miembros</span>
        </div>
      )
    },
    {
      header: 'Descripción',
      cell: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-md">
          {row.description || 'Sin descripción'}
        </span>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <PermissionGate capability="can_manage_cohorts">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(row)}
              title="Editar cohorte"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setCohortToDelete(row); setDeleteConfirmOpen(true); }}
              title="Eliminar cohorte"
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Cohortes de Moodle
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grupos globales de usuarios sincronizados en la plataforma.
        </p>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(0); }}
        searchPlaceholder="Buscar por nombre de cohorte o ID..."
        onRefresh={loadCohorts}
        loading={loading}
        onExportCsv={handleExport}
        primaryAction={hasManageCohorts ? {
          label: 'Nueva Cohorte',
          onClick: handleOpenCreate,
          icon: <Plus className="h-4 w-4" />
        } : null}
      />

      <DataTable
        columns={columns}
        data={cohorts}
        loading={loading}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setPage(0);
        }}
        onRowClick={(row) => onNavigateToDetail?.('cohort', row.id)}
        selectable={false}
      />

      {/* Modal: Crear / Editar */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCohort ? 'Editar Cohorte' : 'Nueva Cohorte'}
        description="Configura los detalles del grupo."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCohort} disabled={formLoading}>
              {formLoading ? 'Guardando...' : editingCohort ? 'Guardar Cambios' : 'Crear Cohorte'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCohort} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">ID Number / Código</label>
            <Input
              value={formData.idnumber}
              onChange={(e) => setFormData({ ...formData, idnumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Descripción</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Dialog>

      {/* Modal: Confirmar Borrado */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="¿Eliminar cohorte?"
        description={`¿Estás seguro de que deseas eliminar la cohorte "${cohortToDelete?.name}"?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </>
        }
      />
    </div>
  );
};
