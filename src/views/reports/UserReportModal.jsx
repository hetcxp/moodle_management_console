import React, { useState } from 'react';
import { Select } from '../../components/ui/Select';
import { useUsers, useCohorts } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { I18N } from '../../config/i18n';
import { REPORT_CONFIGS } from './reportConfigs';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 */
export const UserReportModal = ({ open, onClose }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [cohortId, setCohortId] = useState('0');

  const { data: cohortsData, isLoading: loadingCohorts } = useCohorts({ perpage: 1000 });
  const cohorts = cohortsData?.cohorts || [];

  const filters = cohortId !== '0' ? { cohortid: cohortId } : {};
  const { data: usersData, isLoading: loadingUsers } = useUsers({
    page,
    perpage: 10,
    search,
    filters
  });

  const users = usersData?.users || [];
  const totalPages = usersData?.totalcount ? Math.ceil(usersData.totalcount / 10) : 1;

  const extraFilters = (
    <Select
      value={cohortId}
      onChange={(e) => { setCohortId(e.target.value); setPage(0); }}
      className="w-full sm:w-64"
      disabled={loadingCohorts}
    >
      <option value="0">{I18N.reports.user.strings.allCohorts}</option>
      {cohorts.map((coh) => (
        <option key={coh.id} value={coh.id}>
          {coh.name}
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
      loading={loadingUsers}
      data={users}
      extraFilters={extraFilters}
      {...REPORT_CONFIGS.user}
    />
  );
};
