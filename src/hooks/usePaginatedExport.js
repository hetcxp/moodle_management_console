import { useState } from 'react';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { fetchAllPaginated } from '../lib/fetch-all';

export function usePaginatedExport() {
  const { addToast } = useToast();
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async ({
    fetchFn,
    params = {},
    perpage = 500,
    filename = 'export',
    columns = [],
    processData = null
  }) => {
    try {
      setExportLoading(true);
      
      const allData = await fetchAllPaginated((p) => fetchFn({ ...params, ...p }), { perpage });
      
      if (allData.length === 0) {
        addToast({ title: 'Aviso', description: 'No hay datos para exportar', type: 'warning' });
        return;
      }
      
      const finalData = processData ? await processData(allData) : allData;
      
      exportToCsv(filename, finalData, columns);
      addToast({ title: 'Éxito', description: `Reporte generado con ${finalData.length} registros`, type: 'success' });
    } catch (err) {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.error("Export error", err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  return { exportLoading, handleExport };
}
