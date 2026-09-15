import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

export const ScaleDeleteModal = ({
  open,
  onClose,
  scaleToDelete,
  onConfirmDelete,
  deleteLoading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Confirmar Eliminación de Escala"
      description="Esta acción eliminará la escala del sitio Moodle de manera permanente."
      maxWidth="max-w-md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Eliminando...' : 'Eliminar definitivamente'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 pt-2">
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            ¿Estás seguro de que deseas eliminar la escala <strong>"{scaleToDelete?.name}"</strong>? Esta acción no se puede deshacer.
          </span>
        </div>
      </div>
    </Dialog>
  );
};
