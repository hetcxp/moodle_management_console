import React from 'react';
import { Eye, Trash2, Layers, Award, User, Calendar, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const RubricsTable = ({
  templates = [],
  isLoading = false,
  hasManageCompetencies = false,
  search = '',
  onOpenPreview,
  onOpenEdit,
  onOpenDelete,
}) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Plantilla de Rúbrica</th>
              <th className="px-5 py-3.5">Criterios Evaluativos</th>
              <th className="px-5 py-3.5">Puntaje Máximo</th>
              <th className="px-5 py-3.5">Autor / Fecha</th>
              <th className="px-5 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs font-medium">Cargando plantillas de rúbricas...</span>
                  </div>
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Layers className="h-8 w-8 text-muted-foreground/50 mb-1" />
                    <span className="font-semibold text-foreground">
                      {search ? 'No se encontraron plantillas coincidentes' : 'No hay plantillas de rúbricas disponibles'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {search
                        ? `No hay rúbricas que coincidan con "${search}". Intenta con otros términos.`
                        : 'Crea tu primera plantilla de rúbrica analítica para usar en las actividades.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              templates.map((template) => {
                const cleanDesc = stripHtml(template.description);
                return (
                  <tr key={template.id} className="hover:bg-muted/20 transition-colors">
                    {/* 1. Name & ID */}
                    <td className="px-5 py-4 align-top max-w-sm">
                      <div className="space-y-1">
                        <div className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => onOpenPreview(template)}>
                          {template.name}
                        </div>
                        {cleanDesc && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {cleanDesc}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-0.5">
                          <span>ID: {template.id}</span>
                          <span>•</span>
                          <span>Área: {template.areaid}</span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Criteria count */}
                    <td className="px-5 py-4 align-top whitespace-nowrap">
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-700 bg-emerald-500/10 font-semibold text-xs">
                        <Layers className="h-3 w-3 mr-1" />
                        {template.criteria_count} {template.criteria_count === 1 ? 'criterio' : 'criterios'}
                      </Badge>
                    </td>

                    {/* 3. Max Score */}
                    <td className="px-5 py-4 align-top whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                        <span>{template.max_score} pts</span>
                      </div>
                    </td>

                    {/* 4. Author & Date */}
                    <td className="px-5 py-4 align-top whitespace-nowrap text-xs text-muted-foreground">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{template.author_name || 'Moodle'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="h-3 w-3 text-muted-foreground/70" />
                          <span>{formatDate(template.timemodified || template.timecreated)}</span>
                        </div>
                      </div>
                    </td>

                    {/* 5. Actions */}
                    <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenPreview(template)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Previsualizar matriz analítica"
                          aria-label={`Ver matriz de ${template.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {hasManageCompetencies && onOpenEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenEdit(template)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Editar plantilla"
                            aria-label={`Editar ${template.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        {hasManageCompetencies && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenDelete(template)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar plantilla"
                            aria-label={`Eliminar ${template.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
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
