import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/FilterBar';
import { KpiGrid } from '../../components/KpiGrid';
import { Plus, Milestone, CheckCircle2, EyeOff, BookOpen } from 'lucide-react';

export function LearningPathsHeader({
  totalCount = 0,
  loading = false,
  search = '',
  onSearchChange,
  onRefresh,
  onCreate,
  hasCreatePerm = true,
  kpis,
}) {
  const defaultKpis = kpis || [
    { title: 'Total Rutas', value: totalCount, icon: Milestone, badgeColor: 'bg-primary/10 text-primary' },
    { title: 'Visibles', value: kpis?.visible_paths ?? '-', icon: CheckCircle2, badgeColor: 'bg-emerald-500/10 text-emerald-500' },
    { title: 'Ocultas', value: kpis?.hidden_paths ?? '-', icon: EyeOff, badgeColor: 'bg-amber-500/10 text-amber-500' },
    { title: 'Subcursos Promedio', value: kpis?.avg_subcourses ?? '-', icon: BookOpen, badgeColor: 'bg-blue-500/10 text-blue-500' },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Rutas de Aprendizaje</h1>
            <Badge variant="secondary">{totalCount} {totalCount === 1 ? 'ruta' : 'rutas'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Diseña secuencias formativas modulares encadenando cursos del catálogo con sincronización automática.
          </p>
        </div>
      </div>

      <KpiGrid
        loading={loading}
        items={defaultKpis}
      />

      <FilterBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre o código de ruta..."
        onRefresh={onRefresh}
        loading={loading}
        primaryAction={hasCreatePerm ? {
          label: 'Nueva Ruta',
          onClick: onCreate,
          icon: <Plus className="h-4 w-4" />
        } : null}
      />
    </>
  );
}
