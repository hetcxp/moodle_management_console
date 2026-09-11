import React, { useState, useMemo } from 'react';
import { Award, BookOpen, FileText, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { exportToCsv } from '../../components/CsvExporter';

export const UserCompetenciesTab = ({
  competencies = [],
  loading = false,
  userId,
  userFullname,
  onNavigateToDetail
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('-1');
  const [selectedEvidenceComp, setSelectedEvidenceComp] = useState(null);

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
      return true;
    });
  }, [competencies, search, statusFilter]);

  const handleExport = () => {
    if (!filteredCompetencies || filteredCompetencies.length === 0) return;
    const cols = [
      { label: 'ID', accessor: 'id' },
      { label: 'Competencia', accessor: 'shortname' },
      { label: 'Código (ID Number)', accessor: 'idnumber' },
      { label: 'Marco', accessor: 'frameworkname' },
      { label: 'Estado', accessor: 'statusname' },
      { label: 'Proficiencia', accessor: row => row.proficiency === 1 ? 'Competente' : 'No competente' },
      { label: 'Calificación', accessor: 'gradename' },
      { label: 'Cursos Vinculados', accessor: row => (row.courses || []).map(c => c.shortname).join(', ') },
      { label: 'Total Evidencias', accessor: 'evidences_count' }
    ];
    exportToCsv(`usuario_${userId}_competencias`, filteredCompetencies, cols);
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
      header: 'Cursos Vinculados',
      cell: (row) => {
        const linkedCourses = row.courses || [];
        if (linkedCourses.length === 0) {
          return <span className="text-xs text-muted-foreground italic">Sin cursos vinculados</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {linkedCourses.map((c) => (
              <span
                key={c.id}
                onClick={(e) => {
                  if (onNavigateToDetail) {
                    e.stopPropagation();
                    if (c.is_enrolled && userId) {
                      onNavigateToDetail('course_user', { courseId: c.id, userId });
                    } else {
                      onNavigateToDetail('course', c.id);
                    }
                  }
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
              </span>
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
    }
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por competencia o marco..."
        loading={loading}
        onExportCsv={filteredCompetencies.length > 0 ? handleExport : null}
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
          }
        ]}
      />

      <DataTable
        columns={columns}
        data={filteredCompetencies}
        loading={loading}
        totalCount={filteredCompetencies.length}
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
    </div>
  );
};
