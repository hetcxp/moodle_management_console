import React from 'react';
import { FolderTree } from 'lucide-react';
import { AdminerApi } from '../../services/adminer-api';
import { useCategoriesFlat } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { I18N } from '../../config/i18n';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 */
export const CategoryReportModal = ({ open, onClose }) => {
  const { data: categoriesData, isLoading } = useCategoriesFlat();
  const categories = categoriesData?.categories || [];

  const processDetail = (detail, csvRows) => {
    if (detail.courses && detail.courses.length > 0) {
      detail.courses.forEach(course => {
        const enrolled = course.enrolledcount || 0;
        const completed = course.completedcount || 0;
        const progress = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;
        
        csvRows.push({
          categoria: detail.name,
          curso: course.fullname,
          estado: course.visible === 1 ? I18N.reports.category.strings.visible : I18N.reports.category.strings.hidden,
          matriculados: enrolled,
          completados: completed,
          progreso: progress
        });
      });
    }
  };

  const columns = [
    { label: I18N.reports.category.columns.categoryName, accessor: 'categoria' },
    { label: I18N.reports.category.columns.courseName, accessor: 'curso' },
    { label: I18N.reports.category.columns.courseStatus, accessor: 'estado' },
    { label: I18N.reports.category.columns.enrolled, accessor: 'matriculados' },
    { label: I18N.reports.category.columns.completed, accessor: 'completados' },
    { label: I18N.reports.category.columns.progress, accessor: 'progreso' }
  ];

  return (
    <BaseReportModal
      open={open}
      onClose={onClose}
      title={I18N.reports.category.title}
      description={I18N.reports.category.description}
      loading={isLoading}
      data={categories}
      emptyTitle={I18N.reports.category.emptyTitle}
      emptyMessage={I18N.reports.category.emptyMessage}
      fetchDetail={AdminerApi.getCategoryDetail}
      processDetail={processDetail}
      columns={columns}
      filename={I18N.reports.category.filename}
      renderItem={(item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm flex items-center gap-2">
             <FolderTree className="h-3.5 w-3.5 text-primary/70" />
             {'\u00A0'.repeat(item.depth * 2)}{item.name}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 ml-5">
            {item.coursecount} {I18N.reports.cohort.strings.courses} asociados
          </span>
        </div>
      )}
    />
  );
};
