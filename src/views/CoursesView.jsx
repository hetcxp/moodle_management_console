import React, { useState, useEffect, useCallback } from 'react';
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
import { formatDate } from '../lib/utils';
import { PermissionGate } from '../components/PermissionGate';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Trash2, FolderInput, Plus, ExternalLink, GraduationCap, Users, Layers } from 'lucide-react';

export const CoursesView = ({ onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();

  const hasCreateCourse = permissions?.is_siteadmin === 1 || permissions?.can_create_courses === 1;
  const hasUpdateCourse = permissions?.is_siteadmin === 1 || permissions?.can_update_courses === 1;
  const hasManageCategory = permissions?.is_siteadmin === 1 || permissions?.can_manage_categories === 1;
  const hasDeleteCourse = permissions?.is_siteadmin === 1 || permissions?.can_delete_courses === 1;

  // Table state
  const [courses, setCourses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage] = useState(20);
  const [sort, setSort] = useState('timecreated');
  const [dir, setDir] = useState('DESC');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('0');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Categories flat list for dropdowns
  const [categoriesList, setCategoriesList] = useState([]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullname: '',
    shortname: '',
    categoryid: '',
    summary: '',
    visible: 1
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState('');
  const [coursesToMove, setCoursesToMove] = useState([]);
  const [moveLoading, setMoveLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [coursesToDelete, setCoursesToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch flat categories once
  const loadCategories = async () => {
    try {
      const res = await AdminerApi.getCategoriesFlat();
      setCategoriesList(res.categories || []);
      if (res.categories?.length > 0 && !createForm.categoryid) {
        setCreateForm((prev) => ({ ...prev, categoryid: String(res.categories[0].id) }));
      }
    } catch (err) {
      console.error('Error fetching categories list:', err);
    }
  };

  // Fetch courses with current parameters
  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCourses({
        page,
        perpage: perPage,
        sort,
        dir,
        search,
        category: parseInt(categoryFilter, 10),
        visibility: parseInt(visibilityFilter, 10),
        filters
      });
      setCourses(res.courses || []);
      setTotalCount(res.totalcount || 0);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al cargar cursos',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sort, dir, search, categoryFilter, visibilityFilter, filters, addToast]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Bulk actions handlers
  const handleBulkHide = async (ids = selectedIds) => {
    try {
      await AdminerApi.courseAction({ action: 'hide', courseids: ids });
      addToast({
        type: 'success',
        title: 'Cursos ocultados',
        description: `Se han ocultado ${ids.length} curso(s).`
      });
      setSelectedIds([]);
      loadCourses();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkShow = async (ids = selectedIds) => {
    try {
      await AdminerApi.courseAction({ action: 'show', courseids: ids });
      addToast({
        type: 'success',
        title: 'Cursos visibles',
        description: `Se han hecho visibles ${ids.length} curso(s).`
      });
      setSelectedIds([]);
      loadCourses();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleOpenMoveModal = (ids = selectedIds) => {
    setCoursesToMove(ids);
    setTargetCategory(categoriesList[0]?.id ? String(categoriesList[0].id) : '');
    setMoveModalOpen(true);
  };

  const handleExecuteMove = async () => {
    if (!targetCategory) return;
    setMoveLoading(true);
    try {
      await AdminerApi.courseAction({
        action: 'move',
        courseids: coursesToMove,
        categoryid: parseInt(targetCategory, 10)
      });
      addToast({
        type: 'success',
        title: 'Cursos movidos',
        description: `Se movieron ${coursesToMove.length} curso(s) correctamente.`
      });
      setMoveModalOpen(false);
      setSelectedIds([]);
      loadCourses();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al mover cursos', description: err.message });
    } finally {
      setMoveLoading(false);
    }
  };

  const handleOpenDeleteModal = (ids = selectedIds) => {
    setCoursesToDelete(ids);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDelete = async () => {
    setDeleteLoading(true);
    try {
      await AdminerApi.courseAction({ action: 'delete', courseids: coursesToDelete });
      addToast({
        type: 'success',
        title: 'Cursos eliminados',
        description: `Se eliminaron ${coursesToDelete.length} curso(s).`
      });
      setDeleteConfirmOpen(false);
      setSelectedIds([]);
      loadCourses();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar cursos', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Create course handler
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await AdminerApi.courseAction({
        action: 'create',
        fullname: createForm.fullname,
        shortname: createForm.shortname,
        categoryid: parseInt(createForm.categoryid, 10),
        summary: createForm.summary,
        visible: parseInt(createForm.visible, 10)
      });
      addToast({
        type: 'success',
        title: 'Curso creado',
        description: `El curso "${createForm.fullname}" fue creado con éxito.`
      });
      setCreateModalOpen(false);
      setCreateForm({
        fullname: '',
        shortname: '',
        categoryid: categoriesList[0]?.id ? String(categoriesList[0].id) : '',
        summary: '',
        visible: 1
      });
      loadCourses();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al crear curso', description: err.message });
    } finally {
      setCreateLoading(false);
    }
  };

  // Export CSV
  const handleExport = async () => {
    let exportData = courses;
    if (totalCount > courses.length) {
      try {
        setLoading(true);
        const res = await AdminerApi.getCourses({
          page: 0,
          perpage: 99999,
          sort,
          dir,
          search,
          category,
          visibility
        });
        if (res?.courses) {
          exportData = res.courses;
        }
      } catch (err) {
        console.error("Export error", err);
        addToast({ title: 'Error', description: 'No se pudieron obtener todos los registros para exportar. Se exportará la página actual.', type: 'error' });
      } finally {
        setLoading(false);
      }
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
      { label: 'Fecha Creación', accessor: (row) => formatDate(row.timecreated) }
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
        <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.enrolledcount}</span>
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
      header: 'Fecha',
      sortKey: 'timecreated',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.timecreated)}
        </span>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
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

      {/* Filter and search bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(0); }}
        searchPlaceholder="Buscar por nombre o código de curso..."
        onRefresh={loadCourses}
        loading={loading}
        onExportCsv={handleExport}
        primaryAction={hasCreateCourse ? {
          label: 'Crear Curso',
          onClick: () => setCreateModalOpen(true),
          icon: <Plus className="h-4 w-4" />
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
          ...(hasUpdateCourse ? [
            {
              label: 'Hacer Visibles',
              icon: <Eye className="h-3.5 w-3.5" />,
              onClick: handleBulkShow,
              variant: 'success'
            },
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
      />

      {/* Modal: Crear Curso */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Crear Nuevo Curso"
        description="Ingresa los datos para registrar un curso en Moodle."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCourse} disabled={createLoading}>
              {createLoading ? 'Creando...' : 'Crear Curso'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre Completo del Curso *</label>
            <Input
              placeholder="Ej: Introducción a Python 3"
              value={createForm.fullname}
              onChange={(e) => setCreateForm({ ...createForm, fullname: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Nombre Corto / Código *</label>
              <Input
                placeholder="Ej: PY3-101"
                value={createForm.shortname}
                onChange={(e) => setCreateForm({ ...createForm, shortname: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Categoría *</label>
              <Select
                value={createForm.categoryid}
                onChange={(e) => setCreateForm({ ...createForm, categoryid: e.target.value })}
                required
              >
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Visibilidad Inicial</label>
            <Select
              value={createForm.visible}
              onChange={(e) => setCreateForm({ ...createForm, visible: parseInt(e.target.value, 10) })}
            >
              <option value={1}>Visible para estudiantes</option>
              <option value={0}>Oculto (Borrador)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Resumen / Descripción</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Descripción breve del contenido del curso..."
              value={createForm.summary}
              onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
            />
          </div>
        </form>
      </Dialog>

      {/* Modal: Mover Cursos */}
      <Dialog
        open={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title="Mover Cursos de Categoría"
        description={`Selecciona la categoría de destino para ${coursesToMove.length} curso(s).`}
        footer={
          <>
            <Button variant="outline" onClick={() => setMoveModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExecuteMove} disabled={moveLoading}>
              {moveLoading ? 'Moviendo...' : 'Mover Cursos'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Categoría Destino</label>
            <Select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
            >
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Dialog>

      {/* Modal: Confirmar Borrado */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="¿Eliminar cursos seleccionados?"
        description="Esta acción es irreversible y borrará el curso junto con sus inscripciones y calificaciones asociadas en Moodle."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExecuteDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Eliminando...' : `Sí, eliminar ${coursesToDelete.length} curso(s)`}
            </Button>
          </>
        }
      >
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400">
          Atención: Estás a punto de borrar <strong>{coursesToDelete.length}</strong> curso(s).
        </div>
      </Dialog>
    </div>
  );
};
