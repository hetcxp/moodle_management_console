import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Layers, Trash2, Plus, Users, Search, Info } from 'lucide-react';
import { useCohorts } from '../../hooks/useAdminerQueries';

/**
 * Pestaña de cohortes sincronizadas en la ruta de aprendizaje.
 * Integra diálogo de confirmación obligatoria previo a la desvinculación.
 *
 * @param {Object} props
 * @param {Object} props.path
 * @param {(cohortids: number[]) => Promise<void>} props.onAssignCohorts
 * @param {(cohortid: number) => Promise<void>} props.onRemoveCohort
 * @param {boolean} [props.loading]
 */
export function LearningPathCohortsTab({
  path,
  onAssignCohorts,
  onRemoveCohort,
  loading = false,
}) {
  const [cohortModalOpen, setCohortModalOpen] = useState(false);
  const [cohortSearch, setCohortSearch] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [cohortToDelete, setCohortToDelete] = useState(null);

  const assignedCohorts = path?.cohorts || [];

  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts({
    page: 0,
    perpage: 50,
    search: cohortSearch,
  });

  const availableCohorts = (cohortsData?.cohorts || []).filter(
    (c) => !assignedCohorts.some((ac) => ac.cohort_id === c.id)
  );

  const handleAssignSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCohortId) return;
    if (onAssignCohorts) {
      await onAssignCohorts([parseInt(selectedCohortId, 10)]);
    }
    setSelectedCohortId('');
    setCohortModalOpen(false);
  };

  const handleConfirmRemoveCohort = async () => {
    if (!cohortToDelete) return;
    if (onRemoveCohort) {
      await onRemoveCohort(cohortToDelete.cohort_id);
    }
    setCohortToDelete(null);
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
            Las cohortes sincronizadas en esta ruta quedan registradas en el curso contenedor. El plugin
            <span className="font-mono text-xs font-semibold mx-1 text-foreground">local_subcourseenrol</span>
            replicará automáticamente el acceso a cada subcurso vinculado según las reglas de prelación definidas.
          </p>
        </div>
      </div>

      {/* Cabecera y Acción */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">Cohortes Sincronizadas</h3>
          <Badge variant="secondary">{assignedCohorts.length}</Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCohortModalOpen(true)}
          className="flex items-center gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Asignar Cohorte
        </Button>
      </div>

      {/* Lista / Grid de Cohortes Asignadas */}
      {assignedCohorts.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">No hay cohortes asignadas a esta ruta</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Asigna una cohorte para matricular en bloque a grupos de estudiantes en todos los cursos de la ruta.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCohortModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Asignar Cohorte
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assignedCohorts.map((coh) => (
            <Card key={coh.enrol_id || coh.cohort_id} className="p-4 flex items-center justify-between">
              <div className="space-y-1 min-w-0 pr-3">
                <div className="text-sm font-bold text-foreground flex items-center gap-2 truncate">
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{coh.name}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {coh.member_count} {coh.member_count === 1 ? 'estudiante' : 'estudiantes'}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                title="Desvincular cohorte de la ruta"
                disabled={loading}
                onClick={() => setCohortToDelete(coh)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para Asignar Cohorte */}
      <Dialog
        open={cohortModalOpen}
        onClose={() => setCohortModalOpen(false)}
        title="Asignar Cohorte a la Ruta"
        description="Selecciona una cohorte existente para incorporarla a la ruta formativa."
        footer={
          <>
            <Button variant="outline" onClick={() => setCohortModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              disabled={!selectedCohortId || loading}
              onClick={handleAssignSubmit}
            >
              {loading ? 'Asignando...' : 'Asignar Cohorte'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={cohortSearch}
              onChange={(e) => setCohortSearch(e.target.value)}
              placeholder="Buscar por nombre de cohorte..."
              className="pl-8 text-xs h-9"
            />
          </div>

          <div className="border border-border rounded-lg max-h-56 overflow-y-auto divide-y divide-border">
            {cohortsLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Cargando cohortes...</div>
            ) : availableCohorts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No se encontraron cohortes disponibles para asignar.
              </div>
            ) : (
              availableCohorts.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center justify-between p-3 cursor-pointer text-xs transition-colors hover:bg-muted/50 ${
                    selectedCohortId === String(c.id) ? 'bg-primary/10 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="selected_cohort"
                      value={c.id}
                      checked={selectedCohortId === String(c.id)}
                      onChange={(e) => setSelectedCohortId(e.target.value)}
                      className="text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span className="text-foreground">{c.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {c.member_count ?? 0} miembros
                  </Badge>
                </label>
              ))
            )}
          </div>
        </div>
      </Dialog>

      {/* Diálogo de Confirmación Requerido al Desvincular Cohorte (Requerimiento 1) */}
      <ConfirmDialog
        open={Boolean(cohortToDelete)}
        onClose={() => setCohortToDelete(null)}
        onConfirm={handleConfirmRemoveCohort}
        title="Desvincular Cohorte de la Ruta"
        description={`¿Estás seguro de que deseas desvincular la cohorte "${cohortToDelete?.name}" de esta ruta de aprendizaje? Los estudiantes pertenecientes a esta cohorte perderán la sincronización automática en cascada hacia los subcursos.`}
        confirmText="Desvincular Cohorte"
        cancelText="Cancelar"
        variant="destructive"
        loading={loading}
      />
    </div>
  );
}
