import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle2, Clock, Circle, Users, BookOpen } from 'lucide-react';

export function LearningPathProgressTab({ path }) {
  const sections = (path?.sections || []).filter((s) => s.cm_id);
  const progressMatrix = path?.progress_matrix || [];

  const getStatusIcon = (completionstate) => {
    switch (completionstate) {
      case 1:
      case 2:
        return (
          <span title="Completado" className="inline-flex items-center text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        );
      case 3:
        return (
          <span title="Fallido / No completado" className="inline-flex items-center text-destructive">
            <Circle className="h-4 w-4" />
          </span>
        );
      case 0:
      default:
        return (
          <span title="No iniciado / Pendiente" className="inline-flex items-center text-muted-foreground/50">
            <Clock className="h-4 w-4" />
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen y Leyenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{progressMatrix.length} estudiantes monitoreados</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{sections.length} módulos formativos</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Completado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-muted-foreground">Pendiente</span>
          </div>
        </div>
      </div>

      {/* Tabla Matriz de Progreso */}
      {progressMatrix.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">No hay estudiantes activos en esta ruta</p>
          <p className="text-xs text-muted-foreground mt-1">
            Matricula una cohorte para comenzar a monitorear el avance individual a través de los cursos.
          </p>
        </Card>
      ) : sections.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">La ruta no contiene módulos configurados</p>
          <p className="text-xs text-muted-foreground mt-1">
            Configura los subcursos en la pestaña de Estructura para activar el seguimiento.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-bold text-foreground py-3 px-4 min-w-[200px]">
                  Estudiante
                </th>
                {sections.map((s, idx) => (
                  <th key={s.cm_id || idx} className="text-center font-bold text-foreground py-3 px-3 min-w-[120px]">
                    <div className="truncate" title={s.subcourse_fullname || s.section_name}>
                      Paso {idx + 1}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[140px] mx-auto">
                      {s.subcourse_shortname || s.section_name}
                    </div>
                  </th>
                ))}
                <th className="text-center font-bold text-foreground py-3 px-3 w-[100px]">
                  Avance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {progressMatrix.map((user) => {
                const userModulesMap = new Map((user.modules || []).map((m) => [m.cm_id, m.completionstate]));
                let completedCount = 0;

                sections.forEach((s) => {
                  const state = userModulesMap.get(s.cm_id) ?? 0;
                  if (state === 1 || state === 2) completedCount++;
                });

                const percentage = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

                return (
                  <tr key={user.user_id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground">
                      <div className="font-semibold">{user.fullname}</div>
                      <div className="text-[11px] text-muted-foreground">{user.email}</div>
                    </td>
                    {sections.map((s, idx) => {
                      const state = userModulesMap.get(s.cm_id) ?? 0;
                      return (
                        <td key={s.cm_id || idx} className="py-2.5 px-3 text-center">
                          {getStatusIcon(state)}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant={percentage === 100 ? 'success' : percentage > 0 ? 'secondary' : 'outline'}
                        className="text-[11px] font-mono"
                      >
                        {percentage}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
