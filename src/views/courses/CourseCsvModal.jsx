import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';

export const CourseCsvModal = ({ open, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCsvFile(null);
      setError('');
    }
  }, [open]);

  const handleUploadCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      setError('Debes seleccionar un archivo CSV.');
      return;
    }

    setCsvLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const text = ev.target.result;
        const bytes = new TextEncoder().encode(text);
        const binString = String.fromCodePoint(...bytes);
        const base64Content = btoa(binString);
        
        try {
          const res = await AdminerApi.uploadCoursesCsv(base64Content);
          if (res.success) {
            addToast({ type: 'success', title: 'Importación Completada', description: res.message });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            onSuccess();
          } else {
            addToast({ type: 'error', title: 'Error en la importación', description: res.message });
          }
        } catch (apiErr) {
          addToast({ type: 'error', title: 'Error', description: apiErr.message });
        } finally {
          setCsvLoading(false);
        }
      };
      reader.readAsText(csvFile);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
      setCsvLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Importar Cursos (CSV)"
      description="Selecciona un archivo CSV para crear cursos masivamente."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleUploadCsv} disabled={csvLoading || !csvFile}>
            {csvLoading ? 'Importando...' : 'Subir Archivo'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleUploadCsv} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Archivo CSV *</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setCsvFile(e.target.files[0]);
              setError('');
            }}
            className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${error ? 'border-destructive' : 'border-input'}`}
          />
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            El archivo debe contener al menos las columnas: <code>fullname</code>, <code>shortname</code>, <code>category</code>.
          </p>
        </div>
      </form>
    </Dialog>
  );
};
