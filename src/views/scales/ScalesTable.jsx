import React from 'react';
import {
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const ScalesTable = ({
  filteredScales = [],
  hasManageCompetencies = false,
  search = '',
  statusFilter = 'all',
  onOpenEdit,
  onOpenDelete,
}) => {
  return (
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
                <td
                  colSpan={hasManageCompetencies ? 5 : 4}
                  className="text-center py-12 text-muted-foreground text-sm"
                >
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
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20 font-semibold"
                            >
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
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-300 dark:border-blue-700 bg-blue-500/10 font-semibold"
                        >
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
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-500/10 gap-1"
                        >
                          <Lock className="h-3 w-3" /> Bloqueada
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-emerald-600 border-emerald-300 dark:border-emerald-700 bg-emerald-500/10 gap-1"
                        >
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
                            onClick={() => onOpenEdit(scale)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Editar escala"
                            aria-label={`Editar escala ${scale.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenDelete(scale)}
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
  );
};
