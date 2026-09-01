import React, { useState } from 'react';
import {
  useCompetencyFrameworkDetail,
  useCompetencyAction,
  useCompetencyFrameworkAction
} from '../hooks/useAdminerQueries';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { CompetencyCoursesModal } from './competencies/CompetencyCoursesModal';
import { CompetencyReviewsModal } from './competencies/CompetencyReviewsModal';
import {
  Award,
  Layers,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Sliders,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Calendar,
  BookOpen,
  Clock
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { PermissionGate } from '../components/PermissionGate';
import { formatDate } from '../lib/utils';

export const CompetencyFrameworkDetailView = ({ frameworkId, onBack, onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();

  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const [sort, setSort] = useState('sortorder');
  const [dir, setDir] = useState('ASC');

  const { data: framework, isLoading, isFetching, refetch } = useCompetencyFrameworkDetail(frameworkId, search);

  const { mutateAsync: performCompetencyAction } = useCompetencyAction();
  const { mutateAsync: performFrameworkAction } = useCompetencyFrameworkAction();

  const competencies = framework?.competencies || [];
  const totalCount = competencies.length;
  const loading = isLoading || isFetching;

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [formData, setFormData] = useState({ shortname: '', idnumber: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [competencyToDelete, setCompetencyToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [coursesModalOpen, setCoursesModalOpen] = useState(false);
  const [selectedCompetencyForCourses, setSelectedCompetencyForCourses] = useState(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [selectedCompetencyForReviews, setSelectedCompetencyForReviews] = useState(null);

  const handleOpenReviewsForCompetency = (comp) => {
    setSelectedCompetencyForReviews(comp);
    setReviewsModalOpen(true);
  };

  const handleOpenFrameworkReviews = () => {
    setSelectedCompetencyForReviews(null);
    setReviewsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingCompetency(null);
    setFormData({ shortname: '', idnumber: '', description: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (comp) => {
    setEditingCompetency(comp);
    setFormData({
      shortname: comp.shortname,
      idnumber: comp.idnumber,
      description: comp.description,
    });
    setModalOpen(true);
  };

  const handleOpenCoursesModal = (comp) => {
    setSelectedCompetencyForCourses(comp);
    setCoursesModalOpen(true);
  };

  const handleSaveCompetency = async (e) => {
    e.preventDefault();
    if (!formData.shortname.trim()) {
      addToast({ type: 'error', title: 'Error', description: 'El nombre de la competencia es obligatorio.' });
      return;
    }
    setFormLoading(true);
    try {
      if (editingCompetency) {
        await performCompetencyAction({
          action: 'edit',
          competencyid: editingCompetency.id,
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
        });
        addToast({ type: 'success', title: 'Competencia actualizada' });
      } else {
        await performCompetencyAction({
          action: 'create',
          frameworkid: Number(frameworkId),
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
        });
        addToast({ type: 'success', title: 'Competencia creada' });
      }
      setModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al guardar', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDelete = (comp) => {
    setCompetencyToDelete(comp);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteCompetency = async () => {
    if (!competencyToDelete) return;
    setDeleteLoading(true);
    try {
      await performCompetencyAction({
        action: 'delete',
        competencyid: competencyToDelete.id,
      });
      addToast({ type: 'success', title: 'Competencia eliminada' });
      setDeleteConfirmOpen(false);
      setCompetencyToDelete(null);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!framework) return;
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

  const handleExport = () => {
    const cols = [
      { label: 'ID', accessor: 'id' },
      { label: 'Competencia (Nivel 1)', accessor: 'shortname' },
      { label: 'Código / ID Number', accessor: 'idnumber' },
      { label: 'Cursos Vinculados', accessor: 'coursescount' },
      { label: 'Ruta Jerárquica', accessor: 'path' },
      { label: 'Descripción', accessor: 'description' },
      { label: 'Fecha de Creación', accessor: (r) => (r.timecreated ? formatDate(r.timecreated) : '') },
    ];
    exportToCsv(`competencias_${framework?.idnumber || frameworkId}`, competencies, cols);
    setExportModalOpen(false);
  };

  const handleOpenCompetencyDetail = (comp) => {
    if (onNavigateToDetail) {
      onNavigateToDetail('competency', { frameworkId: Number(frameworkId), competencyId: comp.id });
    }
  };

  const columns = [
    {
      header: 'Competencia (Nivel 1)',
      sortKey: 'shortname',
      cell: (row) => (
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => handleOpenCompetencyDetail(row)}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 font-bold group-hover:bg-blue-500 group-hover:text-white transition-colors dark:bg-blue-500/20 dark:text-blue-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{row.shortname}</div>
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
      header: 'Nivel Jerárquico',
      cell: () => (
        <Badge variant="outline" className="text-xs font-mono">
          Nivel 1 (Principal)
        </Badge>
      ),
    },
    {
      header: 'Cursos & Actividades',
      sortKey: 'coursescount',
      cell: (row) => (
        <button
          type="button"
          onClick={() => handleOpenCompetencyDetail(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Ver cursos, reglas de finalización y actividades clave asociadas"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>{row.coursescount || 0} curso(s)</span>
        </button>
      ),
    },
    {
      header: 'Descripción',
      cell: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-md">
          {row.description || 'Sin descripción'}
        </span>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenCompetencyDetail(row)}
            title="Gestionar cursos, reglas y actividades clave"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenReviewsForCompetency(row)}
            title={row.pendingreviewscount > 0 ? `Ver ${row.pendingreviewscount} revisión(es) pendiente(s)` : 'Ver revisiones pendientes'}
            className={`h-8 w-8 relative ${row.pendingreviewscount > 0 ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Clock className="h-4 w-4" />
            {row.pendingreviewscount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow-sm">
                {row.pendingreviewscount}
              </span>
            )}
          </Button>
          <PermissionGate capability="can_manage_competencies">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(row)}
              title="Editar competencia"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenDelete(row)}
              title="Eliminar competencia"
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
      {/* Top Back Nav & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="group mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Volver a Marcos de Competencias</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-white shadow-md shadow-amber-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {framework?.shortname || 'Marco de Competencias'}
                </h1>
                {framework && (
                  <Badge variant={framework.visible === 1 ? 'success' : 'warning'}>
                    {framework.visible === 1 ? 'Visible' : 'Oculto'}
                  </Badge>
                )}
              </div>
              {framework?.idnumber && (
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  Código: {framework.idnumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Acciones Header */}
        {framework && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap mt-4 sm:mt-0">
            <PermissionGate capability="can_manage_competencies">
              <Button
                variant="outline"
                onClick={handleToggleVisibility}
                title={framework.visible === 1 ? 'Ocultar marco' : 'Hacer visible'}
              >
                {framework.visible === 1 ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2 text-amber-600" /> Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2 text-emerald-600" /> Hacer Visible
                  </>
                )}
              </Button>
            </PermissionGate>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      {framework && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Competencias (Nivel 1)</p>
              <h4 className="text-xl font-bold text-foreground">{framework.competenciescount}</h4>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Sliders className="h-5 w-5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-muted-foreground">Escala de Evaluación</p>
              <h4 className="text-sm font-bold text-foreground truncate">{framework.scalename || 'Estándar'}</h4>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Última Modificación</p>
              <h4 className="text-xs font-semibold text-foreground">
                {framework.timemodified ? formatDate(framework.timemodified) : 'N/A'}
              </h4>
            </div>
          </div>

          <div
            onClick={handleOpenFrameworkReviews}
            className={`bg-card/60 backdrop-blur-md rounded-2xl border p-4 shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer hover:border-amber-500/50 ${(framework.pendingreviewscount || 0) > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-xl shrink-0 ${(framework.pendingreviewscount || 0) > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Revisiones Pendientes</p>
                <h4 className="text-xl font-bold text-foreground">{framework.pendingreviewscount || 0}</h4>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFrameworkReviews();
              }}
              className="text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
            >
              {(framework.pendingreviewscount || 0) > 0 ? 'Revisar' : 'Ver'}
            </Button>
          </div>
        </div>
      )}

      {/* FilterBar */}
      <FilterBar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(0);
        }}
        searchPlaceholder="Buscar competencia por nombre o código..."
        onRefresh={() => refetch()}
        loading={loading}
        onExportCsv={() => setExportModalOpen(true)}
        primaryAction={
          hasManageCompetencies
            ? {
                label: 'Nueva Competencia',
                onClick: handleOpenCreate,
                icon: <Plus className="h-4 w-4" />,
              }
            : null
        }
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={competencies}
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
        selectable={false}
      />

      {/* Modal: Crear / Editar Competencia */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCompetency ? 'Editar Competencia' : 'Nueva Competencia (Nivel 1)'}
        description="Define la competencia institucional dentro de este marco."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCompetency} disabled={formLoading}>
              {formLoading
                ? 'Guardando...'
                : editingCompetency
                ? 'Guardar Cambios'
                : 'Crear Competencia'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCompetency} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre de la Competencia *</label>
            <Input
              value={formData.shortname}
              onChange={(e) => setFormData({ ...formData, shortname: e.target.value })}
              placeholder="Ej. Análisis de Datos y Visualización"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Número ID / Código</label>
            <Input
              value={formData.idnumber}
              onChange={(e) => setFormData({ ...formData, idnumber: e.target.value })}
              placeholder="Ej. COMP-DATA-01"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Descripción</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Criterios y alcance de la competencia..."
            />
          </div>
        </form>
      </Dialog>

      {/* Modal: Confirmar Borrado */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="¿Eliminar competencia?"
        description={`¿Estás seguro de que deseas eliminar la competencia "${competencyToDelete?.shortname}"? Esta acción es irreversible.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCompetency} disabled={deleteLoading}>
              {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </>
        }
      />

      {/* Modal: Exportación CSV */}
      <Dialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Exportar Competencias"
        description="Descarga un archivo CSV con las competencias de nivel 1 de este marco."
        footer={
          <>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport}>
              Descargar CSV
            </Button>
          </>
        }
      >
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            Se exportarán las {totalCount} competencias del marco "{framework?.shortname}".
          </p>
        </div>
      </Dialog>

      {/* Modal: Gestionar Cursos Vinculados */}
      <CompetencyCoursesModal
        open={coursesModalOpen}
        onClose={() => setCoursesModalOpen(false)}
        competency={selectedCompetencyForCourses}
        onNavigateToDetail={onNavigateToDetail}
      />

      {/* Modal: Revisiones Pendientes */}
      <CompetencyReviewsModal
        open={reviewsModalOpen}
        onClose={() => {
          setReviewsModalOpen(false);
          setSelectedCompetencyForReviews(null);
        }}
        frameworkId={Number(frameworkId)}
        competencyId={selectedCompetencyForReviews ? selectedCompetencyForReviews.id : 0}
        title={
          selectedCompetencyForReviews
            ? `Revisiones: ${selectedCompetencyForReviews.shortname}`
            : `Revisiones: ${framework?.shortname || 'Marco'}`
        }
      />
    </div>
  );
};
