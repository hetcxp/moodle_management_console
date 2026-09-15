import { useState } from 'react';
import { AdminerApi } from '../../services/adminer-api';
import { exportToCsv } from '../../components/CsvExporter';
import { runWithConcurrency } from '../../lib/concurrency';

export const useCategoriesExport = ({ filteredCategories = [], addToast }) => {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      if (exportOption === 'visible') {
        const columns = [
          { label: 'ID', accessor: 'id' },
          { label: 'Categoría', accessor: 'name' },
          { label: 'Subcategoría de', accessor: 'parentname' },
          { label: 'Cursos', accessor: 'coursecount' },
          { label: 'Estado', accessor: (row) => (row.visible === 1 ? 'Visible' : 'Oculto') },
          { label: 'Progreso (%)', accessor: (row) => row.progress || 0 }
        ];
        exportToCsv('categorias_moodle', filteredCategories, columns);
      } else {
        const categoryRows = await runWithConcurrency(filteredCategories, 5, async (cat) => {
          try {
            const detail = await AdminerApi.getCategoryDetail(cat.id);
            if (detail?.courses && detail.courses.length > 0) {
              return detail.courses.map((course) => ({
                cat_id: cat.id,
                cat_name: cat.name,
                cat_parentname: cat.parentname,
                cat_visible: cat.visible === 1 ? 'Visible' : 'Oculto',
                cat_progress: cat.progress || 0,
                course_id: course.id,
                course_name: course.fullname || course.name,
                course_progress: course.progress || 0
              }));
            }
            return [{
              cat_id: cat.id,
              cat_name: cat.name,
              cat_parentname: cat.parentname,
              cat_visible: cat.visible === 1 ? 'Visible' : 'Oculto',
              cat_progress: cat.progress || 0,
              course_id: '',
              course_name: '',
              course_progress: ''
            }];
          } catch (e) {
            if (import.meta.env.DEV) console.error('Error fetching detail for category', cat.id, e);
            return [{
              cat_id: cat.id,
              cat_name: cat.name,
              cat_parentname: cat.parentname,
              cat_visible: cat.visible === 1 ? 'Visible' : 'Oculto',
              cat_progress: cat.progress || 0,
              course_id: '',
              course_name: '',
              course_progress: ''
            }];
          }
        });

        const exportData = categoryRows.flat();
        const columns = [
          { label: 'ID Categoría', accessor: 'cat_id' },
          { label: 'Categoría', accessor: 'cat_name' },
          { label: 'Subcategoría de', accessor: 'cat_parentname' },
          { label: 'Estado Categoría', accessor: 'cat_visible' },
          { label: 'Progreso Categoría (%)', accessor: 'cat_progress' },
          { label: 'ID Curso', accessor: 'course_id' },
          { label: 'Curso', accessor: 'course_name' },
          { label: 'Progreso Curso (%)', accessor: 'course_progress' }
        ];
        exportToCsv('categorias_cursos_moodle', exportData, columns);
      }
      setExportModalOpen(false);
    } catch (err) {
      addToast?.({ type: 'error', title: 'Error en la exportación', description: err.message });
    } finally {
      setExportLoading(false);
    }
  };

  return {
    exportModalOpen,
    setExportModalOpen,
    exportOption,
    setExportOption,
    exportLoading,
    handleExport
  };
};
