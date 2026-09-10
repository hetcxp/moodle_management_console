import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useCategoryAction } from '../../hooks/useAdminerQueries';

export const CategoryCreateModal = ({ open, onClose, editingCategory, flatCategories }) => {
  const { addToast } = useToast();
  const categoryAction = useCategoryAction();

  const [formData, setFormData] = useState({
    name: '',
    parent: 0,
    description: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        parent: editingCategory.parent,
        description: editingCategory.description || ''
      });
    } else {
      setFormData({ name: '', parent: 0, description: '' });
    }
  }, [editingCategory, open]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormLoading(true);
    try {
      if (editingCategory) {
        await categoryAction.mutateAsync({
          action: 'edit',
          categoryid: editingCategory.id,
          name: formData.name,
          parent: parseInt(formData.parent, 10),
          description: formData.description
        });
        addToast({ type: 'success', title: 'Categoría actualizada con éxito.' });
      } else {
        await categoryAction.mutateAsync({
          action: 'create',
          name: formData.name,
          parent: parseInt(formData.parent, 10),
          description: formData.description
        });
        addToast({ type: 'success', title: 'Categoría creada con éxito.' });
      }
      onClose();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
      description="Configura el nombre y la posición en el árbol de categorías."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={formLoading}>
            {formLoading ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
  );
};
