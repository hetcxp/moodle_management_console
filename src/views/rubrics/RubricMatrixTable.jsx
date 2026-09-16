import React from 'react';
import { Award, Layers, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const RubricMatrixTable = ({
  rubric,
  viewMode = 'matrix',
}) => {
  if (!rubric || !rubric.criteria || rubric.criteria.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-12 text-center text-muted-foreground space-y-2">
        <Layers className="h-10 w-10 mx-auto text-muted-foreground/40" />
        <p className="font-semibold text-foreground">Esta plantilla no tiene criterios evaluativos definidos.</p>
        <p className="text-xs">Los criterios y niveles de desempeño se mostrarán aquí una vez configurados en Moodle.</p>
      </div>
    );
  }

  // Calculate max number of levels across all criteria for table headers
  const maxLevelsCount = rubric.criteria.reduce(
    (max, c) => Math.max(max, c.levels?.length || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <span>Matriz de Criterios y Niveles de Desempeño</span>
        </h2>
        <span className="text-xs text-muted-foreground">
          {rubric.criteria.length} {rubric.criteria.length === 1 ? 'criterio evaluativo' : 'criterios evaluativos'} • {maxLevelsCount} niveles por fila
        </span>
      </div>

      {viewMode === 'matrix' ? (
        /* VISTA 1: TABLA MATRIZ COMPARATIVA (CON ANCHO MÍNIMO AMPLIO POR COLUMNA) */
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-72 min-w-[280px] max-w-sm border-r border-border/60 bg-muted/50 sticky left-0 z-10">
                    Criterio Evaluativo
                  </th>
                  <th
                    colSpan={maxLevelsCount}
                    className="px-6 py-4 text-center border-b border-border/40 font-bold text-foreground"
                  >
                    Escala de Niveles de Desempeño y Puntuación
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rubric.criteria.map((criterion, cIdx) => {
                  const maxCritScore = criterion.levels?.reduce(
                    (max, l) => Math.max(max, l.score || 0),
                    0
                  ) || 0;

                  return (
                    <tr key={criterion.id || cIdx} className="hover:bg-muted/10 transition-colors">
                      {/* Left: Criterion descriptor (Sticky column for optimal UX) */}
                      <td className="px-6 py-5 align-top border-r border-border/60 bg-muted/20 sticky left-0 z-10 w-72 min-w-[280px] max-w-sm">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-bold bg-background text-primary border-primary/30"
                            >
                              Criterio {criterion.sortorder || cIdx + 1}
                            </Badge>
                            <span className="text-xs font-bold text-muted-foreground">
                              Hasta {maxCritScore} pts
                            </span>
                          </div>

                          <div
                            className="font-semibold text-foreground text-sm leading-snug prose prose-sm dark:prose-invert"
                            dangerouslySetInnerHTML={{
                              __html: criterion.description || `Criterio ${cIdx + 1}`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Right: Levels columns */}
                      {criterion.levels?.map((level, lIdx) => {
                        const isMax = level.score === maxCritScore && maxCritScore > 0;
                        const isZero = level.score === 0;

                        return (
                          <td
                            key={level.id || lIdx}
                            className="px-5 py-5 align-top border-r border-border/40 min-w-[220px] max-w-[300px] hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex flex-col justify-between h-full min-h-[140px] space-y-3">
                              {/* Level Header / Score */}
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                                <span className="text-xs font-bold text-muted-foreground">
                                  Nivel {lIdx + 1}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-bold ${
                                    isMax
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/40'
                                      : isZero
                                      ? 'bg-muted text-muted-foreground border-border'
                                      : 'bg-primary/10 text-primary border-primary/30'
                                  }`}
                                >
                                  {level.score} pts
                                </Badge>
                              </div>

                              {/* Level Definition Text */}
                              <div
                                className="text-xs text-foreground/90 leading-relaxed flex-1 prose prose-xs dark:prose-invert"
                                dangerouslySetInnerHTML={{
                                  __html: level.definition || 'Sin descripción',
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}

                      {/* Fill empty cells if this criterion has fewer levels than max */}
                      {Array.from({
                        length: Math.max(0, maxLevelsCount - (criterion.levels?.length || 0)),
                      }).map((_, emptyIdx) => (
                        <td
                          key={`empty-${emptyIdx}`}
                          className="px-5 py-5 bg-muted/5 border-r border-border/30 min-w-[220px]"
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA 2: TARJETAS DE PROGRESIÓN POR CRITERIO */
        <div className="space-y-6">
          {rubric.criteria.map((criterion, cIdx) => {
            const maxCritScore = criterion.levels?.reduce(
              (max, l) => Math.max(max, l.score || 0),
              0
            ) || 0;

            return (
              <div
                key={criterion.id || cIdx}
                className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-xs space-y-5"
              >
                {/* Criterion Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs font-bold bg-primary/10 text-primary border-primary/20"
                      >
                        Criterio {criterion.sortorder || cIdx + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-semibold">
                        Puntaje Máximo: {maxCritScore} pts
                      </span>
                    </div>
                    <div
                      className="text-base font-bold text-foreground prose prose-sm dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: criterion.description || `Criterio ${cIdx + 1}`,
                      }}
                    />
                  </div>
                </div>

                {/* Levels Cards Progression */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {criterion.levels?.map((level, lIdx) => {
                    const isMax = level.score === maxCritScore && maxCritScore > 0;
                    const isZero = level.score === 0;

                    return (
                      <div
                        key={level.id || lIdx}
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                          isMax
                            ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 shadow-xs'
                            : 'bg-background/80 border-border hover:border-primary/40 shadow-2xs'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              Nivel {lIdx + 1}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold ${
                                isMax
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/40'
                                  : isZero
                                  ? 'bg-muted text-muted-foreground border-border'
                                  : 'bg-primary/10 text-primary border-primary/30'
                              }`}
                            >
                              {level.score} pts
                            </Badge>
                          </div>

                          <div
                            className="text-xs text-foreground/90 leading-relaxed prose prose-xs dark:prose-invert"
                            dangerouslySetInnerHTML={{
                              __html: level.definition || 'Sin descripción',
                            }}
                          />
                        </div>

                        {isMax && (
                          <div className="pt-2 border-t border-emerald-500/20 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Desempeño Óptimo</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
