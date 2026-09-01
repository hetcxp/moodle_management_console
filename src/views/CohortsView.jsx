import React, { useState } from 'react';
import { useCohorts, useCohortsKpis, useCohortAction } from '../hooks/useAdminerQueries';
import { AdminerApi } from '../services/adminer-api';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { Layers, Users, Edit, Trash2, Plus, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { PermissionGate } from '../components/PermissionGate';
import { KpiGrid } from '../components/KpiGrid';

export const CohortsView = ({ onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  
  const hasManageCohorts = permissions?.is_siteadmin === 1 || permissions?.can_manage_cohorts === 1;

  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const [sort, setSort] = useState('name');
  const [dir, setDir] = useState('ASC');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('-1');
  const [filters, setFilters] = useState({});

  const activeFilters = { ...filters };
  if (statusFilter !== '-1') {
    activeFilters.empty_only = statusFilter === '1' ? true : false;
  }

  const { data: cohortsData, isLoading, isFetching, refetch } = useCohorts({
    page, perpage: perPage, sort, dir, search, filters: activeFilters
  });

  const { data: kpis } = useCohortsKpis();

  const cohorts = cohortsData?.cohorts || [];
  const totalCount = cohortsData?.totalcount || 0;
  const loading = isLoading || isFetching;

  const { mutateAsync: performCohortAction } = useCohortAction();
  
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [formData, setFormData] = useState({ name: '', idnumber: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cohortsToDelete, setCohortsToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [exportLoading, setExportLoading] = useState(false);

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
        await performCohortAction({
          action: 'edit',
          cohortid: editingCohort.id,
          name: formData.name,
          idnumber: formData.idnumber,
          description: formData.description
        });
        addToast({ type: 'success', title: 'Cohorte actualizada' });
      } else {
        await performCohortAction({
          action: 'create',
          name: formData.name,
          idnumber: formData.idnumber,
          description: formData.description
        });
        addToast({ type: 'success', title: 'Cohorte creada' });
      }
      setModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDelete = (ids) => {
    setCohortsToDelete(ids);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (cohortsToDelete.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of cohortsToDelete) {
        await performCohortAction({ action: 'delete', cohortid: id });
      }
      addToast({ type: 'success', title: 'Cohorte(s) eliminada(s)' });
      setDeleteConfirmOpen(false);
      setSelectedIds([]);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async () => {
    let exportData = cohorts;
    setExportLoading(true);

    try {
      if (totalCount > cohorts.length) {
        const res = await AdminerApi.getCohorts({
          page: 0,
          perpage: 99999,
          sort,
          dir,
          search
        });
        if (res?.cohorts) {
          exportData = res.cohorts;
        }
      }

      if (exportOption === 'visible') {
        const cols = [
          { label: 'ID', accessor: 'id' },
          { label: 'Nombre de Cohorte', accessor: 'name' },
          { label: 'Número ID / Código', accessor: 'idnumber' },
          { label: 'Miembros Totales', accessor: 'memberscount' },
          { label: 'Cursos Sincronizados', accessor: 'coursescount' },
          { label: 'Descripción', accessor: 'description' }
        ];
        exportToCsv('cohortes_moodle', exportData, cols);
      } else {
        // Detailed export with members
        let detailedData = [];
        
        for (const cohort of exportData) {
          const detailRes = await AdminerApi.getCohortDetail(cohort.id);
          const members = detailRes?.members || [];
          
          if (members.length === 0) {
            detailedData.push({
              cohort_id: cohort.id,
              cohort_name: cohort.name,
              cohort_idnumber: cohort.idnumber,
              user_id: '',
              user_fullname: '',
              user_email: '',
              user_status: '',
              message: 'Sin miembros'
            });
          } else {
            for (const member of members) {
              detailedData.push({
                cohort_id: cohort.id,
                cohort_name: cohort.name,
                cohort_idnumber: cohort.idnumber,
                user_id: member.id,
                user_fullname: member.fullname,
                user_email: member.email,
                user_status: member.suspended === 0 ? 'Activo' : 'Suspendido',
                message: ''
              });
            }
          }
        }

        const detailCols = [
          { label: 'ID Cohorte', accessor: 'cohort_id' },
          { label: 'Nombre Cohorte', accessor: 'cohort_name' },
          { label: 'Código Cohorte', accessor: 'cohort_idnumber' },
          { label: 'ID Usuario', accessor: 'user_id' },
          { label: 'Nombre Completo', accessor: 'user_fullname' },
          { label: 'Email', accessor: 'user_email' },
          { label: 'Estado', accessor: 'user_status' },
          { label: 'Notas', accessor: 'message' }
        ];
        
        exportToCsv('cohortes_usuarios_moodle', detailedData, detailCols);
      }

      setExportModalOpen(false);
    } catch (err) {
      console.error("Export error", err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
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
      sortKey: 'memberscount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {row.memberscount > 0 ? (
            <>
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <span>{row.memberscount} miembros</span>
            </>
          ) : (
            <Badge variant="warning" className="text-[10px]">Vacía</Badge>
          )}
        </div>
      )
    },
    {
      header: 'Cursos Sincronizados',
      sortKey: 'coursescount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-blue-500" />
          <span>{row.coursescount}</span>
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
      header: 'Progreso Promedio',
      sortKey: 'progress',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px] max-w-[120px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress || 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-8 text-right">{row.progress || 0}%</span>
        </div>
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
              onClick={() => handleOpenDelete([row.id])}
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
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Cohortes de Moodle</h1>
            <Badge variant="secondary">{totalCount} cohortes</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Grupos globales de usuarios sincronizados en la plataforma.
          </p>
        </div>
      </div>

      {/* KPIs section */}
      {kpis && (
        <KpiGrid
          loading={loading}
          items={[
            {
              title: 'Total Cohortes',
              value: kpis.total_cohorts,
              icon: Layers,
              color: 'from-primary to-indigo-600',
              badgeColor: 'bg-primary/10 text-primary',
            },
            {
              title: 'Total Miembros',
              value: kpis.total_members,
              icon: Users,
              color: 'from-emerald-500 to-teal-600',
              badgeColor: 'bg-emerald-500/10 text-emerald-500',
            },
            {
              title: 'Cohortes Vacías',
              value: kpis.empty_cohorts,
              icon: AlertCircle,
              color: 'from-amber-500 to-orange-600',
              badgeColor: 'bg-amber-500/10 text-amber-500',
            },
            {
              title: 'Cursos Vinculados',
              value: kpis.synced_courses,
              icon: BookOpen,
              color: 'from-blue-500 to-sky-600',
              badgeColor: 'bg-blue-500/10 text-blue-500',
            },
          ]}
        />
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(0); }}
        searchPlaceholder="Buscar por nombre de cohorte o ID..."
        onRefresh={() => refetch()}
        loading={loading || exportLoading}
        onExportCsv={() => setExportModalOpen(true)}
        primaryAction={hasManageCohorts ? {
          label: 'Nueva Cohorte',
          onClick: handleOpenCreate,
          icon: <Plus className="h-4 w-4" />
        } : null}
        filters={[
          {
            id: 'empty_only',
            value: statusFilter,
            onChange: (val) => { setStatusFilter(val); setPage(0); },
            options: [
              { label: 'Todas las cohortes', value: '-1' },
              { label: 'Solo vacías', value: '1' },
              { label: 'Con miembros', value: '0' }
            ]
          }
        ]}
      />

      <DataTable
        columns={columns}
        data={cohorts}
        loading={loading}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        sort={sort}
        dir={dir}
        onSortChange={(newSort, newDir) => {
          setSort(newSort);
          setDir(newDir);
          setPage(0);
        }}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setPage(0);
        }}
        onRowClick={(row) => onNavigateToDetail?.('cohort', row.id)}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={[
          ...(hasManageCohorts ? [{
            label: 'Eliminar Seleccionadas',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            onClick: handleOpenDelete,
            variant: 'destructive'
          }] : [])
        ]}
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
        title="¿Eliminar cohorte(s)?"
        description={`¿Estás seguro de que deseas eliminar ${cohortsToDelete.length} cohorte(s)? Esta acción es irreversible.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </>
        }
      />

      {/* Modal: Opciones de Exportación */}
      <Dialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Opciones de Exportación"
        description="Selecciona el formato de exportación."
        footer={
          <>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exportLoading}>
              {exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Tipo de Exportación</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={exportOption}
              onChange={(e) => setExportOption(e.target.value)}
            >
              <option value="visible">Exportar Resumen (solo información de las cohortes)</option>
              <option value="with_members">Exportar con Detalles (cohortes con usuarios y detalles)</option>
            </select>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
