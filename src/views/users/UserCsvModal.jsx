import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';
import { Upload } from 'lucide-react';

export const UserCsvModal = ({ open, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [csvFile, setCsvFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCsvFile(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleUpload = () => {
    if (!csvFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoading(true);
        const base64Content = btoa(e.target.result);
        const res = await AdminerApi.uploadUsersCsv(base64Content);
        if (res.success) {
          addToast({ title: 'Archivo subido', description: res.message, type: 'success' });
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['users_kpis'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          onSuccess?.();
          onClose();
        } else {
          addToast({ title: 'Error', description: res.message, type: 'error' });
        }
      } catch (err) {
        addToast({ title: 'Error al procesar archivo', description: err.message, type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(csvFile);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cargar Usuarios desde CSV"
      description="Sube un archivo CSV con la lista de usuarios. El archivo debe contener cabeceras como username, firstname, lastname, email."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button disabled={!csvFile || isLoading} onClick={handleUpload}>
            {isLoading ? 'Cargando...' : 'Cargar Archivo'}
          </Button>
        </>
      }
    >
      <div className="pt-4">
        <div className="border-2 border-dashed border-border/60 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-muted/20 relative overflow-hidden">
          <Upload className="h-10 w-10 text-muted-foreground/60" />
          <div className="text-sm font-medium">{csvFile ? csvFile.name : 'Arrastra tu archivo CSV aquí'}</div>
          {!csvFile && <div className="text-xs text-muted-foreground">o</div>}
          <input 
            type="file" 
            accept=".csv"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => setCsvFile(e.target.files[0])}
          />
          {!csvFile && <Button variant="secondary" size="sm" className="pointer-events-none">Seleccionar Archivo</Button>}
        </div>
      </div>
    </Dialog>
  );
};
