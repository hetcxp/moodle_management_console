import { useState } from 'react';
import { usePaginatedExport } from '../../hooks/usePaginatedExport';
import { runWithConcurrency } from '../../lib/concurrency';
import { AdminerApi } from '../../services/adminer-api';
import { formatDateOnly } from '../../lib/utils';

export function useCoursesExport({ sort, dir, search, categoryFilter, visibilityFilter }) {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const { exportLoading, handleExport: executeExport } = usePaginatedExport();

  const handleExport = () => {
    const columnsForExport = [
      { label: 'ID', accessor: 'id' },
      { label: 'Nombre Completo', accessor: 'fullname' },
      { label: 'Nombre Corto', accessor: 'shortname' },
      { label: 'Categoría', accessor: 'categoryname' },
      { label: 'Estado', accessor: (row) => (row.visible === 1 ? 'Visible' : 'Oculto') },
      { label: 'Inscritos', accessor: 'enrolledcount' },
      { label: 'Completados', accessor: 'completedcount' },
      { label: 'Cohortes', accessor: 'cohortscount' },
      { label: 'Competencias', accessor: (row) => row.competenciescount || 0 },
      { label: 'Progreso (%)', accessor: 'progress_percent' },
      { label: 'Creado', accessor: (row) => formatDateOnly(row.timecreated) },
      { label: 'Inicio', accessor: (row) => (row.startdate > 0 ? formatDateOnly(row.startdate) : 'No definida') },
      { label: 'Fin', accessor: (row) => (row.enddate > 0 ? formatDateOnly(row.enddate) : 'No definida') },
    ];

    const columnsDetailed = [
      { label: 'ID Curso', accessor: 'course_id' },
      { label: 'Curso', accessor: 'course_fullname' },
      { label: 'Nombre Corto', accessor: 'course_shortname' },
      { label: 'Categoría', accessor: 'course_category' },
      { label: 'Estado Curso', accessor: 'course_visible' },
      { label: 'Progreso Prom. Curso (%)', accessor: 'course_progress' },
      { label: 'ID Usuario', accessor: 'user_id' },
      { label: 'Nombre Usuario', accessor: 'user_fullname' },
      { label: 'Email', accessor: 'user_email' },
      { label: 'Rol', accessor: 'user_roles' },
      { label: 'Estado Usuario', accessor: 'user_status' },
      { label: 'Progreso Usuario (%)', accessor: 'user_progress' },
    ];

    const processDetail = async (coursesData) => {
      const detailedRowsArrays = await runWithConcurrency(coursesData, 5, async (course) => {
        try {
          const detail = await AdminerApi.getCourseDetail(course.id);
          const users = detail?.users || [];
          if (users.length === 0) {
            return [{
              course_id: course.id, course_fullname: course.fullname, course_shortname: course.shortname,
              course_category: course.categoryname, course_visible: course.visible === 1 ? 'Visible' : 'Oculto',
              course_progress: course.progress_percent, user_id: '', user_fullname: '', user_email: '', user_progress: '', user_status: '', user_roles: '',
            }];
          }
          return users.map((u) => ({
            course_id: course.id, course_fullname: course.fullname, course_shortname: course.shortname,
            course_category: course.categoryname, course_visible: course.visible === 1 ? 'Visible' : 'Oculto',
            course_progress: course.progress_percent, user_id: u.id, user_fullname: u.fullname,
            user_email: u.email, user_roles: (u.roles || []).join(', '),
            user_status: u.is_active === 1 ? 'Activo' : 'Suspendido', user_progress: u.progress || 0,
          }));
        } catch (e) {
          if (import.meta.env.DEV) console.warn('[Export Detail Error] Course ID:', course.id, e);
          return [{
            course_id: course.id, course_fullname: course.fullname, course_shortname: course.shortname,
            course_category: course.categoryname, course_visible: course.visible === 1 ? 'Visible' : 'Oculto',
            course_progress: course.progress_percent, user_id: '', user_fullname: 'Error al obtener usuarios',
            user_email: '', user_progress: '', user_status: '', user_roles: '',
          }];
        }
      });
      return detailedRowsArrays.flat();
    };

    executeExport({
      fetchFn: AdminerApi.getCourses,
      params: { sort, dir, search, category: parseInt(categoryFilter, 10) || 0, visibility: parseInt(visibilityFilter, 10) || -1 },
      dataKey: 'courses',
      filename: exportOption === 'visible' ? 'cursos_moodle' : 'cursos_usuarios_moodle',
      columns: exportOption === 'visible' ? columnsForExport : columnsDetailed,
      processData: exportOption === 'visible' ? null : processDetail,
    }).then(() => setExportModalOpen(false));
  };

  return {
    exportLoading,
    handleExport,
    exportModalOpen,
    setExportModalOpen,
    exportOption,
    setExportOption,
  };
}
