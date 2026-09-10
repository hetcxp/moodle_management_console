import React from 'react';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PermissionGate } from '../../components/PermissionGate';
import { Layers, Users, BookOpen, Edit, Trash2 } from 'lucide-react';

export const CohortsTable = ({
  cohorts,
  loading,
  totalCount,
  page,
  perPage,
  onPageChange,
  sort,
  dir,
  onSortChange,
  selectedIds,
  onSelectionChange,
  hasManageCohorts,
  onRowClick,
  onOpenEdit,
  onOpenDelete
}) => {
  const columns = [
    {
      header: 'Cohorte',
      sortKey: 'name',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.name}</div>
            {row.idnumber && (
              <div className="text-xs font-mono text-muted-foreground">
                Código: {row.idnumber}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Miembros Asignados',
      sortKey: 'memberscount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {row.memberscount > 0 ? (
            <>
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <span>{row.memberscount} miembros</span>
            </>
          ) : (
            <Badge variant="warning" className="text-[10px]">
              Vacía
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Cursos Sincronizados',
      sortKey: 'coursescount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-blue-500" />
          <span>{row.coursescount}</span>
        </div>
      )
    },
    {
      header: 'Descripción',
      cell: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-md">
          {row.description || 'Sin descripción'}
        </span>
      )
    },
    {
      header: 'Progreso Promedio',
      sortKey: 'progress',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px] max-w-[120px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress || 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-8 text-right">
            {row.progress || 0}%
          </span>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <PermissionGate capability="can_manage_cohorts">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenEdit(row)}
              title="Editar cohorte"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenDelete([row.id])}
              title="Eliminar cohorte"
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && hasManageCohorts && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg animate-fadeIn">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {selectedIds.length} cohorte(s) seleccionada(s)
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenDelete(selectedIds)}
              className="h-8 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar seleccionadas
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={cohorts}
        loading={loading}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        onPageChange={onPageChange}
        onRowClick={onRowClick}
        sort={sort}
        dir={dir}
        onSortChange={onSortChange}
        selectable={hasManageCohorts}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
};
