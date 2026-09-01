import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useCourseAvailableActivities } from '../../hooks/useAdminerQueries';
import { RULE_OUTCOMES, getModuleTypeName } from './competencyConstants';
import { Layers, Loader2 } from 'lucide-react';

export const AddActivityToCompetencyModal = ({ open, onClose, course, competencyId, onAddActivity }) => {
  const { data: activitiesData, isLoading, isError, error, refetch } = useCourseAvailableActivities(course?.id, competencyId);
  const [selectedCmid, setSelectedCmid] = useState('');
  const [ruleOutcome, setRuleOutcome] = useState(3);
  const [saving, setSaving] = useState(false);

  const activities = activitiesData?.activities || [];
  const unlinkedActivities = activities.filter(a => a.islinked === 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedCmid) return;
    setSaving(true);
    try {
      await onAddActivity(Number(selectedCmid), Number(ruleOutcome));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span>Vincular Actividad Clave</span>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <p className="text-xs text-muted-foreground">
          Curso: <strong className="text-foreground">{course?.fullname}</strong>
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Cargando actividades del curso...</p>
          </div>
        ) : isError ? (
          <div className="py-4 px-3 text-center text-xs text-destructive bg-destructive/10 rounded-lg space-y-2">
            <p className="font-semibold">Error al cargar actividades: {error?.message || 'Error desconocido'}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : unlinkedActivities.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground bg-muted/40 rounded-lg p-4">
            {activities.length === 0
              ? 'Este curso no contiene actividades creadas actualmente.'
              : 'Todas las actividades de este curso ya están vinculadas a la competencia.'}
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Selecciona la Actividad del Curso:
              </label>
              <select
                value={selectedCmid}
                onChange={(e) => setSelectedCmid(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Elige una actividad --</option>
                {unlinkedActivities.map((act) => (
                  <option key={act.cmid} value={act.cmid}>
                    [{getModuleTypeName(act.modname)}] {act.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Regla al completar la actividad:
              </label>
              <select
                value={ruleOutcome}
                onChange={(e) => setRuleOutcome(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {RULE_OUTCOMES.map((ro) => (
                  <option key={ro.value} value={ro.value}>
                    {ro.fullLabel}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {RULE_OUTCOMES.find(r => r.value === ruleOutcome)?.description}
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={saving || unlinkedActivities.length === 0 || !selectedCmid}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Vincular Actividad
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
