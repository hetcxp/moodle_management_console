import React from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Award, Layers, User, Calendar } from 'lucide-react';

export const RubricPreviewModal = ({
  open,
  onClose,
  rubric,
}) => {
  if (!rubric) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={rubric.name}
      description={`Matriz analítica de evaluación compartida • ID: ${rubric.id}`}
      className="max-w-5xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-6 pt-2">
        {/* Header Summary Banner */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {rubric.author_name || 'Moodle'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(rubric.timemodified || rubric.timecreated)}
              </span>
            </div>
            {rubric.description && (
              <div
                className="text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none pt-1"
                dangerouslySetInnerHTML={{ __html: rubric.description }}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block">
                Puntaje Total
              </span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {rubric.max_score} pts
              </span>
            </div>
            <Badge variant="secondary" className="h-8 px-2.5 bg-primary/10 text-primary border-primary/20">
              <Layers className="h-3.5 w-3.5 mr-1" />
              {rubric.criteria_count} criterios
            </Badge>
          </div>
        </div>

        {/* Evaluation Grid / Matrix */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span>Matriz de Criterios y Niveles de Desempeño</span>
          </h3>

          <div className="rounded-xl border border-border overflow-hidden bg-background">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-bold text-[11px]">
                  <tr>
                    <th className="p-3.5 w-1/4 min-w-[200px] border-r border-border/60">Criterio Evaluativo</th>
                    <th className="p-3.5 border-r border-border/60">Niveles de Desempeño y Puntuación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rubric.criteria?.map((crit, cIdx) => (
                    <tr key={crit.id || cIdx} className="hover:bg-muted/10 transition-colors">
                      {/* Criterion info */}
                      <td className="p-4 align-top border-r border-border/60 bg-muted/10">
                        <div className="space-y-1">
                          <span className="inline-block text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Criterio {crit.sortorder || cIdx + 1}
                          </span>
                          <div
                            className="font-semibold text-foreground prose prose-xs dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: crit.description || `Criterio ${cIdx + 1}` }}
                          />
                        </div>
                      </td>

                      {/* Levels horizontal row */}
                      <td className="p-3 align-top">
                        <div className="grid grid-cols-1 md:grid-flow-col md:auto-cols-fr gap-2">
                          {crit.levels?.map((lvl, lIdx) => (
                            <div
                              key={lvl.id || lIdx}
                              className="p-3 rounded-lg border border-border/80 bg-card/60 flex flex-col justify-between hover:border-primary/40 transition-colors space-y-2 min-h-[100px]"
                            >
                              <div
                                className="text-foreground prose prose-xs dark:prose-invert leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: lvl.definition || 'Sin descripción' }}
                              />
                              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground font-medium">Nivel {lIdx + 1}</span>
                                <Badge variant="outline" className="font-bold text-[11px] text-primary bg-primary/5">
                                  {lvl.score} pts
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
