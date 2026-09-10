import React from 'react';
import { useCategoriesFlat } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { REPORT_CONFIGS } from './reportConfigs';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 */
export const CategoryReportModal = ({ open, onClose }) => {
  const { data: categoriesData, isLoading } = useCategoriesFlat();
  const categories = categoriesData?.categories || [];

  return (
    <BaseReportModal
      open={open}
      onClose={onClose}
      loading={isLoading}
      data={categories}
      {...REPORT_CONFIGS.category}
    />
  );
};
