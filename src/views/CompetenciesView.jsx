import React, { useState, useEffect } from 'react';
import {
  useCompetencyFrameworks,
  useCompetencyKpis,
  useCompetencyFrameworkAction,
  useScales
} from '../hooks/useAdminerQueries';
import { AdminerApi } from '../services/adminer-api';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { CompetencyReviewsModal } from './competencies/CompetencyReviewsModal';
import { Award, Layers, Edit, Trash2, Plus, Eye, EyeOff, CheckCircle2, Sliders, Shield, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { PermissionGate } from '../components/PermissionGate';

export const CompetenciesView = ({ onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();

  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const [sort, setSort] = useState('shortname');
  const [dir, setDir] = useState('ASC');
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [filters, setFilters] = useState({});

  const activeFilters = { ...filters };
  if (visibilityFilter !== '-1') {
    activeFilters.visible = visibilityFilter;
  }

  const { data: frameworksData, isLoading, isFetching, refetch } = useCompetencyFrameworks({
    page,
    perpage: perPage,
    sort,
    dir,
    search,
    filters: activeFilters,
  });

  const { data: kpis } = useCompetencyKpis();
  const { data: scalesData } = useScales();
  const scales = scalesData?.scales || [];

  const frameworks = frameworksData?.frameworks || [];
  const totalCount = frameworksData?.totalcount || 0;
  const loading = isLoading || isFetching;

  const { mutateAsync: performFrameworkAction } = useCompetencyFrameworkAction();

  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFramework, setEditingFramework] = useState(null);
  const [formData, setFormData] = useState({
    shortname: '',
    idnumber: '',
    description: '',
    scaleid: 0,
    visible: 1,
  });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [frameworksToDelete, setFrameworksToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  // Preconfigurar escala por defecto cuando cargan las escalas
  useEffect(() => {
    if (!editingFramework && scales.length > 0 && formData.scaleid === 0) {
      const defaultScale = scales.find((s) => s.isdefault === 1) || scales[0];
      if (defaultScale) {
        setFormData((prev) => ({ ...prev, scaleid: defaultScale.id }));
      }
    }
  }, [scales, editingFramework]);

  const handleOpenCreate = () => {
    setEditingFramework(null);
    const defaultScale = scales.find((s) => s.isdefault === 1) || scales[0];
    setFormData({
      shortname: '',
      idnumber: '',
      description: '',
      scaleid: defaultScale ? defaultScale.id : 0,
      visible: 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (framework) => {
    setEditingFramework(framework);
    setFormData({
      shortname: framework.shortname,
      idnumber: framework.idnumber,
      description: framework.description,
      scaleid: framework.scaleid || (scales[0]?.id || 0),
      visible: framework.visible !== undefined ? framework.visible : 1,
    });
    setModalOpen(true);
  };

  const handleSaveFramework = async (e) => {
    e.preventDefault();
    if (!formData.shortname.trim()) {
      addToast({ type: 'error', title: 'Error', description: 'El nombre del marco es obligatorio.' });
      return;
    }
    setFormLoading(true);
    try {
      if (editingFramework) {
        await performFrameworkAction({
          action: 'edit',
          frameworkid: editingFramework.id,
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
          scaleid: Number(formData.scaleid),
          visible: formData.visible ? 1 : 0,
        });
        addToast({ type: 'success', title: 'Marco de competencias actualizado' });
      } else {
        await performFrameworkAction({
          action: 'create',
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
          scaleid: Number(formData.scaleid),
          visible: formData.visible ? 1 : 0,
        });
        addToast({ type: 'success', title: 'Marco de competencias creado' });
      }
      setModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al guardar', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleVisibility = async (framework) => {
    try {
      await performFrameworkAction({
        action: 'toggle_visibility',
        frameworkid: framework.id,
      });
      addToast({
        type: 'success',
        title: 'Visibilidad actualizada',
        description: `El marco ahora está ${framework.visible ? 'oculto' : 'visible'}.`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleOpenDelete = (ids) => {
    setFrameworksToDelete(ids);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (frameworksToDelete.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of frameworksToDelete) {
        await performFrameworkAction({ action: 'delete', frameworkid: id });
      }
      addToast({ type: 'success', title: 'Marco(s) eliminado(s)' });
      setDeleteConfirmOpen(false);
      setSelectedIds([]);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      let exportData = frameworks;
      if (totalCount > frameworks.length) {
        const res = await AdminerApi.getCompetencyFrameworks({
          page: 0,
          perpage: 99999,
          sort,
          dir,
          search,
          filters: activeFilters,
        });
        if (res?.frameworks) {
          exportData = res.frameworks;
        }
      }

      const cols = [
        { label: 'ID', accessor: 'id' },
        { label: 'Nombre del Marco', accessor: 'shortname' },
        { label: 'Código / ID Number', accessor: 'idnumber' },
        { label: 'Escala de Evaluación', accessor: 'scalename' },
        { label: 'Competencias Nivel 1', accessor: 'competenciescount' },
        { label: 'Estado', accessor: (r) => (r.visible ? 'Visible' : 'Oculto') },
        { label: 'Descripción', accessor: 'description' },
      ];

      exportToCsv('marcos_competencias_moodle', exportData, cols);
      setExportModalOpen(false);
    } catch (err) {
      console.error('Export error', err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    {
      header: 'Marco de Competencias',
      sortKey: 'shortname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold dark:bg-amber-500/20 dark:text-amber-400">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.shortname}</div>
            {row.idnumber ? (
              <div className="text-xs font-mono text-muted-foreground">Código: {row.idnumber}</div>
            ) : (
              <div className="text-xs text-muted-foreground italic">Sin código ID</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Escala Asignada',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-foreground">
          <Sliders className="h-3.5 w-3.5 text-primary/70" />
          <span className="font-medium">{row.scalename || 'Estándar'}</span>
        </div>
      ),
    },
    {
      header: 'Competencias (Nivel 1)',
      sortKey: 'competenciescount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Layers className="h-3.5 w-3.5 text-blue-500" />
          <span>{row.competenciescount} competencias</span>
        </div>
      ),
    },
    {
      header: 'Estado',
      sortKey: 'visible',
      cell: (row) => (
        <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
          {row.visible === 1 ? 'Visible' : 'Oculto'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <PermissionGate capability="can_manage_competencies">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleToggleVisibility(row)}
              title={row.visible === 1 ? 'Ocultar marco' : 'Hacer visible'}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {row.visible === 1 ? (
                <EyeOff className="h-4 w-4 text-amber-600" />
              ) : (
                <Eye className="h-4 w-4 text-emerald-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(row)}
              title="Editar marco"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenDelete([row.id])}
              title="Eliminar marco"
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Marcos de Competencias
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estructura y gestión de competencias institucionales de Moodle.
        </p>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
                <Award className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Marcos de Competencias</p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="text-2xl font-bold text-foreground">{kpis.total_frameworks}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium" title="Marcos visibles">
                      <Eye className="h-3.5 w-3.5" /> {kpis.visible_frameworks} visibles
                    </span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground font-medium" title="Marcos ocultos">
                      <EyeOff className="h-3.5 w-3.5" /> {kpis.hidden_frameworks} ocultos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Competencias</p>
                <h3 className="text-2xl font-bold text-foreground">{kpis.total_competencies}</h3>
              </div>
            </div>
          </div>
          <div
            onClick={() => setReviewsModalOpen(true)}
            className={`bg-card/60 backdrop-blur-md rounded-2xl border p-5 shadow-sm transition-all cursor-pointer hover:border-amber-500/50 ${(kpis.pending_reviews || 0) > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl shrink-0 ${(kpis.pending_reviews || 0) > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 text-rose-500'}`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground truncate">Revisiones Pendientes</p>
                  <h3 className="text-2xl font-bold text-foreground">{kpis.pending_reviews || 0}</h3>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setReviewsModalOpen(true);
                }}
                className="text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
              >
                {(kpis.pending_reviews || 0) > 0 ? 'Revisar' : 'Ver'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(0);
        }}
        searchPlaceholder="Buscar por nombre, código o descripción..."
        onRefresh={() => refetch()}
        loading={loading || exportLoading}
        onExportCsv={() => setExportModalOpen(true)}
        primaryAction={
          hasManageCompetencies
            ? {
                label: 'Nuevo Marco',
                onClick: handleOpenCreate,
                icon: <Plus className="h-4 w-4" />,
              }
            : null
        }
        filters={[
          {
            id: 'visible',
            value: visibilityFilter,
            onChange: (val) => {
              setVisibilityFilter(val);
              setPage(0);
            },
            options: [
              { label: 'Todos los estados', value: '-1' },
              { label: 'Solo Visibles', value: '1' },
              { label: 'Solo Ocultos', value: '0' },
            ],
          },
        ]}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={frameworks}
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
        onRowClick={(row) => onNavigateToDetail?.('competency_framework', row.id)}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={[
          ...(hasManageCompetencies
            ? [
                {
                  label: 'Eliminar Seleccionados',
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  onClick: handleOpenDelete,
                  variant: 'destructive',
                },
              ]
            : []),
        ]}
      />

      {/* Modal: Crear / Editar Marco */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFramework ? 'Editar Marco de Competencias' : 'Nuevo Marco de Competencias'}
        description="Configura el marco y su escala de calificación predeterminada."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFramework} disabled={formLoading}>
              {formLoading
                ? 'Guardando...'
                : editingFramework
                ? 'Guardar Cambios'
                : 'Crear Marco'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveFramework} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre del Marco *</label>
            <Input
              value={formData.shortname}
              onChange={(e) => setFormData({ ...formData, shortname: e.target.value })}
              placeholder="Ej. Marco de Habilidades Digitales 2026"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Número ID / Código</label>
            <Input
              value={formData.idnumber}
              onChange={(e) => setFormData({ ...formData, idnumber: e.target.value })}
              placeholder="Ej. DIGITAL-2026"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Escala de Evaluación</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={formData.scaleid}
              onChange={(e) => setFormData({ ...formData, scaleid: Number(e.target.value) })}
            >
              {scales.map((s) => (
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
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalle o propósito del marco de competencias..."
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="framework_visible_toggle"
              checked={Boolean(formData.visible)}
              onChange={(e) => setFormData({ ...formData, visible: e.target.checked ? 1 : 0 })}
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
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="¿Eliminar marco(s) de competencias?"
        description={`¿Estás seguro de que deseas eliminar ${frameworksToDelete.length} marco(s)? Todas las competencias vinculadas serán eliminadas. Esta acción es irreversible.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </>
        }
      />

      {/* Modal: Exportación CSV */}
      <Dialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Exportar Marcos de Competencias"
        description="Descarga un resumen en formato CSV con todos los marcos y su escala asociada."
        footer={
          <>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exportLoading}>
              {exportLoading ? 'Exportando...' : 'Descargar CSV'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            Se exportarán los {totalCount} registros coincidentes con los filtros actuales.
          </p>
        </div>
      </Dialog>

      {/* Modal: Revisiones Pendientes Globales */}
      <CompetencyReviewsModal
        open={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        title="Revisiones de Competencias Pendientes"
      />
    </div>
  );
};
