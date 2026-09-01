import React from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PermissionGate } from '../../components/PermissionGate';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  Layers
} from 'lucide-react';
import {
  RULE_OUTCOMES,
  getModuleIcon,
  getModuleTypeName
} from './competencyConstants';

export const CompetencyCourseCard = ({
  course,
  isExpanded,
  onToggleExpand,
  onUpdateCourseRule,
  onOpenAddActivityModal,
  onRequestUnlinkCourse,
  onUpdateModuleRule,
  onRequestUnlinkActivity,
  isReadOnly = false,
  subcompetencyInfo = null,
  onNavigateToSubcompetency = null
}) => {
  const activities = course.activities || [];
  const currentRule = RULE_OUTCOMES.find((r) => r.value === course.ruleoutcome) || RULE_OUTCOMES[0];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm transition-all overflow-hidden">
      {/* Course Main Row */}
      <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card hover:bg-muted/30 transition-colors">
        {/* Left: Course Info & Expand Button */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            onClick={() => onToggleExpand(course.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors mt-0.5"
            title={isExpanded ? 'Colapsar actividades' : 'Expandir actividades'}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-primary" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-semibold text-foreground text-sm hover:text-primary transition-colors cursor-pointer"
                onClick={() => onToggleExpand(course.id)}
              >
                {course.fullname}
              </span>
              {course.shortname && (
                <Badge variant="outline" className="text-[11px] font-mono">
                  {course.shortname}
                </Badge>
              )}
              {course.categoryname && (
                <Badge variant="secondary" className="text-[11px]">
                  {course.categoryname}
                </Badge>
              )}
              {course.visible === 0 && (
                <Badge variant="warning" className="text-[10px]">
                  Oculto
                </Badge>
              )}
              {isReadOnly && subcompetencyInfo && (
                <Badge
                  variant="outline"
                  className={`text-[11px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 ${
                    onNavigateToSubcompetency ? 'cursor-pointer hover:bg-indigo-500/20' : ''
                  }`}
                  onClick={onNavigateToSubcompetency ? (e) => { e.stopPropagation(); onNavigateToSubcompetency(); } : undefined}
                  title={onNavigateToSubcompetency ? 'Ir a la subcompetencia' : undefined}
                >
                  <Layers className="h-3 w-3 mr-1" />
                  {subcompetencyInfo.name || subcompetencyInfo}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button
                onClick={() => onToggleExpand(course.id)}
                className="flex items-center gap-1 font-medium hover:underline text-primary/90"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>{activities.length} actividad(es) clave vinculada(s)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Completion Rule Selector & Actions */}
        <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-border/50">
          {/* Course Completion Rule */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              Al completar el curso:
            </span>

            {isReadOnly ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${currentRule.colorClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${currentRule.dotColor}`} />
                {currentRule.label}
              </span>
            ) : (
              <PermissionGate
                capability="can_manage_competencies"
                fallback={
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${currentRule.colorClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${currentRule.dotColor}`} />
                    {currentRule.label}
                  </span>
                }
              >
                <div className="relative inline-flex items-center">
                  <select
                    value={course.ruleoutcome}
                    onChange={(e) => onUpdateCourseRule(course.id, e.target.value)}
                    title={currentRule.description}
                    className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border appearance-none pr-7 cursor-pointer transition-colors focus:ring-2 focus:ring-primary focus:outline-none ${currentRule.colorClass}`}
                  >
                    {RULE_OUTCOMES.map((ro) => (
                      <option key={ro.value} value={ro.value}>
                        {ro.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 absolute right-2 pointer-events-none opacity-60" />
                </div>
              </PermissionGate>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {!isReadOnly && (
              <PermissionGate capability="can_manage_competencies">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenAddActivityModal(course)}
                  className="text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 h-8"
                  title="Vincular actividad del curso"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Actividad</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRequestUnlinkCourse(course)}
                  className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                  title="Desvincular curso"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </PermissionGate>
            )}

            {window.ADMINER_CONFIG?.wwwroot && (
              <a
                href={`${window.ADMINER_CONFIG.wwwroot}/course/view.php?id=${course.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                title="Abrir curso en Moodle"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Sub-level Accordion: Course Linked Activities */}
      {isExpanded && (
        <div className="border-t border-border/70 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Actividades Clave en este Curso ({activities.length})
              </h4>
            </div>

            {!isReadOnly && (
              <PermissionGate capability="can_manage_competencies">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenAddActivityModal(course)}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Asociar Actividad
                </Button>
              </PermissionGate>
            )}
          </div>

          {activities.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-lg border border-dashed border-border/80 bg-background/50">
              <p className="text-xs text-muted-foreground">
                {isReadOnly
                  ? 'No hay actividades específicas asociadas a esta subcompetencia en este curso.'
                  : 'No hay actividades específicas vinculadas a esta competencia en este curso.'}
              </p>
              {!isReadOnly && (
                <>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                    Puedes asociar exámenes o tareas clave para que al completarlas se registre la competencia.
                  </p>
                  <PermissionGate capability="can_manage_competencies">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenAddActivityModal(course)}
                      className="mt-2 text-xs text-primary gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Vincular Primera Actividad
                    </Button>
                  </PermissionGate>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {activities.map((act) => {
                const ModIcon = getModuleIcon(act.modname);
                const actRule = RULE_OUTCOMES.find((r) => r.value === act.ruleoutcome) || RULE_OUTCOMES[0];

                return (
                  <div
                    key={act.id || act.cmid}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-background shadow-xs hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ModIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {act.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            {getModuleTypeName(act.modname)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          Al completar:
                        </span>

                        {isReadOnly ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${actRule.colorClass}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${actRule.dotColor}`} />
                            {actRule.label}
                          </span>
                        ) : (
                          <PermissionGate
                            capability="can_manage_competencies"
                            fallback={
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${actRule.colorClass}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${actRule.dotColor}`} />
                                {actRule.label}
                              </span>
                            }
                          >
                            <div className="relative inline-flex items-center">
                              <select
                                value={act.ruleoutcome}
                                onChange={(e) => onUpdateModuleRule(act.cmid, e.target.value)}
                                title={actRule.description}
                                className={`text-[11px] font-medium rounded-md px-2 py-1 border appearance-none pr-6 cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none ${actRule.colorClass}`}
                              >
                                {RULE_OUTCOMES.map((ro) => (
                                  <option key={ro.value} value={ro.value}>
                                    {ro.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="h-3 w-3 absolute right-1.5 pointer-events-none opacity-60" />
                            </div>
                          </PermissionGate>
                        )}
                      </div>

                      {!isReadOnly && (
                        <PermissionGate capability="can_manage_competencies">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRequestUnlinkActivity(act)}
                            className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            title="Desvincular actividad"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
