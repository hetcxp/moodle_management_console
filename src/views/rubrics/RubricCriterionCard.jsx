import React from 'react';
import { Plus, Trash2, Copy, ArrowUp, ArrowDown, Award, Sparkles } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const RubricCriterionCard = ({
  criterion,
  criterionIndex,
  totalCriteria,
  onDescChange,
  onRemoveCriterion,
  onDuplicateCriterion,
  onMoveCriterion,
  onAddLevel,
  onRemoveLevel,
  onLevelChange,
}) => {
  const maxScore = criterion.levels.reduce((m, l) => Math.max(m, Number(l.score) || 0), 0);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-5 sm:p-6 shadow-sm space-y-5 transition-all hover:border-border">
      {/* Top Bar: Criterion Index, Subtotal Points & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary border-primary/30">
            Criterio #{criterionIndex + 1}
          </Badge>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
            <Award className="h-3 w-3" />
            <span>Máx: {maxScore} pts</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {criterion.levels.length} nivel(es)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 self-end sm:self-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={criterionIndex === 0}
            onClick={() => onMoveCriterion(criterionIndex, -1)}
            title="Mover criterio hacia arriba"
            aria-label="Mover criterio hacia arriba"
            className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={criterionIndex === totalCriteria - 1}
            onClick={() => onMoveCriterion(criterionIndex, 1)}
            title="Mover criterio hacia abajo"
            aria-label="Mover criterio hacia abajo"
            className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDuplicateCriterion(criterionIndex)}
            title="Duplicar este criterio"
            aria-label="Duplicar este criterio"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <Copy className="h-4 w-4" />
          </Button>

          {totalCriteria > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveCriterion(criterionIndex)}
              title="Eliminar este criterio"
              aria-label="Eliminar este criterio"
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Criterion Description Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">
          Descripción de la Competencia / Criterio Evaluado *
        </label>
        <Input
          value={criterion.description}
          onChange={(e) => onDescChange(criterionIndex, e.target.value)}
          placeholder="Ej. Capacidad de formulación de hipótesis analíticas basadas en datos empíricos"
          className="text-sm font-medium bg-background/80"
          required
        />
      </div>

      {/* Levels Matrix Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Escala de Niveles de Desempeño
            </h4>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddLevel(criterionIndex)}
            aria-label={`Añadir nivel al criterio ${criterionIndex + 1}`}
            className="h-7 px-2.5 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" />
            <span>Añadir Nivel</span>
          </Button>
        </div>

        {/* Responsive Levels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {criterion.levels.map((lvl, lIdx) => {
            const isHighest = Number(lvl.score) === maxScore && maxScore > 0;
            return (
              <div
                key={lvl.id || lIdx}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all bg-background/90 ${
                  isHighest ? 'border-amber-500/40 shadow-xs' : 'border-border'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5 border-b border-border/50 pb-2">
                    <span className="text-xs font-bold text-foreground">
                      Nivel {lIdx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        value={lvl.score}
                        onChange={(e) => onLevelChange(criterionIndex, lIdx, 'score', e.target.value)}
                        className="w-16 h-7 px-2 text-xs text-right font-black rounded-md border border-input bg-muted/40 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        aria-label={`Puntos para nivel ${lIdx + 1}`}
                      />
                      <span className="text-[11px] font-bold text-muted-foreground">pts</span>
                      {criterion.levels.length > 2 && (
                        <button
                          type="button"
                          onClick={() => onRemoveLevel(criterionIndex, lIdx)}
                          title="Eliminar este nivel"
                          aria-label={`Eliminar nivel ${lIdx + 1}`}
                          className="text-muted-foreground hover:text-rose-600 p-1 ml-0.5 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="sr-only">Definición cualitativa</label>
                    <textarea
                      rows={4}
                      value={lvl.definition}
                      onChange={(e) => onLevelChange(criterionIndex, lIdx, 'definition', e.target.value)}
                      placeholder="Describe qué evidencias demuestran este nivel de logro..."
                      className="w-full text-xs p-2 rounded-lg border border-input bg-card text-foreground resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary leading-relaxed"
                    />
                  </div>
                </div>

                {isHighest && (
                  <div className="pt-2 text-right">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Desempeño Óptimo
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
