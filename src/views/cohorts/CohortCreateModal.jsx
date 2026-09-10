import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useCohortAction } from '../../hooks/useAdminerQueries';

export const CohortCreateModal = ({ open, onClose, editingCohort }) => {
  const { addToast } = useToast();
  const { mutateAsync: performCohortAction } = useCohortAction();

  const [formData, setFormData] = useState({ name: '', idnumber: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (editingCohort) {
      setFormData({
        name: editingCohort.name || '',
        idnumber: editingCohort.idnumber || '',
        description: editingCohort.description || ''
      });
    } else {
      setFormData({ name: '', idnumber: '', description: '' });
    }
  }, [editingCohort, open]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
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
      title={editingCohort ? 'Editar Cohorte' : 'Nueva Cohorte'}
      description="Configura los detalles del grupo."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={formLoading}>
            {formLoading ? 'Guardando...' : editingCohort ? 'Guardar Cambios' : 'Crear Cohorte'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Nombre de la Cohorte *</label>
          <Input
            placeholder="Ej: Estudiantes 2026-A"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Código / ID Number</label>
          <Input
            placeholder="Ej: COH-2026-A"
            value={formData.idnumber}
            onChange={(e) => setFormData({ ...formData, idnumber: e.target.value })}
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
  );
};
