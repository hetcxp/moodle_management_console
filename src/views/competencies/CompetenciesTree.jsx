import React from 'react';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PermissionGate } from '../../components/PermissionGate';
import {
  Layers,
  Edit,
  Trash2,
  Sparkles,
  BookOpen,
  Clock,
  CornerDownRight,
} from 'lucide-react';

export function CompetenciesTree({
  competencies,
  loading,
  totalCount,
  page,
  perPage,
  sort,
  dir,
  onPageChange,
  onSortChange,
  onOpenCompetencyDetail,
  onOpenCreateSubcomp,
  onOpenReviewsForCompetency,
  onOpenEdit,
  onOpenDelete,
}) {
  const columns = [
    {
      header: 'Competencia',
      sortKey: 'shortname',
      cell: (row) => {
        const hasRule = row.ruletype === 'core_competency\\competency_rule_all_children';
        const isSubcomp = (row.parentid || 0) > 0;
        const level = row.level || (isSubcomp ? 2 : 1);
        const indentPadding = isSubcomp ? Math.min((level - 1) * 24, 48) : 0;

        return (
          <div
            className="flex items-center gap-3 cursor-pointer group"
            style={{ paddingLeft: `${indentPadding}px` }}
            onClick={() => onOpenCompetencyDetail(row)}
          >
            {isSubcomp ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 font-bold dark:bg-indigo-500/20 dark:text-indigo-400 shrink-0">
                <CornerDownRight className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 font-bold group-hover:bg-blue-500 group-hover:text-white transition-colors dark:bg-blue-500/20 dark:text-blue-400 shrink-0">
                <Layers className="h-4 w-4" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {row.shortname}
                </span>

                {hasRule && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                    Auto-completar
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                <div>
                  {row.idnumber ? (
                    <span className="font-mono">Código: {row.idnumber}</span>
                  ) : (
                    <span className="italic">Sin código ID</span>
                  )}
                </div>

                {isSubcomp && row.parentname && (
                  <div className="text-indigo-600 dark:text-indigo-400 font-medium">
                    Hija de: {row.parentname}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Subcompetencias',
      sortKey: 'childrencount',
      cell: (row) => {
        const isSubcomp = (row.parentid || 0) > 0;
        if (isSubcomp) {
          return (
            <span className="text-xs text-muted-foreground italic">
              —
            </span>
          );
        }
        const count = row.childrencount || 0;
        return (
          <button
            type="button"
            onClick={() => onOpenCompetencyDetail(row)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              count > 0
                ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title="Ver subcompetencias hijas"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{count} subcompetencia(s)</span>
          </button>
        );
      },
    },
    {
      header: 'Cursos & Actividades',
      sortKey: 'coursescount',
      cell: (row) => (
        <button
          type="button"
          onClick={() => onOpenCompetencyDetail(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Ver cursos, reglas de finalización y actividades clave asociadas"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>{row.coursescount || 0} curso(s)</span>
        </button>
      ),
    },
    {
      header: 'Descripción',
      cell: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-md">
          {row.description || 'Sin descripción'}
        </span>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => {
        const isSubcomp = (row.parentid || 0) > 0;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <PermissionGate capability="can_manage_competencies">
              {!isSubcomp && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenCreateSubcomp(row)}
                  title="Crear subcompetencia hija para esta competencia"
                  className="h-8 w-8 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-500/10"
                >
                  <Layers className="h-4 w-4" />
                </Button>
              )}
            </PermissionGate>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenCompetencyDetail(row)}
              title="Gestionar cursos, subcompetencias y reglas"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenReviewsForCompetency(row)}
              title={row.pendingreviewscount > 0 ? `Ver ${row.pendingreviewscount} revisión(es) pendiente(s)` : 'Ver revisiones pendientes'}
              className={`h-8 w-8 relative ${row.pendingreviewscount > 0 ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Clock className="h-4 w-4" />
              {row.pendingreviewscount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow-sm">
                  {row.pendingreviewscount}
                </span>
              )}
            </Button>
            <PermissionGate capability="can_manage_competencies">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenEdit(row)}
                title="Editar competencia"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenDelete(row)}
                title="Eliminar competencia"
                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGate>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={competencies}
      loading={loading}
      totalCount={totalCount}
      page={page}
      perPage={perPage}
      onPageChange={onPageChange}
      sort={sort}
      dir={dir}
      onSortChange={onSortChange}
      selectable={false}
    />
  );
}
