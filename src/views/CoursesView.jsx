import React, { useState } from 'react';
import { useCourses, useCategoriesFlat, useCourseAction } from '../hooks/useAdminerQueries';
import { AdminerApi } from '../services/adminer-api';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { formatDate, formatDateOnly } from '../lib/utils';
import { PermissionGate } from '../components/PermissionGate';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api';
import { Eye, EyeOff, Trash2, FolderInput, Plus, ExternalLink, GraduationCap, Users, Layers, Upload, Activity, Calendar } from 'lucide-react';
import { KpiGrid } from '../components/KpiGrid';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CourseCreateModal } from './courses/CourseCreateModal';
import { CourseMoveModal } from './courses/CourseMoveModal';
import { CourseCsvModal } from './courses/CourseCsvModal';

export const CoursesView = ({ onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();

  const hasCreateCourse = permissions?.is_siteadmin === 1 || permissions?.can_create_courses === 1;
  const hasUpdateCourse = permissions?.is_siteadmin === 1 || permissions?.can_update_courses === 1;
  const hasManageCategory = permissions?.is_siteadmin === 1 || permissions?.can_manage_categories === 1;
  const hasDeleteCourse = permissions?.is_siteadmin === 1 || permissions?.can_delete_courses === 1;

  // Table state
  const [page, setPage] = useState(0);
  const [perPage] = useState(20);
  const [sort, setSort] = useState('timecreated');
  const [dir, setDir] = useState('DESC');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('0');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [filters, setFilters] = useState({});
  const [emptyOnly, setEmptyOnly] = useState(false);

  // Queries
  const { data: categoriesData } = useCategoriesFlat();
  const categoriesList = categoriesData?.categories || [];

  const { data: coursesData, isLoading, isFetching, refetch } = useCourses({
    page,
    perpage: perPage,
    sort,
    dir,
    search,
    category: parseInt(categoryFilter, 10) || 0,
    visibility: parseInt(visibilityFilter, 10) || -1,
    filters: { ...filters, empty_only: emptyOnly ? 1 : 0 }
  });

  const courses = coursesData?.courses || [];
  const totalCount = coursesData?.totalcount || 0;
  const kpis = coursesData?.kpis || null;
  const loading = isLoading || isFetching;

  // Mutations
  const { mutateAsync: performCourseAction } = useCourseAction();

  // CSV Upload state
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Empty block, useEffects and local fetches removed

  const handleViewInMoodle = async (courseId) => {
    try {
      const destination = `/course/view.php?id=${courseId}`;
      const res = await AdminerApi.getAutologinUrl(destination);
      if (res && res.url) {
        window.open(res.url, '_blank');
      } else {
        window.open(`${API_CONFIG.baseUrl}${destination}`, '_blank');
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: 'No se pudo generar la URL de acceso directo.' });
      window.open(`${API_CONFIG.baseUrl}/course/view.php?id=${courseId}`, '_blank');
    }
  };

  // Bulk actions handlers
  const handleBulkHide = async (ids = selectedIds) => {
    try {
      await performCourseAction({ action: 'hide', courseids: ids });
      addToast({
        type: 'success',
        title: 'Cursos ocultados',
        description: `Se han ocultado ${ids.length} curso(s).`
      });
      setSelectedIds([]);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkShow = async (ids = selectedIds) => {
    try {
      await performCourseAction({ action: 'show', courseids: ids });
      addToast({
        type: 'success',
        title: 'Cursos visibles',
        description: `Se han hecho visibles ${ids.length} curso(s).`
      });
      setSelectedIds([]);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [coursesToMove, setCoursesToMove] = useState([]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [coursesToDelete, setCoursesToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenMoveModal = (ids = selectedIds) => {
    setCoursesToMove(ids);
    setMoveModalOpen(true);
  };

  const handleOpenDeleteModal = (ids = selectedIds) => {
    setCoursesToDelete(ids);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDelete = async () => {
    setDeleteLoading(true);
    try {
      await performCourseAction({ action: 'delete', courseids: coursesToDelete });
      addToast({
        type: 'success',
        title: 'Cursos eliminados',
        description: `Se eliminaron ${coursesToDelete.length} curso(s).`
      });
      setDeleteConfirmOpen(false);
      setSelectedIds([]);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar cursos', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export CSV
  const handleExport = async () => {
    let exportData = [];
    try {
      setLoading(true);
      const limit = 500;
      const pages = Math.ceil(totalCount / limit) || 1;
      
      for (let i = 0; i < pages; i++) {
        const res = await AdminerApi.getCourses({
          page: i,
          perpage: limit,
          sort,
          dir,
          search,
          category: parseInt(categoryFilter, 10) || 0,
          visibility: parseInt(visibilityFilter, 10) || -1
        });
        if (res?.courses) {
          exportData = [...exportData, ...res.courses];
        }
      }
    } catch (err) {
      console.error("Export error", err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
      return;
    } finally {
      setLoading(false);
    }

    const columnsForExport = [
      { label: 'ID', accessor: 'id' },
      { label: 'Nombre Completo', accessor: 'fullname' },
      { label: 'Nombre Corto', accessor: 'shortname' },
      { label: 'Categoría', accessor: 'categoryname' },
      { label: 'Estado', accessor: (row) => (row.visible === 1 ? 'Visible' : 'Oculto') },
      { label: 'Inscritos', accessor: 'enrolledcount' },
      { label: 'Completados', accessor: 'completedcount' },
      { label: 'Cohortes', accessor: 'cohortscount' },
      { label: 'Progreso (%)', accessor: 'progress_percent' },
      { label: 'Creado', accessor: (row) => formatDateOnly(row.timecreated) },
      { label: 'Inicio', accessor: (row) => row.startdate > 0 ? formatDateOnly(row.startdate) : 'No definida' },
      { label: 'Fin', accessor: (row) => row.enddate > 0 ? formatDateOnly(row.enddate) : 'No definida' }
    ];
    exportToCsv('cursos_moodle', exportData, columnsForExport);
  };

  // Table Columns configuration
  const columns = [
    {
      header: 'Curso',
      sortKey: 'fullname',
      filterType: 'text',
      className: 'font-medium',
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground hover:text-primary transition-colors">
            {row.fullname}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-mono">{row.shortname}</span>
            <span>•</span>
            <span>ID: {row.id}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Categoría',
      sortKey: 'categoryname',
      filterType: 'text',
      cell: (row) => (
        <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
          {row.categoryname || 'Sin categoría'}
        </span>
      )
    },
    {
      header: 'Estado',
      sortKey: 'visible',
      filterType: 'select',
      filterOptions: [
        { label: 'Visible', value: '1' },
        { label: 'Oculto', value: '0' }
      ],
      cell: (row) => (
        <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
          {row.visible === 1 ? 'Visible' : 'Oculto'}
        </Badge>
      )
    },
    {
      header: 'Inscritos',
      sortKey: 'enrolledcount',
      cell: (row) => (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{row.enrolledcount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="h-3 w-3" />
            <span>{row.cohortscount || 0}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Progreso Promedio',
      sortKey: 'progress',
      className: 'min-w-[150px]',
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span>{row.progress_percent}%</span>
            <span className="text-muted-foreground">{row.completedcount}/{row.enrolledcount}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                row.progress_percent === 100
                  ? 'bg-emerald-500'
                  : row.progress_percent > 50
                  ? 'bg-primary'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(row.progress_percent, 100)}%` }}
            />
          </div>
        </div>
      )
    },

    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleViewInMoodle(row.id)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            title="Ver en Moodle"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          
          <PermissionGate capability="can_update_courses">
            {row.visible === 1 ? (
              <Button
                variant="ghost"
                size="icon"
                title="Ocultar curso"
                onClick={() => handleBulkHide([row.id])}
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                title="Hacer visible"
                onClick={() => handleBulkShow([row.id])}
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </PermissionGate>

          <PermissionGate capability="can_manage_categories">
            <Button
              variant="ghost"
              size="icon"
              title="Mover de categoría"
              onClick={() => handleOpenMoveModal([row.id])}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <FolderInput className="h-4 w-4" />
            </Button>
          </PermissionGate>

          <PermissionGate capability="can_delete_courses">
            <Button
              variant="ghost"
              size="icon"
              title="Eliminar curso"
              onClick={() => handleOpenDeleteModal([row.id])}
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Gestión de Cursos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra la visibilidad, organización y métricas de finalización de cursos.
        </p>
      </div>

      {/* KPIs section */}
      {kpis && (
        <KpiGrid 
          loading={loading}
          items={[
            { title: 'Total Cursos', value: kpis.total_courses, icon: Layers, badgeColor: 'bg-primary/10 text-primary' },
            { title: 'Alumnos Enrolados', value: kpis.total_enrolled, icon: Users, badgeColor: 'bg-emerald-500/10 text-emerald-500' },
            { title: 'Progreso Promedio', value: `${kpis.avg_progress}%`, icon: Activity, badgeColor: 'bg-blue-500/10 text-blue-500' },
            { title: 'Cursos Vacíos', value: kpis.empty_courses, icon: FolderInput, badgeColor: 'bg-amber-500/10 text-amber-500' }
          ]} 
        />
      )}

      {/* Filter and search bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(0); }}
        searchPlaceholder="Buscar por nombre o código de curso..."
        onRefresh={() => refetch()}
        loading={loading}
        onExportCsv={handleExport}
        primaryAction={hasCreateCourse ? {
          label: 'Crear Curso',
          onClick: () => setCreateModalOpen(true),
          icon: <Plus className="h-4 w-4" />
        } : null}
        secondaryAction={hasCreateCourse ? {
          label: 'Importar CSV',
          onClick: () => setCsvModalOpen(true),
          icon: <Upload className="h-4 w-4" />
        } : null}
        filters={[
          {
            id: 'category',
            value: categoryFilter,
            onChange: (val) => { setCategoryFilter(val); setPage(0); },
            options: [
              { label: 'Todas las Categorías', value: '0' },
              ...categoriesList.map((c) => ({ label: c.name, value: String(c.id) }))
            ]
          },
          {
            id: 'visibility',
            value: visibilityFilter,
            onChange: (val) => { setVisibilityFilter(val); setPage(0); },
            options: [
              { label: 'Cualquier Estado', value: '-1' },
              { label: 'Solo Visibles', value: '1' },
              { label: 'Solo Ocultos', value: '0' }
            ]
          },
          {
            id: 'empty_only',
            value: emptyOnly ? '1' : '0',
            onChange: (val) => { setEmptyOnly(val === '1'); setPage(0); },
            options: [
              { label: 'Todos los cursos', value: '0' },
              { label: 'Solo cursos vacíos', value: '1' }
            ]
          }
        ]}
      />

      {/* Main Data Table with Bulk Actions */}
      <DataTable
        columns={columns}
        data={courses}
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
        onRowClick={(row) => onNavigateToDetail?.('course', row.id)}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={[
          ...(hasUpdateCourse && selectedIds.length > 0 && selectedIds.every(id => courses.find(c => c.id === id)?.visible === 0) ? [
            {
              label: 'Hacer Visibles',
              icon: <Eye className="h-3.5 w-3.5" />,
              onClick: handleBulkShow,
              variant: 'success'
            }
          ] : []),
          ...(hasUpdateCourse && selectedIds.length > 0 && selectedIds.every(id => courses.find(c => c.id === id)?.visible === 1) ? [
            {
              label: 'Ocultar',
              icon: <EyeOff className="h-3.5 w-3.5" />,
              onClick: handleBulkHide,
              variant: 'warning'
            }
          ] : []),
          ...(hasManageCategory ? [{
            label: 'Mover Categoría',
            icon: <FolderInput className="h-3.5 w-3.5" />,
            onClick: handleOpenMoveModal,
            variant: 'secondary'
          }] : []),
          ...(hasDeleteCourse ? [{
            label: 'Eliminar Cursos',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            onClick: handleOpenDeleteModal,
            variant: 'destructive'
          }] : [])
        ]}
        virtualize={true}
      />

      <CourseCreateModal 
        open={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSuccess={() => {
          setCreateModalOpen(false);
        }}
        categoriesList={categoriesList} 
      />

      <CourseMoveModal 
        open={moveModalOpen} 
        onClose={() => setMoveModalOpen(false)} 
        onSuccess={() => {
          setMoveModalOpen(false);
          setSelectedIds([]);
        }}
        categoriesList={categoriesList}
        coursesToMove={coursesToMove}
      />

      <CourseCsvModal 
        open={csvModalOpen} 
        onClose={() => setCsvModalOpen(false)} 
        onSuccess={() => {
          setCsvModalOpen(false);
        }}
      />

      {/* Modal: Confirmar Borrado */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar cursos seleccionados?"
        description="Esta acción eliminará completamente los cursos de Moodle. Esta acción no se puede deshacer."
        loading={deleteLoading}
        confirmText={`Sí, eliminar ${coursesToDelete.length} curso(s)`}
      />
    </div>
  );
};
