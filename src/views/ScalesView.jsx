import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  ChevronLeft,
  Sliders,
  Award,
  Layers,
  Lock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { KpiGrid } from '../components/KpiGrid';
import { FilterBar } from '../components/FilterBar';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useHelp } from '../context/HelpContext';
import { useScales, useScaleAction } from '../hooks/queries/useCompetencyQueries';
import { ScaleFormModal } from './competencies/ScaleFormModal';

export const ScalesView = ({ onBack, parentLabel = 'Competencias' }) => {
  const [, setLocation] = useLocation();
  const handleBack = onBack || (() => setLocation('/competencies'));

  const { addToast } = useToast();
  const { permissions } = useAuth();
  const { helpData } = useHelp();
  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const { data: scalesData, isLoading, isFetching, refetch } = useScales();
  const { mutateAsync: performScaleAction, isPending: deleteLoading } = useScaleAction();

  const scales = useMemo(() => scalesData?.scales || [], [scalesData?.scales]);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scaleToDelete, setScaleToDelete] = useState(null);

  // Filtered scales
  const filteredScales = useMemo(() => {
    return scales.filter((scale) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = scale.name.toLowerCase().includes(q);
        const matchesItems = scale.items?.some((it) => it.toLowerCase().includes(q));
        if (!matchesName && !matchesItems) return false;
      }

      // Status filter
      if (statusFilter === 'in_use') {
        return (scale.frameworks_count || 0) > 0;
      }
      if (statusFilter === 'unused') {
        return (scale.frameworks_count || 0) === 0;
      }
      if (statusFilter === 'locked') {
        return scale.locked === 1;
      }

      return true;
    });
  }, [scales, search, statusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = scales.length;
    const inUse = scales.filter((s) => (s.frameworks_count || 0) > 0).length;
    const locked = scales.filter((s) => s.locked === 1).length;
    const totalItems = scales.reduce((acc, s) => acc + (s.items?.length || 0), 0);
    const avgLevels = total > 0 ? (totalItems / total).toFixed(1) : 0;

    return { total, inUse, locked, avgLevels };
  }, [scales]);

  const handleOpenCreate = () => {
    setEditingScale(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (scale) => {
    setEditingScale(scale);
    setFormModalOpen(true);
  };

  const handleOpenDelete = (scale) => {
    setScaleToDelete(scale);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!scaleToDelete) return;
    try {
      await performScaleAction({
        action: 'delete',
        scaleid: scaleToDelete.id,
      });
      addToast({
        title: 'Escala eliminada',
        description: `La escala "${scaleToDelete.name}" fue eliminada correctamente.`,
        type: 'success',
      });
      setDeleteConfirmOpen(false);
      setScaleToDelete(null);
    } catch (err) {
      addToast({
        title: 'Error al eliminar',
        description: err?.message || 'No se pudo eliminar la escala.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Navigation */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2 h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Volver a {parentLabel}</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Escalas de Evaluación
              </h1>
              <Badge variant="secondary">
                {scales.length} {scales.length === 1 ? 'escala' : 'escalas'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Catálogo y administración de escalas de calificación estándar y personalizadas de Moodle.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <KpiGrid
        loading={isLoading}
        kpiHelpMap={helpData?.kpisHelp || {}}
        items={[
          {
            title: 'Total Escalas',
            value: kpis.total,
            icon: Sliders,
            color: 'from-blue-500 to-indigo-600',
            badgeColor: 'bg-blue-500/10 text-blue-500',
            details: [
              { label: 'En uso', value: kpis.inUse, textClass: 'text-blue-600 font-semibold' },
              { label: 'Sin marcos', value: kpis.total - kpis.inUse, textClass: 'text-muted-foreground' },
            ],
          },
          {
            title: 'En Uso en Marcos',
            value: kpis.inUse,
            icon: Award,
            color: 'from-emerald-500 to-teal-600',
            badgeColor: 'bg-emerald-500/10 text-emerald-500',
            details: [
              {
                label: 'Tasa de adopción',
                value: kpis.total > 0 ? `${Math.round((kpis.inUse / kpis.total) * 100)}%` : '0%',
                textClass: 'text-emerald-600',
              },
            ],
            progress: kpis.total > 0 ? (kpis.inUse / kpis.total) * 100 : 0,
          },
          {
            title: 'Escalas Bloqueadas',
            value: kpis.locked,
            icon: Lock,
            color: kpis.locked > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-500 to-slate-600',
            badgeColor: kpis.locked > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground',
            details: [
              {
                label: 'Con registros',
                value: kpis.locked > 0 ? 'Protegidas' : 'Ninguna',
                textClass: kpis.locked > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600',
              },
            ],
          },
          {
            title: 'Niveles Promedio',
            value: kpis.avgLevels,
            icon: Layers,
            color: 'from-purple-500 to-pink-600',
            badgeColor: 'bg-purple-500/10 text-purple-500',
            details: [
              { label: 'Escala estándar', value: scales.find((s) => s.isdefault === 1)?.name || 'Por defecto', textClass: 'text-purple-600' },
            ],
          },
        ]}
      />

      {/* FilterBar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre de escala o niveles..."
        onRefresh={() => refetch()}
        loading={isLoading || isFetching}
        primaryAction={
          hasManageCompetencies
            ? {
                label: 'Nueva Escala',
                onClick: handleOpenCreate,
                icon: <Plus className="h-4 w-4" />,
              }
            : null
        }
        filters={[
          {
            id: 'status',
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Todas las escalas', value: 'all' },
              { label: 'En uso por marcos', value: 'in_use' },
              { label: 'Sin marcos asignados', value: 'unused' },
              { label: 'Solo bloqueadas (con registros)', value: 'locked' },
            ],
          },
        ]}
      />

      {/* Scales Table */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Escala</th>
                <th className="px-5 py-3.5">Niveles de Evaluación (Menor a Mayor)</th>
                <th className="px-5 py-3.5">Marcos</th>
                <th className="px-5 py-3.5">Estado Moodle</th>
                {hasManageCompetencies && <th className="px-5 py-3.5 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredScales.length === 0 ? (
                <tr>
                  <td colSpan={hasManageCompetencies ? 5 : 4} className="text-center py-12 text-muted-foreground text-sm">
                    {search || statusFilter !== 'all'
                      ? 'No se encontraron escalas con los filtros aplicados.'
                      : 'No hay escalas configuradas en el sitio.'}
                  </td>
                </tr>
              ) : (
                filteredScales.map((scale) => {
                  const isUsed = (scale.frameworks_count || 0) > 0;
                  const isLocked = scale.locked === 1;

                  return (
                    <tr key={scale.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <div className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                            <span>{scale.name}</span>
                            {scale.isdefault === 1 && (
                              <Badge variant="secondary" className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20 font-semibold">
                                Estándar
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            ID: {scale.id}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
                          {scale.items?.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-background border border-border text-xs text-foreground font-medium shadow-2xs"
                            >
                              <span className="text-muted-foreground text-[10px]">{idx + 1}.</span>
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        {isUsed ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 dark:border-blue-700 bg-blue-500/10 font-semibold">
                            {scale.frameworks_count} {scale.frameworks_count === 1 ? 'marco' : 'marcos'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-border">
                            Sin marcos
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        {isLocked ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-500/10 gap-1">
                            <Lock className="h-3 w-3" /> Bloqueada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-700 bg-emerald-500/10 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Editable
                          </Badge>
                        )}
                      </td>

                      {hasManageCompetencies && (
                        <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(scale)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Editar escala"
                              aria-label={`Editar escala ${scale.name}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(scale)}
                              disabled={isUsed || isLocked}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                              title={
                                isUsed
                                  ? 'No se puede eliminar: en uso por marcos de competencias'
                                  : isLocked
                                  ? 'No se puede eliminar: tiene calificaciones registradas'
                                  : 'Eliminar escala'
                              }
                              aria-label={`Eliminar escala ${scale.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear / Editar Escala */}
      <ScaleFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingScale(null);
        }}
        scale={editingScale}
        onSuccess={() => refetch()}
      />

      {/* Modal: Confirmación de Eliminación */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setScaleToDelete(null);
        }}
        title="Confirmar Eliminación de Escala"
        description="Esta acción eliminará la escala del sitio Moodle de manera permanente."
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setScaleToDelete(null);
              }}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar definitivamente'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 pt-2">
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              ¿Estás seguro de que deseas eliminar la escala <strong>"{scaleToDelete?.name}"</strong>? Esta acción no se puede deshacer.
            </span>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
