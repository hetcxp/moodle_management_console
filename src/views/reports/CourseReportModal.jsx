import React, { useState } from 'react';
import { Select } from '../../components/ui/Select';
import { AdminerApi } from '../../services/adminer-api';
import { useCategoriesFlat, useCourses } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { I18N } from '../../config/i18n';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 */
export const CourseReportModal = ({ open, onClose }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('0');

  const { data: categoriesData, isLoading: loadingCategories } = useCategoriesFlat();
  const categories = categoriesData?.categories || [];

  const { data: coursesData, isLoading: loadingCourses } = useCourses({
    page,
    perpage: 10,
    search,
    category: parseInt(categoryId)
  });

  const courses = coursesData?.courses || [];
  const totalPages = coursesData?.totalcount ? Math.ceil(coursesData.totalcount / 10) : 1;

  const extraFilters = (
    <Select 
      value={categoryId} 
      onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
      className="w-full sm:w-64"
      disabled={loadingCategories}
    >
      <option value="0">{I18N.reports.course.strings.allCategories}</option>
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>
          {'\u00A0'.repeat(cat.depth * 2)}{cat.name}
        </option>
      ))}
    </Select>
  );

  const processDetail = (detail, csvRows) => {
    const courseName = detail.fullname || `Curso ID ${detail.id}`;
    const categoryName = detail.categoryname || I18N.reports.course.strings.unknown;
    
    if (detail.users && detail.users.length > 0) {
      detail.users.forEach(user => {
        if (!user.enrolments || user.enrolments.length === 0) {
           csvRows.push({
             categoria: categoryName,
             curso: courseName,
             usuario: user.fullname,
             rol: user.roles || 'student',
             progreso: user.progress || 0,
             estado: user.status === 0 ? I18N.reports.course.strings.active : I18N.reports.course.strings.suspended,
             metodo: I18N.reports.course.strings.unknown,
             fecha_inicio: user.timestart > 0 ? new Date(user.timestart * 1000).toLocaleString() : '',
             fecha_fin: user.timeend > 0 ? new Date(user.timeend * 1000).toLocaleString() : ''
           });
        } else {
           user.enrolments.forEach(enrol => {
             csvRows.push({
               categoria: categoryName,
               curso: courseName,
               usuario: user.fullname,
               rol: user.roles || 'student',
               progreso: user.progress || 0,
               estado: enrol.status === 0 ? I18N.reports.course.strings.active : I18N.reports.course.strings.suspended,
               metodo: enrol.method,
               fecha_inicio: enrol.timestart > 0 ? new Date(enrol.timestart * 1000).toLocaleString() : '',
               fecha_fin: enrol.timeend > 0 ? new Date(enrol.timeend * 1000).toLocaleString() : ''
             });
           });
        }
      });
    } else {
      csvRows.push({
        categoria: categoryName,
        curso: courseName,
        usuario: I18N.reports.course.strings.noUsers,
        rol: '',
        progreso: 0,
        estado: '',
        metodo: '',
        fecha_inicio: '',
        fecha_fin: ''
      });
    }
  };

  const columns = [
    { label: I18N.reports.course.columns.category, accessor: 'categoria' },
    { label: I18N.reports.course.columns.course, accessor: 'curso' },
    { label: I18N.reports.course.columns.user, accessor: 'usuario' },
    { label: I18N.reports.course.columns.role, accessor: 'rol' },
    { label: I18N.reports.course.columns.progress, accessor: 'progreso' },
    { label: I18N.reports.course.columns.status, accessor: 'estado' },
    { label: I18N.reports.course.columns.method, accessor: 'metodo' },
    { label: I18N.reports.course.columns.startDate, accessor: 'fecha_inicio' },
    { label: I18N.reports.course.columns.endDate, accessor: 'fecha_fin' }
  ];

  return (
    <BaseReportModal
      open={open}
      onClose={onClose}
      title={I18N.reports.course.title}
      description={I18N.reports.course.description}
      search={search}
      setSearch={setSearch}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      loading={loadingCourses}
      data={courses}
      emptyTitle={I18N.reports.course.emptyTitle}
      emptyMessage={I18N.reports.course.emptyMessage}
      extraFilters={extraFilters}
      fetchDetail={AdminerApi.getCourseDetail}
      processDetail={processDetail}
      columns={columns}
      filename={I18N.reports.course.filename}
      renderItem={(item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{item.fullname}</span>
          <span className="text-xs text-muted-foreground">{item.categoryname}</span>
        </div>
      )}
    />
  );
};
