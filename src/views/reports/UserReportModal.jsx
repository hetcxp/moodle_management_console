import React, { useState } from 'react';
import { Select } from '../../components/ui/Select';
import { AdminerApi } from '../../services/adminer-api';
import { useUsers, useCohorts } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { I18N } from '../../config/i18n';

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
      {cohorts.map(coh => (
        <option key={coh.id} value={coh.id}>
          {coh.name}
        </option>
      ))}
    </Select>
  );

  const processDetail = (detail, csvRows) => {
    if (detail.courses && detail.courses.length > 0) {
      detail.courses.forEach(course => {
        if (!course.enrolments || course.enrolments.length === 0) {
           csvRows.push({
             usuario: detail.fullname,
             email: detail.email,
             curso: course.fullname,
             progreso: course.progress || 0,
             metodo: course.enrolmethod || I18N.reports.user.strings.unknownMethod,
             estado: course.enrolstatus === 0 ? I18N.reports.user.strings.active : I18N.reports.user.strings.suspended,
             fecha_inicio: '',
             fecha_fin: ''
           });
        } else {
           course.enrolments.forEach(enrol => {
             csvRows.push({
               usuario: detail.fullname,
               email: detail.email,
               curso: course.fullname,
               progreso: course.progress || 0,
               metodo: enrol.method,
               estado: enrol.status === 0 ? I18N.reports.user.strings.active : I18N.reports.user.strings.suspended,
               fecha_inicio: enrol.timestart > 0 ? new Date(enrol.timestart * 1000).toLocaleString() : '',
               fecha_fin: enrol.timeend > 0 ? new Date(enrol.timeend * 1000).toLocaleString() : ''
             });
           });
        }
      });
    } else {
      csvRows.push({
        usuario: detail.fullname,
        email: detail.email,
        curso: I18N.reports.user.strings.noCourses,
        progreso: 0,
        metodo: '',
        estado: '',
        fecha_inicio: '',
        fecha_fin: ''
      });
    }
  };

  const columns = [
    { label: I18N.reports.user.columns.user, accessor: 'usuario' },
    { label: I18N.reports.user.columns.email, accessor: 'email' },
    { label: I18N.reports.user.columns.course, accessor: 'curso' },
    { label: I18N.reports.user.columns.progress, accessor: 'progreso' },
    { label: I18N.reports.user.columns.method, accessor: 'metodo' },
    { label: I18N.reports.user.columns.status, accessor: 'estado' },
    { label: I18N.reports.user.columns.startDate, accessor: 'fecha_inicio' },
    { label: I18N.reports.user.columns.endDate, accessor: 'fecha_fin' }
  ];

  return (
    <BaseReportModal
      open={open}
      onClose={onClose}
      title={I18N.reports.user.title}
      description={I18N.reports.user.description}
      search={search}
      setSearch={setSearch}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      loading={loadingUsers}
      data={users}
      emptyTitle={I18N.reports.user.emptyTitle}
      emptyMessage={I18N.reports.user.emptyMessage}
      extraFilters={extraFilters}
      fetchDetail={AdminerApi.getUserDetail}
      processDetail={processDetail}
      columns={columns}
      filename={I18N.reports.user.filename}
      renderItem={(item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{item.fullname}</span>
          <span className="text-xs text-muted-foreground">{item.email}</span>
        </div>
      )}
    />
  );
};
