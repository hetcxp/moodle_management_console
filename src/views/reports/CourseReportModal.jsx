import React, { useState } from 'react';
import { Select } from '../../components/ui/Select';
import { useCategoriesFlat, useCourses } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { I18N } from '../../config/i18n';
import { REPORT_CONFIGS } from './reportConfigs';

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
    category: parseInt(categoryId, 10)
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
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {'\u00A0'.repeat(cat.depth * 2)}{cat.name}
        </option>
      ))}
    </Select>
  );

  return (
    <BaseReportModal
      open={open}
      onClose={onClose}
      search={search}
      setSearch={setSearch}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      loading={loadingCourses}
      data={courses}
      extraFilters={extraFilters}
      {...REPORT_CONFIGS.course}
    />
  );
};
