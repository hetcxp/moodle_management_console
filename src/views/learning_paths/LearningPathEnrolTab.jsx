import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Layers, Plus, Trash2, Users, Info, Search } from 'lucide-react';
import { useCohorts } from '../../hooks/useAdminerQueries';

export function LearningPathEnrolTab({
  path,
  onAssignCohorts,
  onRemoveCohort,
  loading = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');

  const assignedCohorts = path?.cohorts || [];

  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts({
    page: 0,
    perpage: 50,
    search,
  });

  const availableCohorts = (cohortsData?.cohorts || []).filter(
    (c) => !assignedCohorts.some((ac) => ac.cohort_id === c.id)
  );

  const handleAssign = async () => {
    if (!selectedCohortId) return;
    if (onAssignCohorts) {
      await onAssignCohorts([parseInt(selectedCohortId, 10)]);
      setSelectedCohortId('');
      setModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Informativo de Sincronización Automática */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3 text-sm text-foreground">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-600 dark:text-blue-400">
            Sincronización Automática de Matrículas en Cascada
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Al matricular una cohorte en esta ruta, los estudiantes quedan matriculados en el curso contenedor y el plugin
            <span className="font-mono text-xs font-semibold mx-1 text-foreground">local_subcourseenrol</span>
            replicará automáticamente sus matrículas y suspensiones en cada uno de los subcursos vinculados en la estructura formativa.
          </p>
        </div>
      </div>

      {/* Cohortes Asignadas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">Cohortes Asignadas</h4>
            <Badge variant="secondary">{assignedCohorts.length}</Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Asignar Cohorte
          </Button>
        </div>

        {assignedCohorts.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground">No hay cohortes asignadas a esta ruta</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Asigna una cohorte para matricular a los estudiantes en todos los cursos de la ruta en un solo paso.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Asignar Cohorte
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assignedCohorts.map((coh) => (
              <Card key={coh.enrol_id || coh.cohort_id} className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>{coh.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{coh.member_count} {coh.member_count === 1 ? 'estudiante' : 'estudiantes'}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Desvincular cohorte de la ruta"
                  disabled={loading}
                  onClick={() => onRemoveCohort && onRemoveCohort(coh.cohort_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Seleccionar Cohorte */}
      <Dialog
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSearch('');
          setSelectedCohortId('');
        }}
        title="Asignar Cohorte a la Ruta"
        description="Selecciona la cohorte que tendrá acceso a la ruta de aprendizaje."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAssign}
              disabled={!selectedCohortId || loading}
            >
              {loading ? 'Asignando...' : 'Asignar Cohorte'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar cohortes disponibles..."
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-border/40">
            {cohortsLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Cargando cohortes...</div>
            ) : availableCohorts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No hay cohortes adicionales disponibles.
              </div>
            ) : (
              availableCohorts.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    String(selectedCohortId) === String(c.id)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{c.idnumber || 'Sin ID'}</div>
                  </div>
                  <input
                    type="radio"
                    name="selectedCohort"
                    value={c.id}
                    checked={String(selectedCohortId) === String(c.id)}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                </label>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
