import React from 'react';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PermissionGate } from '../../components/PermissionGate';
import { FolderTree, BookOpen, Eye, EyeOff, Edit, Trash2 } from 'lucide-react';

export const CategoriesTable = ({
  paginatedData,
  flatCategories,
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
  hasManageCategory,
  onRowClick,
  onToggleVisibility,
  onOpenEdit,
  onOpenDelete,
  onBulkAction
}) => {
  const columns = [
    {
      header: 'Categoría',
      sortKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderTree className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground hover:text-primary transition-colors">{row.name}</div>
            {row.parentname && (
              <div className="text-xs text-muted-foreground">
                Subcategoría de: <span className="font-medium text-foreground">{row.parentname}</span>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Cursos',
      sortKey: 'coursecount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.coursecount} curso(s)</span>
        </div>
      )
    },
    {
      header: 'Estado',
      sortKey: 'visible',
      cell: (row) => (
        <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
          {row.visible === 1 ? 'Visible' : 'Oculto'}
        </Badge>
      )
    },
    {
      header: 'Acciones',
      className: 'text-center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <PermissionGate capability="can_manage_categories">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(row.id, row.visible === 1);
              }}
              title={row.visible === 1 ? 'Ocultar categoría' : 'Hacer visible'}
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
              onClick={(e) => {
                e.stopPropagation();
                onOpenEdit(row);
              }}
              title="Editar categoría"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDelete(row);
              }}
              disabled={row.coursecount > 0}
              title={row.coursecount > 0 ? 'No se puede eliminar porque contiene cursos' : 'Eliminar categoría'}
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30"
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
      {selectedIds.length > 0 && hasManageCategory && (() => {
        const selectedCategories = flatCategories.filter((c) => selectedIds.includes(c.id));
        const isAllVisible = selectedCategories.every((c) => c.visible === 1);
        const isAllHidden = selectedCategories.every((c) => c.visible === 0);

        return (
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg animate-fadeIn">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
              {selectedIds.length} categoría(s) seleccionada(s)
            </span>
            <div className="ml-auto flex items-center gap-2">
              {isAllVisible && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBulkAction('hide', selectedIds)}
                  className="h-8 gap-1"
                >
                  <EyeOff className="h-3.5 w-3.5" /> Ocultar
                </Button>
              )}
              {isAllHidden && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBulkAction('show', selectedIds)}
                  className="h-8 gap-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Mostrar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkAction('delete', selectedIds)}
                className="h-8 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            </div>
          </div>
        );
      })()}

      <DataTable
        columns={columns}
        data={paginatedData}
        loading={loading}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        onPageChange={onPageChange}
        onRowClick={onRowClick}
        sort={sort}
        dir={dir}
        onSortChange={onSortChange}
        selectable={hasManageCategory}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
};
