import React, { useState } from 'react';
import { FilterBar } from '../../components/FilterBar';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { FolderTree, BookOpen, Eye, EyeOff, Edit, Trash2, Plus } from 'lucide-react';
import { AdminerApi } from '../../services/adminer-api';
import { useToast } from '../../components/ui/Toast';
import { PermissionGate } from '../../components/PermissionGate';

export const CategorySubcatsTab = ({
  subcategories,
  categoryId,
  loading,
  hasManageCategory,
  loadData,
  handleBulkSubcategoryAction,
  handleToggleCategoryVisibility,
  onNavigateToDetail
}) => {
  const { addToast } = useToast();
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

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handleBulkSubmit = async (action, ids) => {
    await handleBulkSubcategoryAction(action, ids);
    setSelectedSubcatIds([]);
  };

  let filteredSubcats = (subcategories || []).filter(c => {
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
        const selectedSubcats = subcategories.filter(c => selectedSubcatIds.includes(c.id));
        const isAllVisible = selectedSubcats.every(c => c.visible === 1);
        const isAllHidden = selectedSubcats.every(c => c.visible === 0);

        return (
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg animate-fadeIn">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
              {selectedSubcatIds.length} subcategoría(s) seleccionada(s)
            </span>
            <div className="ml-auto flex items-center gap-2">
              {isAllVisible && (
                <Button size="sm" variant="outline" onClick={() => handleBulkSubmit('hide', selectedSubcatIds)} className="h-8 gap-1">
                  <EyeOff className="h-3.5 w-3.5" /> Ocultar
                </Button>
              )}
              {isAllHidden && (
                <Button size="sm" variant="outline" onClick={() => handleBulkSubmit('show', selectedSubcatIds)} className="h-8 gap-1">
                  <Eye className="h-3.5 w-3.5" /> Mostrar
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => handleBulkSubmit('delete', selectedSubcatIds)} className="h-8 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
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
    </div>
  );
};
