import React from 'react';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, XCircle, FileText, Download } from 'lucide-react';
import { formatDate as formatAppDate } from '../../lib/utils';

const ACTIVITY_TYPE_NAMES = {
  assign: 'Tarea',
  quiz: 'Cuestionario',
  forum: 'Foro',
  scorm: 'Paquete SCORM',
  page: 'Página',
  resource: 'Archivo',
  url: 'URL',
  folder: 'Carpeta',
  label: 'Etiqueta',
  book: 'Libro',
  lesson: 'Lección',
  feedback: 'Retroalimentación',
  choice: 'Consulta',
  glossary: 'Glosario',
};

export function formatActivityName(modname) {
  return ACTIVITY_TYPE_NAMES[modname] || modname;
}

export function getCompletionStatusText(status) {
  if (status === 1 || status === 2) return 'Completado';
  if (status === 3) return 'Fallado';
  return 'Incompleto';
}

function formatActivityDate(timestamp) {
  if (!timestamp) return '-';
  return formatAppDate(timestamp);
}

/**
 * Sección cohesiva de actividades y exportación CSV para CourseUserDetailView.
 */
export function CourseUserActivitiesSection({
  activities = [],
  sortKey = '',
  sortDir = 'ASC',
  onSortChange,
  onExportActivities,
}) {
  const activitiesCols = [
    {
      header: 'Actividad',
      sortKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground">{formatActivityName(row.modname)}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Estado de Finalización',
      sortKey: 'completionstatus',
      cell: (row) => {
        let icon = <XCircle className="h-4 w-4 text-muted-foreground" />;
        let color = 'text-muted-foreground';
        const text = getCompletionStatusText(row.completionstatus);

        if (row.completionstatus === 1 || row.completionstatus === 2) {
          icon = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
          color = 'text-emerald-600';
        } else if (row.completionstatus === 3) {
          icon = <XCircle className="h-4 w-4 text-rose-500" />;
          color = 'text-rose-600';
        }

        return (
          <div className={`flex items-center gap-2 ${color} text-sm font-medium`}>
            {icon} {text}
          </div>
        );
      },
    },
    {
      header: 'Fecha de Finalización',
      sortKey: 'timecompleted',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatActivityDate(row.timecompleted)}
        </span>
      ),
    },
    {
      header: 'Calificación',
      sortKey: 'grade',
      cell: (row) => (
        <span className="font-medium text-foreground">
          {row.grade !== '' ? row.grade : '-'}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">Actividades del Curso</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportActivities}
          disabled={activities.length === 0}
          className="gap-1.5"
          title="Exportar a CSV"
        >
          <Download className="h-4 w-4" />
          <span>Exportar CSV</span>
        </Button>
      </div>

      <DataTable
        columns={activitiesCols}
        data={activities}
        totalCount={activities.length}
        sort={sortKey}
        dir={sortDir}
        onSortChange={onSortChange}
        selectable={false}
      />
    </>
  );
}
