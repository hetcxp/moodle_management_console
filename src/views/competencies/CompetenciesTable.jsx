import React from 'react';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PermissionGate } from '../../components/PermissionGate';
import { Award, Layers, Edit, Trash2, Eye, EyeOff, Sliders } from 'lucide-react';

export function CompetenciesTable({
  frameworks, loading, totalCount, page, perPage,
  sort, dir, selectedIds, setSelectedIds,
  hasManageCompetencies,
  onPageChange, onSortChange, onFilterChange, onRowClick,
  onToggleVisibility, onOpenEdit, onOpenDelete,
}) {
  const columns = [
    {
      header: 'Marco de Competencias',
      sortKey: 'shortname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold dark:bg-amber-500/20 dark:text-amber-400">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.shortname}</div>
            {row.idnumber ? (
              <div className="text-xs font-mono text-muted-foreground">Código: {row.idnumber}</div>
            ) : (
              <div className="text-xs text-muted-foreground italic">Sin código ID</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Escala Asignada',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-foreground">
          <Sliders className="h-3.5 w-3.5 text-primary/70" />
          <span className="font-medium">{row.scalename || 'Estándar'}</span>
        </div>
      ),
    },
    {
      header: 'Competencias (Nivel 1)',
      sortKey: 'competenciescount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Layers className="h-3.5 w-3.5 text-blue-500" />
          <span>{row.competenciescount} competencias</span>
        </div>
      ),
    },
    {
      header: 'Estado',
      sortKey: 'visible',
      cell: (row) => (
        <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
          {row.visible === 1 ? 'Visible' : 'Oculto'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <PermissionGate capability="can_manage_competencies">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleVisibility(row)}
              title={row.visible === 1 ? 'Ocultar marco' : 'Hacer visible'}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {row.visible === 1 ? (
                <EyeOff className="h-4 w-4 text-amber-600" />
              ) : (
                <Eye className="h-4 w-4 text-emerald-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenEdit(row)}
              title="Editar marco"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenDelete([row.id])}
              title="Eliminar marco"
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  const bulkActions = [
    ...(hasManageCompetencies
      ? [
          {
            label: 'Eliminar Seleccionados',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            onClick: onOpenDelete,
            variant: 'destructive',
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={frameworks}
      loading={loading}
      totalCount={totalCount}
      page={page}
      perPage={perPage}
      onPageChange={onPageChange}
      sort={sort}
      dir={dir}
      onSortChange={onSortChange}
      onFilterChange={onFilterChange}
      onRowClick={onRowClick}
      selectable={true}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      bulkActions={bulkActions}
    />
  );
}
