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
import { PermissionGate } from '../components/PermissionGate';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api';
import { ChevronLeft, ChevronRight, FolderTree, BookOpen, CheckCircle, EyeOff, Eye, Trash2, Edit, Plus, FolderInput, ExternalLink, Users, Search } from 'lucide-react';

export const CategoryDetailView = ({ categoryId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  
  const hasManageCategory = permissions?.is_siteadmin === 1 || permissions?.can_manage_categories === 1;
  const hasUpdateCourse = permissions?.is_siteadmin === 1 || permissions?.can_update_courses === 1;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'subcategories'

  // Courses Tab state
  const [courseSearch, setCourseSearch] = useState('');
  const [courseVisibility, setCourseVisibility] = useState('-1');
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [courseSort, setCourseSort] = useState('fullname');
  const [courseDir, setCourseDir] = useState('ASC');
  
  // Subcategories Tab state
  const [subcatSearch, setSubcatSearch] = useState('');
  const [subcatVisibility, setSubcatVisibility] = useState('-1');
  const [selectedSubcatIds, setSelectedSubcatIds] = useState([]);
  const [subcatSort, setSubcatSort] = useState('name');
  const [subcatDir, setSubcatDir] = useState('ASC');
  
  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  // Course Modal state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseModalData, setCourseModalData] = useState(null);
  const [courseModalLoading, setCourseModalLoading] = useState(false);
  const [courseModalSearch, setCourseModalSearch] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Move courses modal
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState('');
  const [coursesToMove, setCoursesToMove] = useState([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [flatCategories, setFlatCategories] = useState([]);

  const loadFlatCategories = async () => {
    try {
      const res = await AdminerApi.getCategoriesFlat();
      setFlatCategories(res.categories || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCategoryDetail(categoryId);
      setData(res);
      setSelectedCourseIds([]);
      setSelectedSubcatIds([]);
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando categoría', description: err.message });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [categoryId, addToast, onBack]);

  useEffect(() => {
    loadData();
    loadFlatCategories();
  }, [loadData]);

  const handleOpenCreateSubcategory = () => {
    setEditingSubcategory(null);
    setFormData({ name: '', description: '' });
    setModalOpen(true);
  };

  const handleOpenEditSubcategory = (cat) => {
    setEditingSubcategory(cat);
    setFormData({ name: cat.name, description: cat.description });
    setModalOpen(true);
  };

  const handleSaveSubcategory = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingSubcategory) {
        await AdminerApi.categoryAction({
          action: 'edit',
          categoryid: editingSubcategory.id,
          name: formData.name,
          parent: parseInt(categoryId, 10), // Keeps it inside current category
          description: formData.description
        });
        addToast({ type: 'success', title: 'Subcategoría actualizada' });
      } else {
        await AdminerApi.categoryAction({
          action: 'create',
          name: formData.name,
          parent: parseInt(categoryId, 10), // Create as subcategory of current
          description: formData.description
        });
        addToast({ type: 'success', title: 'Subcategoría creada' });
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenCourseModal = async (course) => {
    setCourseModalData(course); // Set basic course info first
    setCourseModalOpen(true);
    setCourseModalLoading(true);
    setCourseModalSearch('');
    try {
      const res = await AdminerApi.getCourseDetail(course.id);
      setCourseModalData(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando usuarios', description: err.message });
      setCourseModalOpen(false);
    } finally {
      setCourseModalLoading(false);
    }
  };

  const handleToggleCategoryVisibility = async (id, isVisible) => {
    try {
      await AdminerApi.categoryAction({ 
        action: isVisible ? 'hide' : 'show', 
        categoryids: [Number(id)] 
      });
      addToast({ type: 'success', title: isVisible ? 'Categoría ocultada' : 'Categoría visible' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setDeleteLoading(true);
    try {
      await AdminerApi.categoryAction({ action: 'delete', categoryids: [categoryToDelete.id] });
      addToast({ type: 'success', title: 'Categoría eliminada' });
      setDeleteConfirmOpen(false);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkCourseAction = async (action, ids) => {
    try {
      await AdminerApi.courseAction({ action, courseids: ids.map(Number) });
      addToast({ type: 'success', title: `Cursos ${action === 'hide' ? 'ocultados' : 'visibles'}` });
      setSelectedCourseIds([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkSubcategoryAction = async (action, ids) => {
    try {
      await AdminerApi.categoryAction({ action, categoryids: ids.map(Number) });
      addToast({ type: 'success', title: `Subcategorías ${action === 'hide' ? 'ocultadas' : action === 'delete' ? 'eliminadas' : 'visibles'}` });
      setSelectedSubcatIds([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleOpenMoveModal = (ids) => {
    setCoursesToMove(ids);
    setTargetCategory('');
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
      addToast({ type: 'success', title: 'Cursos movidos correctamente' });
      setMoveModalOpen(false);
      setSelectedCourseIds([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al mover cursos', description: err.message });
    } finally {
      setMoveLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) return null;

  // KPIs calculations
  const totalCourses = data.courses?.length || 0;
  const visibleCourses = data.courses?.filter(c => c.visible === 1).length || 0;
  const hiddenCourses = data.courses?.filter(c => c.visible === 0).length || 0;
  const totalSubcats = data.subcategories?.length || 0;

  // Filtered courses
  let filteredCourses = (data.courses || []).filter(c => {
    const matchesSearch = c.fullname.toLowerCase().includes(courseSearch.toLowerCase()) || 
                          c.shortname.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesVis = courseVisibility === '-1' || String(c.visible) === courseVisibility;
    return matchesSearch && matchesVis;
  });

  filteredCourses.sort((a, b) => {
    let valA = a[courseSort];
    let valB = b[courseSort];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return courseDir === 'ASC' ? -1 : 1;
    if (valA > valB) return courseDir === 'ASC' ? 1 : -1;
    return 0;
  });

  // Filtered subcategories
  let filteredSubcats = (data.subcategories || []).filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(subcatSearch.toLowerCase());
    const matchesVis = subcatVisibility === '-1' || String(c.visible) === subcatVisibility;
    return matchesSearch && matchesVis;
  });

  filteredSubcats.sort((a, b) => {
    let valA = a[subcatSort];
    let valB = b[subcatSort];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return subcatDir === 'ASC' ? -1 : 1;
    if (valA > valB) return subcatDir === 'ASC' ? 1 : -1;
    return 0;
  });

  const coursesCols = [
    {
      header: 'Curso',
      sortKey: 'fullname',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground hover:text-primary transition-colors">{row.fullname}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.shortname}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Progreso',
      sortKey: 'enrolledcount',
      cell: (row) => {
        const enrolled = row.enrolledcount || 0;
        const completed = row.completedcount || 0;
        if (enrolled === 0) {
          return <span className="text-xs text-muted-foreground italic">Sin inscritos</span>;
        }
        const percentage = Math.round((completed / enrolled) * 100);
        return (
          <div className="flex flex-col gap-1 w-full max-w-[120px]">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>{completed} / {enrolled}</span>
              <span>{percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary overflow-hidden rounded-full">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Estado',
      sortKey: 'visible',
      cell: (row) => (
        <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
          {row.visible === 1 ? 'Visible' : 'Oculto'}
        </Badge>
      )
    },
    {
      header: 'Acciones',
      className: 'text-center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToDetail('course', row.id);
            }}
            title="Ir al detalle completo del curso"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`${API_CONFIG.baseUrl}/course/view.php?id=${row.id}`, '_blank');
            }}
            title="Ver en Moodle"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {hasUpdateCourse && (
             <Button
               variant="ghost"
               size="icon"
               onClick={(e) => {
                 e.stopPropagation();
                 handleBulkCourseAction(row.visible === 1 ? 'hide' : 'show', [row.id]);
               }}
               title={row.visible === 1 ? 'Ocultar curso' : 'Hacer visible'}
               className="h-8 w-8 text-muted-foreground hover:text-foreground"
             >
               {row.visible === 1 ? <EyeOff className="h-4 w-4 text-amber-600" /> : <Eye className="h-4 w-4 text-emerald-600" />}
             </Button>
          )}
        </div>
      )
    }
  ];

  const subcategoriesCols = [
    {
      header: 'Subcategoría',
      sortKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 font-bold">
            <FolderTree className="h-4 w-4" />
          </div>
          <div className="font-semibold text-foreground hover:text-purple-600 transition-colors">
            {row.name}
          </div>
        </div>
      )
    },
    {
      header: 'Cursos',
      sortKey: 'coursecount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.coursecount}</span>
        </div>
      )
    },
    {
      header: 'Estado',
      sortKey: 'visible',
      cell: (row) => (
        <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
          {row.visible === 1 ? 'Visible' : 'Oculto'}
        </Badge>
      )
    },
    {
      header: 'Acciones',
      className: 'text-center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <PermissionGate capability="can_manage_categories">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleToggleCategoryVisibility(row.id, row.visible === 1); }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {row.visible === 1 ? <EyeOff className="h-4 w-4 text-amber-600" /> : <Eye className="h-4 w-4 text-emerald-600" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleOpenEditSubcategory(row); }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setCategoryToDelete(row); setDeleteConfirmOpen(true); }}
              disabled={row.coursecount > 0}
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30"
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
      {/* Header and Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button onClick={onBack} className="flex items-center hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">{data.name}</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-sm">
              <FolderTree className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.name}</h1>
              {data.description && (
                <div className="text-sm text-muted-foreground mt-1 max-w-2xl" dangerouslySetInnerHTML={{ __html: data.description }} />
              )}
            </div>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="flex gap-4">
           <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col items-center min-w-[120px] shadow-sm">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cursos</span>
             <span className="text-2xl font-black text-foreground">{totalCourses}</span>
             <div className="flex gap-2 text-[10px] mt-1 font-medium">
                <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle className="h-3 w-3"/> {visibleCourses}</span>
                <span className="text-amber-600 flex items-center gap-0.5"><EyeOff className="h-3 w-3"/> {hiddenCourses}</span>
             </div>
           </div>
           <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col items-center min-w-[120px] shadow-sm">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subcategorías</span>
             <span className="text-2xl font-black text-foreground">{totalSubcats}</span>
             <span className="text-[10px] mt-1 text-muted-foreground font-medium">Anidadas</span>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/70">
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('courses')}
        >
          Cursos en esta Categoría ({filteredCourses.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'subcategories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('subcategories')}
        >
          Subcategorías ({totalSubcats})
        </button>
      </div>

      {/* Tab Content: Courses */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <FilterBar
            onRefresh={loadData}
            loading={loading}
            searchPlaceholder="Buscar curso por nombre..."
            searchValue={courseSearch}
            onSearchChange={setCourseSearch}
            filters={[
              {
                label: 'Estado',
                value: courseVisibility,
                onChange: setCourseVisibility,
                options: [
                  { label: 'Todos', value: '-1' },
                  { label: 'Visibles', value: '1' },
                  { label: 'Ocultos', value: '0' }
                ]
              }
            ]}
          />
          {selectedCourseIds.length > 0 && hasUpdateCourse && (() => {
            const selectedCourses = data.courses.filter(c => selectedCourseIds.includes(c.id));
            const isAllVisible = selectedCourses.every(c => c.visible === 1);
            const isAllHidden = selectedCourses.every(c => c.visible === 0);

            return (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-fadeIn">
                <span className="text-sm font-medium text-primary">
                  {selectedCourseIds.length} curso(s) seleccionado(s)
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {isAllVisible && (
                    <Button size="sm" variant="outline" onClick={() => handleBulkCourseAction('hide', selectedCourseIds)} className="h-8 gap-1">
                      <EyeOff className="h-3.5 w-3.5" /> Ocultar
                    </Button>
                  )}
                  {isAllHidden && (
                    <Button size="sm" variant="outline" onClick={() => handleBulkCourseAction('show', selectedCourseIds)} className="h-8 gap-1">
                      <Eye className="h-3.5 w-3.5" /> Mostrar
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleOpenMoveModal(selectedCourseIds)} className="h-8 gap-1">
                    <FolderInput className="h-3.5 w-3.5" /> Mover
                  </Button>
                </div>
              </div>
            );
          })()}
          <DataTable
            columns={coursesCols}
            data={filteredCourses}
            loading={loading}
            totalCount={filteredCourses.length}
            onRowClick={(row) => handleOpenCourseModal(row)}
            sort={courseSort}
            dir={courseDir}
            onSortChange={(newSort, newDir) => { setCourseSort(newSort); setCourseDir(newDir); }}
            selectable={hasUpdateCourse}
            selectedIds={selectedCourseIds}
            onSelectionChange={setSelectedCourseIds}
          />
        </div>
      )}

      {/* Tab Content: Subcategories */}
      {activeTab === 'subcategories' && (
        <div className="space-y-4">
          <FilterBar
            onRefresh={loadData}
            loading={loading}
            searchPlaceholder="Buscar subcategoría..."
            searchValue={subcatSearch}
            onSearchChange={setSubcatSearch}
            filters={[
              {
                label: 'Estado',
                value: subcatVisibility,
                onChange: setSubcatVisibility,
                options: [
                  { label: 'Todos', value: '-1' },
                  { label: 'Visibles', value: '1' },
                  { label: 'Ocultos', value: '0' }
                ]
              }
            ]}
            primaryAction={hasManageCategory ? {
              label: 'Nueva Subcategoría',
              onClick: handleOpenCreateSubcategory,
              icon: <Plus className="h-4 w-4" />
            } : null}
          />
          {selectedSubcatIds.length > 0 && hasManageCategory && (() => {
            const selectedSubcats = data.subcategories.filter(c => selectedSubcatIds.includes(c.id));
            const isAllVisible = selectedSubcats.every(c => c.visible === 1);
            const isAllHidden = selectedSubcats.every(c => c.visible === 0);

            return (
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg animate-fadeIn">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                  {selectedSubcatIds.length} subcategoría(s) seleccionada(s)
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {isAllVisible && (
                    <Button size="sm" variant="outline" onClick={() => handleBulkSubcategoryAction('hide', selectedSubcatIds)} className="h-8 gap-1">
                      <EyeOff className="h-3.5 w-3.5" /> Ocultar
                    </Button>
                  )}
                  {isAllHidden && (
                    <Button size="sm" variant="outline" onClick={() => handleBulkSubcategoryAction('show', selectedSubcatIds)} className="h-8 gap-1">
                      <Eye className="h-3.5 w-3.5" /> Mostrar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleBulkSubcategoryAction('delete', selectedSubcatIds)} className="h-8 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </Button>
                </div>
              </div>
            );
          })()}
          <DataTable
            columns={subcategoriesCols}
            data={filteredSubcats}
            loading={loading}
            totalCount={filteredSubcats.length}
            onRowClick={(row) => onNavigateToDetail('category', row.id)}
            sort={subcatSort}
            dir={subcatDir}
            onSortChange={(newSort, newDir) => { setSubcatSort(newSort); setSubcatDir(newDir); }}
            selectable={hasManageCategory}
            selectedIds={selectedSubcatIds}
            onSelectionChange={setSelectedSubcatIds}
          />
        </div>
      )}

      {/* Modals */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubcategory ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
        description="Configura el nombre de esta subcategoría."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSubcategory} disabled={formLoading}>
              {formLoading ? 'Guardando...' : editingSubcategory ? 'Guardar Cambios' : 'Crear Subcategoría'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveSubcategory} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre de la Categoría *</label>
            <Input
              placeholder="Ej: Programación Básica"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Descripción</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Descripción opcional..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="¿Eliminar categoría?"
        description={`¿Estás seguro de que deseas eliminar la subcategoría "${categoryToDelete?.name}"?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={deleteLoading}>
              {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </>
        }
      />

      <Dialog
        open={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title="Mover Cursos"
        description={`Selecciona la categoría de destino para los ${coursesToMove.length} cursos seleccionados.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setMoveModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleExecuteMove} disabled={!targetCategory || moveLoading}>
              {moveLoading ? 'Moviendo...' : 'Mover Cursos'}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-foreground">Categoría Destino</label>
          <Select
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
          >
            <option value="">-- Seleccionar categoría --</option>
            {flatCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>
      </Dialog>

      <Dialog
        open={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        title="Usuarios Matriculados"
        description={courseModalData ? `Detalle de progreso para el curso: ${courseModalData.fullname}` : ''}
        footer={
          <Button variant="outline" onClick={() => setCourseModalOpen(false)}>Cerrar</Button>
        }
      >
        {courseModalLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : courseModalData?.users ? (
          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9" 
                placeholder="Buscar por nombre o correo..." 
                value={courseModalSearch}
                onChange={(e) => setCourseModalSearch(e.target.value)}
              />
            </div>
            
            {(() => {
              const users = courseModalData.users.filter(u => 
                u.fullname.toLowerCase().includes(courseModalSearch.toLowerCase()) || 
                u.email.toLowerCase().includes(courseModalSearch.toLowerCase())
              );

              if (users.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Sin usuarios matriculados</p>
                    <p className="text-xs">O no hay coincidencias en tu búsqueda.</p>
                  </div>
                );
              }

              return (
                <div className="max-h-[400px] overflow-y-auto border border-border/70 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Usuario</th>
                        <th className="px-4 py-3 font-semibold w-1/3">Progreso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{u.fullname}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-secondary overflow-hidden rounded-full">
                                <div 
                                  className="h-full bg-primary transition-all duration-500" 
                                  style={{ width: `${u.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold tabular-nums min-w-[36px]">{u.progress}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No se pudo cargar la información del curso.
          </div>
        )}
      </Dialog>
    </div>
  );
};
