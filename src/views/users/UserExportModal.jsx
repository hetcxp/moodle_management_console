import React from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';

export const UserExportModal = ({
  open,
  onClose,
  exportOption,
  setExportOption,
  onExport,
  loading
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Opciones de Exportación"
      description="Selecciona el formato de exportación."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onExport} disabled={loading}>
            {loading ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Tipo de Exportación</label>
          <Select
            value={exportOption}
            onChange={(e) => setExportOption(e.target.value)}
          >
            <option value="visible">Exportar Resumen (solo información de los usuarios)</option>
            <option value="with_courses">Exportar con Detalles (usuarios con detalle de cursos)</option>
          </Select>
        </div>
      </div>
    </Dialog>
  );
};
