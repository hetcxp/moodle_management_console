import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { AdminerApi } from '../../services/adminer-api';
import { useCohorts } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { I18N } from '../../config/i18n';

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

  const processDetail = (detail, csvRows) => {
    const members = detail.members || [];
    const courses = detail.courses || [];
    
    const courseMap = {};
    courses.forEach(c => {
      courseMap[c.id] = c.fullname;
    });

    if (members.length === 0) {
      csvRows.push({
        cohorte: detail.name,
        codigo: detail.idnumber,
        usuario: I18N.reports.cohort.strings.noMembers,
        email: '',
        estado: '',
        curso: '',
        progreso: 0
      });
    } else {
      members.forEach(member => {
        const courseProgresses = member.course_progresses || [];
        
        if (courseProgresses.length === 0) {
           csvRows.push({
             cohorte: detail.name,
             codigo: detail.idnumber,
             usuario: member.fullname,
             email: member.email,
             estado: member.suspended === 0 ? I18N.reports.cohort.strings.active : I18N.reports.cohort.strings.suspended,
             curso: I18N.reports.cohort.strings.noCourses,
             progreso: 0
           });
        } else {
           courseProgresses.forEach(cp => {
             csvRows.push({
               cohorte: detail.name,
               codigo: detail.idnumber,
               usuario: member.fullname,
               email: member.email,
               estado: member.suspended === 0 ? I18N.reports.cohort.strings.active : I18N.reports.cohort.strings.suspended,
               curso: courseMap[cp.courseid] || `Curso ID ${cp.courseid}`,
               progreso: cp.progress
             });
           });
        }
      });
    }
  };

  const columns = [
    { label: I18N.reports.cohort.columns.cohortName, accessor: 'cohorte' },
    { label: I18N.reports.cohort.columns.cohortCode, accessor: 'codigo' },
    { label: I18N.reports.cohort.columns.userName, accessor: 'usuario' },
    { label: I18N.reports.cohort.columns.email, accessor: 'email' },
    { label: I18N.reports.cohort.columns.userStatus, accessor: 'estado' },
    { label: I18N.reports.cohort.columns.course, accessor: 'curso' },
    { label: I18N.reports.cohort.columns.progress, accessor: 'progreso' }
  ];

  return (
    <BaseReportModal
      open={open}
      onClose={onClose}
      title={I18N.reports.cohort.title}
      description={I18N.reports.cohort.description}
      search={search}
      setSearch={setSearch}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      loading={loadingCohorts}
      data={cohorts}
      emptyTitle={I18N.reports.cohort.emptyTitle}
      emptyMessage={I18N.reports.cohort.emptyMessage}
      fetchDetail={AdminerApi.getCohortDetail}
      processDetail={processDetail}
      columns={columns}
      filename={I18N.reports.cohort.filename}
      renderItem={(item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm flex items-center gap-2">
             <Layers className="h-3.5 w-3.5 text-primary/70" />
             {item.name}
          </span>
          <span className="text-xs text-muted-foreground mt-0.5 ml-5">
            {item.memberscount} {I18N.reports.cohort.strings.members} - {item.coursescount} {I18N.reports.cohort.strings.courses}
          </span>
        </div>
      )}
    />
  );
};
