import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { KpiGrid } from '../../components/KpiGrid';
import { FilterBar } from '../../components/FilterBar';
import { FolderTree, BookOpen, Eye, EyeOff, Plus } from 'lucide-react';

export const CategoriesHeader = ({
  totalCategories,
  visibleCategories,
  hiddenCategories,
  totalCourses,
  loading,
  loadData,
  search,
  onSearchChange,
  visibilityFilter,
  onVisibilityChange,
  hasManageCategory,
  onOpenCreate,
  onOpenExport
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Categorías de Cursos</h1>
            <Badge variant="secondary">
              {totalCategories} {totalCategories === 1 ? 'categoría' : 'categorías'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Estructura organizativa y ramas de contenidos de Moodle.
          </p>
        </div>
      </div>

      <KpiGrid
        loading={loading}
        items={[
          {
            title: 'Total Categorías',
            value: totalCategories,
            icon: FolderTree,
            color: 'from-primary to-indigo-600',
            badgeColor: 'bg-primary/10 text-primary',
            details: [
              { label: 'Visibles', value: visibleCategories, textClass: 'text-emerald-600' },
              { label: 'Ocultas', value: hiddenCategories, textClass: 'text-amber-600' }
            ]
          },
          {
            title: 'Cursos Asignados',
            value: totalCourses,
            icon: BookOpen,
            color: 'from-blue-500 to-sky-600',
            badgeColor: 'bg-blue-500/10 text-blue-500'
          },
          {
            title: 'Visibles',
            value: visibleCategories,
            icon: Eye,
            color: 'from-emerald-500 to-teal-600',
            badgeColor: 'bg-emerald-500/10 text-emerald-500'
          },
          {
            title: 'Ocultas',
            value: hiddenCategories,
            icon: EyeOff,
            color: 'from-amber-500 to-orange-600',
            badgeColor: 'bg-amber-500/10 text-amber-500'
          }
        ]}
      />

      <FilterBar
        onRefresh={loadData}
        loading={loading}
        searchPlaceholder="Buscar categoría..."
        searchValue={search}
        onSearchChange={onSearchChange}
        filters={[
          {
            id: 'visibility',
            label: 'Estado',
            value: visibilityFilter,
            onChange: onVisibilityChange,
            options: [
              { label: 'Todos', value: '-1' },
              { label: 'Visibles', value: '1' },
              { label: 'Ocultos', value: '0' }
            ]
          }
        ]}
        primaryAction={
          hasManageCategory
            ? {
                label: 'Nueva Categoría',
                onClick: onOpenCreate,
                icon: <Plus className="h-4 w-4" />
              }
            : null
        }
        onExportCsv={onOpenExport}
      />
    </div>
  );
};
