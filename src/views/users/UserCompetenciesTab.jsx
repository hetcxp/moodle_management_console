import React, { useState, useMemo } from 'react';
import { Award, BookOpen, FileText, CheckCircle2, Clock, AlertCircle, ExternalLink, PlusCircle, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AssignCompetencyModal } from '../../components/ui/AssignCompetencyModal';
import { exportToCsv } from '../../components/CsvExporter';

export const UserCompetenciesTab = ({
  competencies = [],
  userCourses = [],
  loading = false,
  userId,
  userFullname,
  onNavigateToDetail,
  onAssignCompetency = null,
  onRemoveCompetency = null,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('-1');
  const [sourceFilter, setSourceFilter] = useState('-1');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('ASC');
  const [selectedEvidenceComp, setSelectedEvidenceComp] = useState(null);
  const [selectedCourseModal, setSelectedCourseModal] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [compToRemove, setCompToRemove] = useState(null);
  const [removingComp, setRemovingComp] = useState(false);

  const handleConfirmAssign = async (compId) => {
    if (!onAssignCompetency) return;
    setAssigning(true);
    try {
      await onAssignCompetency(compId);
      setAssignModalOpen(false);
    } finally {
      setAssigning(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!onRemoveCompetency || !compToRemove) return;
    setRemovingComp(true);
    try {
      await onRemoveCompetency(compToRemove.id);
      setCompToRemove(null);
    } finally {
      setRemovingComp(false);
    }
  };

  const filteredCompetencies = useMemo(() => {
    if (!competencies) return [];
    return competencies.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (c.shortname || '').toLowerCase().includes(q);
        const matchesIdNumber = (c.idnumber || '').toLowerCase().includes(q);
        const matchesFramework = (c.frameworkname || '').toLowerCase().includes(q);
        if (!matchesName && !matchesIdNumber && !matchesFramework) return false;
      }
      if (statusFilter === 'proficient') {
        if (c.proficiency !== 1) return false;
      } else if (statusFilter === 'in_progress') {
        if (c.proficiency === 1 || c.status === 1 || c.status === 2) return false;
      } else if (statusFilter === 'in_review') {
        if (c.status !== 1 && c.status !== 2) return false;
      }
      if (sourceFilter !== '-1') {
        if (c.source !== sourceFilter) return false;
      }
      return true;
    });
  }, [competencies, search, statusFilter, sourceFilter]);

  const sortedCompetencies = useMemo(() => {
    if (!sortKey) return filteredCompetencies;
    return [...filteredCompetencies].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === 'source') {
        const sourceLabels = { adhoc: 'Plan ad-hoc', course: 'Matriculación', usercomp: 'Evaluación directa' };
        aVal = sourceLabels[a.source] || a.source || '';
        bVal = sourceLabels[b.source] || b.source || '';
      }

      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (aVal === bVal) {
        return (a.shortname || '').localeCompare(b.shortname || '');
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'ASC' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === 'ASC' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredCompetencies, sortKey, sortDir]);

  const handleExport = () => {
    if (!sortedCompetencies || sortedCompetencies.length === 0) return;
    const cols = [
      { label: 'ID', accessor: 'id' },
      { label: 'Competencia', accessor: 'shortname' },
      { label: 'Código (ID Number)', accessor: 'idnumber' },
      { label: 'Marco', accessor: 'frameworkname' },
      { label: 'Origen', accessor: 'source' },
      { label: 'Estado', accessor: 'statusname' },
      { label: 'Proficiencia', accessor: row => row.proficiency === 1 ? 'Competente' : 'No competente' },
      { label: 'Calificación', accessor: 'gradename' },
      { label: 'Cursos Vinculados', accessor: row => (row.courses || []).map(c => c.shortname).join(', ') },
      { label: 'Total Evidencias', accessor: 'evidences_count' }
    ];
    exportToCsv(`usuario_${userId}_competencias`, sortedCompetencies, cols);
  };

  const columns = [
    {
      header: 'Competencia',
      sortKey: 'shortname',
      cell: (row) => (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shrink-0 mt-0.5">
            <Award className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{row.shortname}</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {row.idnumber && (
                <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                  {row.idnumber}
                </span>
              )}
              <span className="text-xs text-muted-foreground truncate">{row.frameworkname}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Origen',
      sortKey: 'source',
      accessor: 'source',
      filterType: 'select',
      filterOptions: [
        { label: 'Plan ad-hoc', value: 'adhoc' },
        { label: 'Matriculación', value: 'course' },
        { label: 'Evaluación directa', value: 'usercomp' },
      ],
      cell: (row) => {
        if (row.source === 'adhoc') {
          return (
            <Badge variant="secondary" className="text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
              Plan ad-hoc
            </Badge>
          );
        }
        if (row.source === 'course') {
          return (
            <Badge variant="secondary" className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
              Matriculación
            </Badge>
          );
        }
        if (row.source === 'usercomp') {
          return (
            <Badge variant="secondary" className="text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20">
              Evaluación directa
            </Badge>
          );
        }
        return <span className="text-xs text-muted-foreground italic">Sin definir</span>;
      }
    },
    {
      header: 'Cursos Vinculados',
      cell: (row) => {
        const linkedCourses = row.courses || [];
        if (linkedCourses.length === 0) {
          return <span className="text-xs text-muted-foreground italic">Sin cursos vinculados</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {linkedCourses.map((c) => (
              <button
                type="button"
                key={c.id}
                aria-label={`Ver curso ${c.fullname}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const matchedUserCourse = userCourses?.find(uc => Number(uc.id) === Number(c.id));
                  const isEnrolled = Boolean(c.is_enrolled || matchedUserCourse);
                  const progress = c.progress !== undefined
                    ? c.progress
                    : (matchedUserCourse?.progress ?? 0);
                  const enrolStatus = matchedUserCourse?.enrolstatus ?? (isEnrolled ? 0 : null);
                  const enrolMethod = matchedUserCourse?.enrolmethod || matchedUserCourse?.enrolments?.[0]?.method;

                  setSelectedCourseModal({
                    id: c.id,
                    fullname: c.fullname,
                    shortname: c.shortname,
                    is_enrolled: isEnrolled ? 1 : 0,
                    progress,
                    enrolstatus: enrolStatus,
                    enrolmethod: enrolMethod,
                    competencyName: row.shortname,
                  });
                }}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-colors ${
                  c.is_enrolled
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                    : 'bg-muted/70 text-muted-foreground border-border hover:bg-muted'
                }`}
                title={c.fullname + (c.is_enrolled ? ' (Matriculado)' : ' (No matriculado)')}
              >
                <BookOpen className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[140px]">{c.shortname || c.fullname}</span>
                {c.is_enrolled ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Matriculado" />
                ) : null}
              </button>
            ))}
          </div>
        );
      }
    },
    {
      header: 'Estado / Calificación',
      sortKey: 'proficiency',
      cell: (row) => {
        let badgeVariant = 'secondary';
        let icon = <Clock className="h-3 w-3 mr-1 inline" />;
        if (row.proficiency === 1) {
          badgeVariant = 'success';
          icon = <CheckCircle2 className="h-3 w-3 mr-1 inline" />;
        } else if (row.status === 1 || row.status === 2) {
          badgeVariant = 'warning';
          icon = <AlertCircle className="h-3 w-3 mr-1 inline" />;
        }

        return (
          <div className="space-y-1">
            <Badge variant={badgeVariant} className="text-xs font-semibold">
              {icon} {row.statusname}
            </Badge>
            {row.gradename && (
              <div className="text-xs text-muted-foreground">
                Nota: <span className="font-medium text-foreground">{row.gradename}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Evidencias',
      sortKey: 'evidences_count',
      className: 'text-right',
      cell: (row) => {
        const count = row.evidences_count || 0;
        return (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvidenceComp(row);
              }}
              className={`gap-1.5 text-xs h-8 ${
                count > 0
                  ? 'border-primary/30 text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Evidencias</span>
              {count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/20 text-primary">
                  {count}
                </span>
              )}
            </Button>
          </div>
        );
      }
    },
    ...(onRemoveCompetency ? [{
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => {
        if (row.source !== 'adhoc') return null;
        const isBlocked = Number(row.enrolled_in_linked_course) === 1;
        return (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={isBlocked || removingComp}
              title={isBlocked ? 'No se puede eliminar: el usuario está matriculado en al menos un curso vinculado a esta competencia.' : 'Eliminar competencia'}
              onClick={(e) => {
                e.stopPropagation();
                if (!isBlocked) {
                  setCompToRemove(row);
                }
              }}
              className={isBlocked ? 'opacity-50 cursor-not-allowed h-8 px-2 text-xs' : 'text-destructive hover:bg-destructive/10 border-destructive/20 h-8 px-2 text-xs'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      }
    }] : [])
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por competencia o marco..."
        loading={loading}
        onExportCsv={filteredCompetencies.length > 0 ? handleExport : null}
        primaryAction={onAssignCompetency ? {
          label: 'Asignar Competencia',
          icon: <PlusCircle className="h-4 w-4" />,
          onClick: () => setAssignModalOpen(true),
          disabled: assigning || loading,
        } : null}
        filters={[
          {
            id: 'status',
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Todos los estados', value: '-1' },
              { label: 'Solo Competente', value: 'proficient' },
              { label: 'En progreso', value: 'in_progress' },
              { label: 'En revisión', value: 'in_review' }
            ]
          },
          {
            id: 'source',
            label: 'Origen',
            value: sourceFilter,
            onChange: setSourceFilter,
            options: [
              { label: 'Todos los orígenes', value: '-1' },
              { label: 'Plan ad-hoc',        value: 'adhoc' },
              { label: 'Matriculación',      value: 'course' },
              { label: 'Evaluación directa', value: 'usercomp' },
            ]
          }
        ]}
      />

      <DataTable
        columns={columns}
        data={sortedCompetencies}
        loading={loading}
        totalCount={sortedCompetencies.length}
        sort={sortKey}
        dir={sortDir}
        onSortChange={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
        }}
        selectable={false}
        emptyMessage="No se encontraron competencias asignadas para este usuario."
      />

      {/* Modal de Evidencias */}
      <Dialog
        open={Boolean(selectedEvidenceComp)}
        onClose={() => setSelectedEvidenceComp(null)}
        title={`Evidencias: ${selectedEvidenceComp?.shortname || ''}`}
        description={`Evidencias registradas para ${userFullname || 'el usuario'} en esta competencia.`}
        footer={
          <Button variant="outline" onClick={() => setSelectedEvidenceComp(null)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
          {(!selectedEvidenceComp?.evidences || selectedEvidenceComp.evidences.length === 0) ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mx-auto mb-2.5">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Sin evidencias registradas
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Este usuario aún no cuenta con evidencias documentadas, evaluaciones de actividades o revisiones para esta competencia.
              </p>
            </div>
          ) : (
            selectedEvidenceComp.evidences.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    {ev.actionname}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {ev.timecreated_str || ''}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Registrado por: <span className="text-foreground font-medium">{ev.actionuserfullname}</span>
                </div>

                {ev.note && (
                  <div className="text-xs bg-background/80 p-2.5 rounded-lg border border-border/60 text-foreground">
                    {ev.note}
                  </div>
                )}

                {ev.descidentifier && !ev.note && (
                  <div className="text-xs text-muted-foreground italic">
                    {ev.descidentifier}
                  </div>
                )}

                {ev.url && (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
                  >
                    Ver recurso <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </Dialog>

      {/* Modal de Detalle de Curso Vinculado */}
      <Dialog
        open={Boolean(selectedCourseModal)}
        onClose={() => setSelectedCourseModal(null)}
        title="Curso Vinculado a la Competencia"
        description={
          selectedCourseModal?.competencyName
            ? `Competencia: ${selectedCourseModal.competencyName}`
            : 'Información y avance del estudiante en este curso.'
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setSelectedCourseModal(null)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                const course = selectedCourseModal;
                setSelectedCourseModal(null);
                if (onNavigateToDetail && course) {
                  if (course.is_enrolled && userId) {
                    onNavigateToDetail('course_user', { courseId: course.id, userId });
                  } else {
                    onNavigateToDetail('course', course.id);
                  }
                }
              }}
              className="gap-1.5"
            >
              <span>Ir al detalle del curso</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        {selectedCourseModal && (
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-border/80 bg-muted/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shrink-0 mt-0.5">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-base text-foreground leading-snug">
                  {selectedCourseModal.fullname}
                </h4>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {selectedCourseModal.shortname && (
                    <span className="text-xs text-muted-foreground font-mono bg-muted/80 px-2 py-0.5 rounded border border-border/40">
                      {selectedCourseModal.shortname}
                    </span>
                  )}
                  {selectedCourseModal.is_enrolled ? (
                    <>
                      <Badge variant="success" className="text-xs font-semibold">
                        Matriculado
                      </Badge>
                      {selectedCourseModal.enrolstatus === 1 ? (
                        <Badge variant="destructive" className="text-xs font-semibold">
                          Suspendido
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-semibold">
                          Activo
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-xs font-semibold text-muted-foreground">
                      No matriculado
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {selectedCourseModal.is_enrolled ? (
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Progreso del estudiante
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {selectedCourseModal.progress}%
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      selectedCourseModal.progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${selectedCourseModal.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedCourseModal.progress === 100
                    ? 'El usuario ha completado satisfactoriamente los requisitos y actividades de este curso.'
                    : `El usuario tiene un ${selectedCourseModal.progress}% de avance en las actividades evaluables del curso.`}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Usuario no matriculado</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  Este curso está vinculado a la competencia en el marco institucional, pero el usuario no tiene una matrícula activa en él.
                </p>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <AssignCompetencyModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSelect={handleConfirmAssign}
        assignedIds={(competencies || []).map((c) => c.id)}
        loading={assigning}
      />

      <ConfirmDialog
        open={Boolean(compToRemove)}
        onClose={() => setCompToRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Eliminar competencia"
        description={`¿Estás seguro de que deseas eliminar la competencia "${compToRemove?.shortname}" del plan personal de este usuario?`}
        confirmText="Eliminar"
        loading={removingComp}
        variant="destructive"
      />
    </div>
  );
};
