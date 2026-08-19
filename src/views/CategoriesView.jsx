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
import { PermissionGate } from '../components/PermissionGate';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Trash2, Edit, Plus, FolderTree, BookOpen } from 'lucide-react';
export const CategoriesView = ({ onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  const hasManageCategory = permissions?.is_siteadmin === 1 || permissions?.can_manage_categories === 1;

  const [categories, setCategories] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Flat list for parent select
  const [flatCategories, setFlatCategories] = useState([]);

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

  const loadFlatCategories = async () => {
    try {
      const res = await AdminerApi.getCategoriesFlat();
      setFlatCategories(res.categories || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCategories({ page, perpage: perPage });
      setCategories(res.categories || []);
      setTotalCount(res.totalcount || 0);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al cargar categorías',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, addToast]);

  useEffect(() => {
    loadFlatCategories();
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
      loadCategories();
      loadFlatCategories();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleVisibility = async (id, isVisible) => {
    const action = isVisible ? 'hide' : 'show';
    try {
      await AdminerApi.categoryAction({ action, categoryids: [id] });
      addToast({
        type: 'success',
        title: isVisible ? 'Categoría ocultada' : 'Categoría visible'
      });
      loadCategories();
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
      loadCategories();
      loadFlatCategories();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportCsv = () => {
    const cols = [
      { label: 'ID', accessor: 'id' },
      { label: 'Nombre', accessor: 'name' },
      { label: 'Categoría Padre', accessor: 'parentname' },
      { label: 'Cursos Contenidos', accessor: 'coursecount' },
      { label: 'Estado', accessor: (r) => (r.visible === 1 ? 'Visible' : 'Oculto') }
    ];
    exportToCsv('categorias_moodle', categories, cols);
  };

  const columns = [
    {
      header: 'Categoría',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderTree className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.name}</div>
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
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.coursecount} curso(s)</span>
        </div>
      )
    },
    {
      header: 'Estado',
      cell: (row) => (
        <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
          {row.visible === 1 ? 'Visible' : 'Oculto'}
        </Badge>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGate capability="can_manage_categories">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleToggleVisibility(row.id, row.visible === 1)}
              title={row.visible === 1 ? 'Ocultar categoría' : 'Hacer visible'}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {row.visible === 1 ? <EyeOff className="h-4 w-4 text-amber-600" /> : <Eye className="h-4 w-4 text-emerald-600" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(row)}
              title="Editar categoría"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setCategoryToDelete(row); setDeleteConfirmOpen(true); }}
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Categorías de Cursos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estructura organizativa y ramas de contenidos de Moodle.
        </p>
      </div>

      <FilterBar
        onRefresh={loadCategories}
        loading={loading}
        onExportCsv={handleExportCsv}
        primaryAction={hasManageCategory ? {
          label: 'Nueva Categoría',
          onClick: handleOpenCreate,
          icon: <Plus className="h-4 w-4" />
        } : null}
      />

      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onRowClick={(row) => onNavigateToDetail?.('category', row.id)}
        selectable={false}
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
