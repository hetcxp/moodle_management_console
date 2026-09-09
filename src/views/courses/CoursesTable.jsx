import React from 'react';
import { Link } from 'wouter';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PermissionGate } from '../../components/PermissionGate';
import { Eye, EyeOff, FolderInput, Trash2, ExternalLink, Users, Layers, Award } from 'lucide-react';

export function CoursesTable({
  courses, loading, totalCount, page, perPage,
  sort, dir,
  selectedIds, setSelectedIds,
  hasUpdateCourse, hasManageCategory, hasDeleteCourse,
  onPageChange, onSortChange, onFilterChange, onRowClick,
  onViewInMoodle, onBulkHide, onBulkShow, onOpenMoveModal, onOpenDeleteModal,
}) {
  const columns = [
    {
      header: 'Curso',
      sortKey: 'fullname',
      className: 'font-medium',
      cell: (row) => (
        <div className="space-y-1">
          <Link 
            href={`/courses/${row.id}`}
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
      )
    },
    {
      header: 'Categoría',
      sortKey: 'categoryname',
      cell: (row) => (
        <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
          {row.categoryname || 'Sin categoría'}
        </span>
      )
    },
    {
      header: 'Inscritos',
      sortKey: 'enrolledcount',
      cell: (row) => (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <Users className="h-3.5 w-3.5 text-muted-foreground" /><span>{row.enrolledcount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="h-3 w-3" /><span>{row.cohortscount || 0}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Competencias',
      sortKey: 'competenciescount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          <Award className={`h-3.5 w-3.5 ${row.competenciescount > 0 ? 'text-amber-500' : 'text-muted-foreground/60'}`} />
          <span className={row.competenciescount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
            {row.competenciescount || 0}
          </span>
        </div>
      )
    },
    {
      header: 'Progreso Promedio',
      sortKey: 'progress',
      className: 'min-w-[150px]',
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span>{row.progress_percent}%</span>
            <span className="text-muted-foreground">{row.completedcount}/{row.enrolledcount}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${row.progress_percent === 100 ? 'bg-emerald-500' : row.progress_percent > 50 ? 'bg-primary' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(row.progress_percent, 100)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onViewInMoodle(row.id)} className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer" title="Ver en Moodle">
            <ExternalLink className="h-4 w-4" />
          </button>
          <PermissionGate capability="can_update_courses">
            {row.visible === 1 ? (
              <Button variant="ghost" size="icon" title="Ocultar curso" onClick={() => onBulkHide([row.id])} className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                <EyeOff className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" title="Hacer visible" onClick={() => onBulkShow([row.id])} className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </PermissionGate>
          <PermissionGate capability="can_manage_categories">
            <Button variant="ghost" size="icon" title="Mover de categoría" onClick={() => onOpenMoveModal([row.id])} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <FolderInput className="h-4 w-4" />
            </Button>
          </PermissionGate>
          <PermissionGate capability="can_delete_courses">
            <Button variant="ghost" size="icon" title="Eliminar curso" onClick={() => onOpenDeleteModal([row.id])} className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30">
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      )
    }
  ];

  const bulkActions = [
    ...(hasUpdateCourse && selectedIds.length > 0 && selectedIds.every(id => courses.find(c => c.id === id)?.visible === 0) ? [{ label: 'Hacer Visibles', icon: <Eye className="h-3.5 w-3.5" />, onClick: onBulkShow, variant: 'success' }] : []),
    ...(hasUpdateCourse && selectedIds.length > 0 && selectedIds.every(id => courses.find(c => c.id === id)?.visible === 1) ? [{ label: 'Ocultar', icon: <EyeOff className="h-3.5 w-3.5" />, onClick: onBulkHide, variant: 'warning' }] : []),
    ...(hasManageCategory ? [{ label: 'Mover Categoría', icon: <FolderInput className="h-3.5 w-3.5" />, onClick: onOpenMoveModal, variant: 'secondary' }] : []),
    ...(hasDeleteCourse ? [{ label: 'Eliminar Cursos', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: onOpenDeleteModal, variant: 'destructive' }] : [])
  ];

  return (
    <DataTable
      columns={columns}
      data={courses}
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
