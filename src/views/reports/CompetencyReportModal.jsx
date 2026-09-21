import React, { useState, useMemo } from 'react';
import { Select } from '../../components/ui/Select';
import { useAllCompetencies, useCompetencyFrameworks } from '../../hooks/useAdminerQueries';
import { BaseReportModal } from '../../components/ui/BaseReportModal';
import { I18N } from '../../config/i18n';
import { REPORT_CONFIGS } from './reportConfigs';

/**
 * Modal de selección de competencias para exportación de reporte detallado.
 * Filtros: búsqueda por nombre/código + filtro por marco de competencias.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 */
export const CompetencyReportModal = ({ open, onClose }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [frameworkId, setFrameworkId] = useState('0');

  const PER_PAGE = 10;

  const { data: frameworksData, isLoading: loadingFrameworks } = useCompetencyFrameworks({
    perpage: 200,
    sort: 'shortname',
    dir: 'ASC',
  });
  const frameworks = frameworksData?.frameworks || [];

  const { data: allCompData, isLoading: loadingAll } = useAllCompetencies(
    frameworkId !== '0' ? parseInt(frameworkId, 10) : 0
  );
  const rawCompetencies = allCompData?.competencies;

  // Filtrado client-side por búsqueda (búsqueda sobre shortname e idnumber)
  const filtered = useMemo(() => {
    const list = rawCompetencies || [];
    if (!search.trim()) return list;
    const lower = search.toLowerCase();
    return list.filter(
      (c) =>
        c.shortname.toLowerCase().includes(lower) ||
        (c.idnumber && c.idnumber.toLowerCase().includes(lower))
    );
  }, [rawCompetencies, search]);

  // Paginación local
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const extraFilters = (
    <Select
      value={frameworkId}
      onChange={(e) => { setFrameworkId(e.target.value); setPage(0); }}
      className="w-full sm:w-64"
      disabled={loadingFrameworks}
    >
      <option value="0">{I18N.reports.competency.strings.allFrameworks}</option>
      {frameworks.map((fw) => (
        <option key={fw.id} value={fw.id}>
          {fw.shortname}
        </option>
      ))}
    </Select>
  );

  return (
    <BaseReportModal
      open={open}
      onClose={onClose}
      search={search}
      setSearch={(val) => { setSearch(val); setPage(0); }}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      loading={loadingAll || loadingFrameworks}
      data={pageData}
      extraFilters={extraFilters}
      {...REPORT_CONFIGS.competency}
    />
  );
};
