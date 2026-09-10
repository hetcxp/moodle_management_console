import { useState } from 'react';
import { useToast } from '../components/ui/Toast';
import { exportToCsv } from '../components/CsvExporter';
import { runWithConcurrency } from '../lib/concurrency';

/**
 * Hook para manejar la exportación masiva con concurrencia hacia CSV
 * @param {Object} options
 * @param {function} options.fetchDetail - Función que retorna la promesa con el detalle de un ID
 * @param {function} options.processDetail - Función que recibe (detail, csvRows) y empuja filas
 * @param {Array} options.columns - Columnas para el CSV [{label, accessor}]
 * @param {string} options.filename - Nombre del archivo CSV a exportar
 * @param {number} [options.chunkSize=5] - Tamaño de los lotes de peticiones
 * @param {function} [options.onClose] - Callback al completar exitosamente
 * @returns {{ exporting: boolean, handleExport: (selectedIds: Array) => Promise<void> }}
 */
export function useReportExport({
  fetchDetail,
  processDetail,
  columns,
  filename,
  chunkSize = 5,
  onClose,
}) {
  const { addToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async (selectedIds) => {
    setExporting(true);
    try {
      const csvRows = [];
      const details = await runWithConcurrency(selectedIds, chunkSize, (cid) => fetchDetail(cid));

      details.forEach((detail) => {
        if (detail) {
          processDetail(detail, csvRows);
        }
      });

      if (csvRows.length === 0) {
        addToast({ title: 'No se encontraron datos para exportar.', type: 'warning' });
        return;
      }

      exportToCsv(filename, csvRows, columns);
      addToast({ title: `Reporte generado con ${csvRows.length} filas`, type: 'success' });
      if (onClose) {
        onClose();
      }
    } catch (err) {
      addToast({ title: 'Error generando reporte: ' + err.message, type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return { exporting, handleExport };
}
