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
import { Eye, EyeOff, Trash2, Edit, Plus, FolderTree, BookOpen } from 'lucide-react';

export const CategoriesView = ({ onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  const hasManageCategory = permissions?.is_siteadmin === 1 || permissions?.can_manage_categories === 1;

  const [flatCategories, setFlatCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filtering & Sorting
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [sort, setSort] = useState('name');
  const [dir, setDir] = useState('ASC');

  // Create/Edit Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parent: 0,
    description: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCategoriesFlat();
      setFlatCategories(res.categories || []);
      setSelectedIds([]);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al cargar categorías', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, visibilityFilter, sort, dir]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', parent: 0, description: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      parent: cat.parent,
      description: cat.description
    });
    setModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingCategory) {
        await AdminerApi.categoryAction({
          action: 'edit',
          categoryid: editingCategory.id,
          name: formData.name,
          parent: parseInt(formData.parent, 10),
          description: formData.description
        });
        addToast({ type: 'success', title: 'Categoría actualizada con éxito.' });
      } else {
        await AdminerApi.categoryAction({
          action: 'create',
          name: formData.name,
          parent: parseInt(formData.parent, 10),
          description: formData.description
        });
        addToast({ type: 'success', title: 'Categoría creada con éxito.' });
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleVisibility = async (id, isVisible) => {
    const action = isVisible ? 'hide' : 'show';
    try {
      await AdminerApi.categoryAction({ action, categoryids: [Number(id)] });
      addToast({ type: 'success', title: isVisible ? 'Categoría ocultada' : 'Categoría visible' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkAction = async (action, ids) => {
    try {
      await AdminerApi.categoryAction({ action, categoryids: ids.map(Number) });
      addToast({ type: 'success', title: `Categorías ${action === 'hide' ? 'ocultadas' : action === 'delete' ? 'eliminadas' : 'visibles'}` });
      setSelectedIds([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleDelete = async () => {
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

  // KPIs
  const totalCategories = flatCategories.length;
  const visibleCategories = flatCategories.filter(c => c.visible === 1).length;
  const hiddenCategories = flatCategories.filter(c => c.visible === 0).length;
  const totalCourses = flatCategories.reduce((sum, cat) => sum + (cat.coursecount || 0), 0);

  // Filter & Sort
  let filteredCategories = flatCategories.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesVis = visibilityFilter === '-1' || String(c.visible) === visibilityFilter;
    return matchesSearch && matchesVis;
  });

  filteredCategories.sort((a, b) => {
    let valA = a[sort];
    let valB = b[sort];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return dir === 'ASC' ? -1 : 1;
    if (valA > valB) return dir === 'ASC' ? 1 : -1;
    return 0;
  });

  const totalCount = filteredCategories.length;
  const paginatedData = filteredCategories.slice(page * perPage, (page + 1) * perPage);

  const columns = [
    {
      header: 'Categoría',
      sortKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderTree className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground hover:text-primary transition-colors">{row.name}</div>
            {row.parentname && (
              <div className="text-xs text-muted-foreground">
                Subcategoría de: <span className="font-medium text-foreground">{row.parentname}</span>
              </div>
            )}
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
          <span>{row.coursecount} curso(s)</span>
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
              onClick={(e) => { e.stopPropagation(); handleToggleVisibility(row.id, row.visible === 1); }}
              title={row.visible === 1 ? 'Ocultar categoría' : 'Hacer visible'}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {row.visible === 1 ? <EyeOff className="h-4 w-4 text-amber-600" /> : <Eye className="h-4 w-4 text-emerald-600" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }}
              title="Editar categoría"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setCategoryToDelete(row); setDeleteConfirmOpen(true); }}
              disabled={row.coursecount > 0}
              title={row.coursecount > 0 ? 'No se puede eliminar porque contiene cursos' : 'Eliminar categoría'}
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
      {/* Header with KPIs */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/70 pb-6">
        <div>
           <div className="flex items-center gap-3">
             <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-sm">
               <FolderTree className="h-7 w-7" />
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Categorías de Cursos</h1>
               <p className="text-sm text-muted-foreground mt-1">Estructura organizativa y ramas de contenidos de Moodle.</p>
             </div>
           </div>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col items-center min-w-[120px] shadow-sm">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Categorías</span>
             <span className="text-2xl font-black text-foreground">{totalCategories}</span>
             <div className="flex gap-2 text-[10px] mt-1 font-medium">
                <span className="text-emerald-600 flex items-center gap-0.5"><Eye className="h-3 w-3"/> {visibleCategories}</span>
                <span className="text-amber-600 flex items-center gap-0.5"><EyeOff className="h-3 w-3"/> {hiddenCategories}</span>
             </div>
           </div>
           <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col items-center min-w-[120px] shadow-sm">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cursos Totales</span>
             <span className="text-2xl font-black text-foreground">{totalCourses}</span>
             <span className="text-[10px] mt-1 text-muted-foreground font-medium">Asignados</span>
           </div>
        </div>
      </div>

      <FilterBar
        onRefresh={loadData}
        loading={loading}
        searchPlaceholder="Buscar categoría..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: 'Estado',
            value: visibilityFilter,
            onChange: setVisibilityFilter,
            options: [
              { label: 'Todos', value: '-1' },
              { label: 'Visibles', value: '1' },
              { label: 'Ocultos', value: '0' }
            ]
          }
        ]}
        primaryAction={hasManageCategory ? {
          label: 'Nueva Categoría',
          onClick: handleOpenCreate,
          icon: <Plus className="h-4 w-4" />
        } : null}
      />

      {selectedIds.length > 0 && hasManageCategory && (() => {
        const selectedCategories = flatCategories.filter(c => selectedIds.includes(c.id));
        const isAllVisible = selectedCategories.every(c => c.visible === 1);
        const isAllHidden = selectedCategories.every(c => c.visible === 0);

        return (
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg animate-fadeIn">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
              {selectedIds.length} categoría(s) seleccionada(s)
            </span>
            <div className="ml-auto flex items-center gap-2">
              {isAllVisible && (
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('hide', selectedIds)} className="h-8 gap-1">
                  <EyeOff className="h-3.5 w-3.5" /> Ocultar
                </Button>
              )}
              {isAllHidden && (
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('show', selectedIds)} className="h-8 gap-1">
                  <Eye className="h-3.5 w-3.5" /> Mostrar
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete', selectedIds)} className="h-8 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            </div>
          </div>
        );
      })()}

      <DataTable
        columns={columns}
        data={paginatedData}
        loading={loading}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onRowClick={(row) => onNavigateToDetail?.('category', row.id)}
        sort={sort}
        dir={dir}
        onSortChange={(newSort, newDir) => { setSort(newSort); setDir(newDir); }}
        selectable={hasManageCategory}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Modal: Crear / Editar */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        description="Configura el nombre y la posición en el árbol de categorías."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={formLoading}>
              {formLoading ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre de la Categoría *</label>
            <Input
              placeholder="Ej: Programación y Software"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Categoría Padre</label>
            <Select
              value={formData.parent}
              onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
            >
              <option value={0}>Superior (Raíz Principal)</option>
              {flatCategories
                .filter((c) => !editingCategory || c.id !== editingCategory.id)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </Select>
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

      {/* Modal: Confirmar Borrado */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="¿Eliminar categoría?"
        description={`¿Estás seguro de que deseas eliminar la categoría "${categoryToDelete?.name}"?`}
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
    </div>
  );
};
