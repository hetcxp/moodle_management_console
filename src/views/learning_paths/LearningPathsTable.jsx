import React from 'react';
import { Link } from 'wouter';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { BookOpen, Users, Layers, Trash2, Calendar, Eye, EyeOff } from 'lucide-react';
import { formatDateOnly } from '../../lib/utils';

export function LearningPathsTable({
  paths = [],
  loading = false,
  totalCount = 0,
  page = 0,
  perPage = 20,
  onPageChange,
  onRowClick,
  onToggleVisibility,
  onDelete,
}) {
  const columns = [
    {
      header: 'Ruta de Aprendizaje',
      sortKey: 'fullname',
      className: 'font-medium',
      cell: (row) => (
        <div className="space-y-1">
          <Link
            href={`/learning-paths/${row.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-foreground hover:text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:underline block"
          >
            {row.fullname}
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
              {row.visible === 1 ? 'Visible' : 'Oculto'}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">{row.shortname}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Subcursos',
      sortKey: 'subcourse_count',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <span>{row.subcourse_count}</span>
        </div>
      ),
    },
    {
      header: 'Estudiantes',
      sortKey: 'enrolled_count',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.enrolled_count}</span>
        </div>
      ),
    },
    {
      header: 'Cohortes',
      sortKey: 'cohort_count',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Layers className="h-3 w-3" />
          <span>{row.cohort_count}</span>
        </div>
      ),
    },
    {
      header: 'Inicio',
      sortKey: 'startdate',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDateOnly(row.startdate)}</span>
        </div>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => {
        const hasStudents = row.enrolled_count > 0;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {onToggleVisibility && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title={row.visible === 1 ? 'Ocultar ruta' : 'Mostrar ruta'}
                onClick={() => onToggleVisibility(row)}
              >
                {row.visible === 1 ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${hasStudents ? 'opacity-40 cursor-not-allowed' : 'text-destructive hover:text-destructive'}`}
              disabled={hasStudents}
              title={hasStudents ? 'No se puede eliminar: hay estudiantes matriculados' : 'Eliminar ruta'}
              onClick={() => {
                if (!hasStudents && onDelete) {
                  onDelete(row);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={paths}
      loading={loading}
      totalCount={totalCount}
      page={page}
      perPage={perPage}
      onPageChange={onPageChange}
      onRowClick={onRowClick}
      emptyMessage="No se encontraron rutas de aprendizaje"
    />
  );
}
