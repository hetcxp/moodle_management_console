import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useCompetencyAction } from '../../hooks/useAdminerQueries';
import {
  COMPETENCY_RULE_ALL_CHILDREN,
  COMPETENCY_PARENT_RULES
} from './competencyConstants';
import {
  Sparkles,
  CheckCircle2,
  Sliders,
  Info,
  Layers,
  AlertCircle,
  Save,
  Check
} from 'lucide-react';

export const CompetencyRuleCard = ({ competency, hasManagePermission }) => {
  const { addToast } = useToast();
  const { mutateAsync: performCompetencyAction, isLoading: isSaving } = useCompetencyAction();

  const isRuleActive = competency?.ruletype === COMPETENCY_RULE_ALL_CHILDREN;
  const currentOutcome = isRuleActive ? (competency?.ruleoutcome ?? 2) : 0;

  const [selectedOutcome, setSelectedOutcome] = useState(
    isRuleActive ? (competency?.ruleoutcome ?? 2) : 0
  );
  const [activeRuleType, setActiveRuleType] = useState(
    competency?.ruletype || ''
  );

  // Sync state if competency data updates
  React.useEffect(() => {
    setActiveRuleType(competency?.ruletype || '');
    setSelectedOutcome(competency?.ruletype === COMPETENCY_RULE_ALL_CHILDREN ? (competency?.ruleoutcome ?? 2) : 0);
  }, [competency?.ruletype, competency?.ruleoutcome]);

  const hasChanges =
    activeRuleType !== (competency?.ruletype || '') ||
    (activeRuleType === COMPETENCY_RULE_ALL_CHILDREN && selectedOutcome !== (competency?.ruleoutcome ?? 2));

  const handleSelectRule = (rule) => {
    setActiveRuleType(rule.ruletype);
    setSelectedOutcome(rule.ruleoutcome);
  };

  const handleSaveRule = async () => {
    try {
      await performCompetencyAction({
        action: 'update_rule',
        competencyid: competency.id,
        ruletype: activeRuleType,
        ruleoutcome: activeRuleType === COMPETENCY_RULE_ALL_CHILDREN ? selectedOutcome : 1,
        ruleconfig: '',
      });
      addToast({
        type: 'success',
        title: 'Regla de completado actualizada',
        description: activeRuleType === COMPETENCY_RULE_ALL_CHILDREN
          ? 'La regla automática de subcompetencias ha sido configurada.'
          : 'Se ha desactivado la regla automática de subcompetencias.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al actualizar la regla',
        description: err.message || 'No se pudo guardar la configuración de la regla.',
      });
    }
  };

  const subcompetenciesCount = competency?.childrencount || 0;

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Regla de Completado por Subcompetencias
                {isRuleActive ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Regla Activa
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                    Sin Regla
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Define la acción automática en Moodle cuando un estudiante completa todas las subcompetencias hijas.
              </CardDescription>
            </div>
          </div>

          {hasManagePermission && (
            <Button
              size="sm"
              onClick={handleSaveRule}
              disabled={!hasChanges || isSaving}
              className="self-start sm:self-auto shrink-0 gap-1.5"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Regla'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {subcompetenciesCount === 0 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-semibold">Esta competencia aún no tiene subcompetencias.</span>
              <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                Puedes configurar la regla ahora y se activará automáticamente a medida que agregues y los alumnos completen subcompetencias.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMPETENCY_PARENT_RULES.map((rule) => {
            const isSelected =
              activeRuleType === rule.ruletype &&
              (rule.ruletype === '' || selectedOutcome === rule.ruleoutcome);

            return (
              <button
                key={`${rule.ruletype}-${rule.ruleoutcome}`}
                type="button"
                disabled={!hasManagePermission}
                onClick={() => handleSelectRule(rule)}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-card hover:bg-muted/40 hover:border-border/80'
                } ${!hasManagePermission ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      {rule.ruleoutcome === 2 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {rule.ruleoutcome === 1 && <Sparkles className="h-4 w-4 text-sky-500" />}
                      {rule.ruleoutcome === 3 && <Sliders className="h-4 w-4 text-amber-500" />}
                      {rule.shortLabel}
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    {rule.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {rule.ruletype ? 'core_competency' : 'manual'}
                  </span>
                  <Badge variant="outline" className={`text-[10px] py-0 px-2 font-medium ${rule.badgeClass}`}>
                    {rule.ruletype ? `Outcome: ${rule.ruleoutcome}` : 'Inactiva'}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground border border-border/50">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <p className="leading-relaxed">
            <span className="font-semibold text-foreground">Comportamiento en Moodle:</span> Al seleccionar{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">"Marcar como completada"</span>, Moodle aplicará la regla nativa{' '}
            <code className="text-[11px] bg-background px-1 py-0.5 rounded border border-border">competency_rule_all_children</code> con outcome de completado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
