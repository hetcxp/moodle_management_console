import React from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export const RubricDeleteModal = ({
  open,
  onClose,
  rubricToDelete,
  onConfirmDelete,
  deleteLoading,
}) => {
  if (!rubricToDelete) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="¿Eliminar plantilla de rúbrica?"
      description="Esta acción eliminará la plantilla compartida del banco del sitio."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={deleteLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Eliminando...' : 'Sí, eliminar plantilla'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-2">
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Advertencia importante</p>
            <p>
              Estás a punto de eliminar permanentemente la plantilla{' '}
              <strong>"{rubricToDelete.name}"</strong> (ID: {rubricToDelete.id}) del banco de formularios del sitio.
            </p>
            <p className="text-[11px] opacity-90">
              Las actividades que ya hayan copiado esta rúbrica previamente mantendrán su copia local intacta, pero la plantilla ya no estará disponible para nuevos cursos o tareas.
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
