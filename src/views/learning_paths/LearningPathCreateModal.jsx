import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useCreateLearningPath } from '../../hooks/useAdminerQueries';

export function LearningPathCreateModal({ open, onClose, onSuccess }) {
  const [fullname, setFullname] = useState('');
  const [shortname, setShortname] = useState('');
  const [startdate, setStartdate] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateLearningPath();

  const handleClose = () => {
    setFullname('');
    setShortname('');
    setStartdate('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullname.trim() || !shortname.trim()) {
      setError('El nombre completo y el nombre corto son obligatorios.');
      return;
    }

    let timestamp = 0;
    if (startdate) {
      timestamp = Math.floor(new Date(startdate).getTime() / 1000);
    }

    try {
      setError('');
      const res = await createMutation.mutateAsync({
        fullname: fullname.trim(),
        shortname: shortname.trim(),
        startdate: timestamp,
      });
      handleClose();
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setError(err?.message || 'Error al crear la ruta de aprendizaje.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear Nueva Ruta de Aprendizaje"
      description="Define el contenedor de la ruta formativa. Podrás vincular los cursos y secuenciarlos en el siguiente paso."
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creando...' : 'Crear Ruta'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/25 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Nombre de la Ruta <span className="text-destructive">*</span>
          </label>
          <Input
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Ej: Ruta de Especialización Frontend 2026"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Nombre Corto / Código <span className="text-destructive">*</span>
          </label>
          <Input
            value={shortname}
            onChange={(e) => setShortname(e.target.value)}
            placeholder="Ej: RUTA-FRONT-2026"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Fecha de Inicio (opcional)
          </label>
          <Input
            type="date"
            value={startdate}
            onChange={(e) => setStartdate(e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  );
}
