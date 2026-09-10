import React, { useState } from 'react';
import { useCohorts } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { REPORT_CONFIGS } from './reportConfigs';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 */
export const CohortReportModal = ({ open, onClose }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const { data: cohortsData, isLoading: loadingCohorts } = useCohorts({
    page,
    perpage: 10,
    search
  });

  const cohorts = cohortsData?.cohorts || [];
  const totalPages = cohortsData?.totalcount ? Math.ceil(cohortsData.totalcount / 10) : 1;

  return (
    <BaseReportModal
      open={open}
      onClose={onClose}
      search={search}
      setSearch={setSearch}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      loading={loadingCohorts}
      data={cohorts}
      {...REPORT_CONFIGS.cohort}
    />
  );
};
