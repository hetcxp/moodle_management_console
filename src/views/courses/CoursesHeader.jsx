import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/FilterBar';
import { KpiGrid } from '../../components/KpiGrid';
import { Plus, Upload, Layers, Users, Activity, FolderInput } from 'lucide-react';

export function CoursesHeader({
  totalCount, kpis, loading,
  search, onSearchChange,
  categoryFilter, onCategoryChange,
  visibilityFilter, onVisibilityChange,
  emptyOnly, onEmptyOnlyChange,
  categoriesList,
  hasCreateCourse,
  onRefresh, onExport, onCreate, onImportCsv,
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Gestión de Cursos</h1>
            <Badge variant="secondary">{totalCount} {totalCount === 1 ? 'curso' : 'cursos'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Administra la visibilidad, organización y métricas de finalización de cursos.
          </p>
        </div>
      </div>

      {kpis && (
        <KpiGrid
          loading={loading}
          items={[
            { title: 'Total Cursos', value: kpis.total_courses, icon: Layers, badgeColor: 'bg-primary/10 text-primary' },
            { title: 'Alumnos Enrolados', value: kpis.total_enrolled, icon: Users, badgeColor: 'bg-emerald-500/10 text-emerald-500' },
            { title: 'Progreso Promedio', value: `${kpis.avg_progress}%`, icon: Activity, badgeColor: 'bg-blue-500/10 text-blue-500' },
            { title: 'Cursos Vacíos', value: kpis.empty_courses, icon: FolderInput, badgeColor: 'bg-amber-500/10 text-amber-500' }
          ]}
        />
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => { onSearchChange(val); }}
        searchPlaceholder="Buscar por nombre o código de curso..."
        onRefresh={onRefresh}
        loading={loading}
        onExportCsv={onExport}
        primaryAction={hasCreateCourse ? { label: 'Crear Curso', onClick: onCreate, icon: <Plus className="h-4 w-4" /> } : null}
        secondaryAction={hasCreateCourse ? { label: 'Importar CSV', onClick: onImportCsv, icon: <Upload className="h-4 w-4" /> } : null}
        filters={[
          {
            id: 'category',
            value: categoryFilter,
            onChange: onCategoryChange,
            options: [
              { label: 'Todas las Categorías', value: '0' },
              ...categoriesList.map((c) => ({ label: c.name, value: String(c.id) }))
            ]
          },
          {
            id: 'visibility',
            value: visibilityFilter,
            onChange: onVisibilityChange,
            options: [
              { label: 'Cualquier Estado', value: '-1' },
              { label: 'Solo Visibles', value: '1' },
              { label: 'Solo Ocultos', value: '0' }
            ]
          },
          {
            id: 'empty_only',
            value: emptyOnly ? '1' : '0',
            onChange: onEmptyOnlyChange,
            options: [
              { label: 'Todos los cursos', value: '0' },
              { label: 'Solo cursos vacíos', value: '1' }
            ]
          }
        ]}
      />
    </>
  );
}
