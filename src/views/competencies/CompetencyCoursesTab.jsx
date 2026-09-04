import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { PermissionGate } from '../../components/PermissionGate';
import { CompetencyCourseCard } from './CompetencyCourseCard';
import {
  Search,
  Loader2,
  Inbox,
  Plus,
  Layers,
  BookOpen,
  ExternalLink
} from 'lucide-react';

export const CompetencyCoursesTab = ({
  courses = [],
  subcompetencyCourses = [],
  hasParent = false,
  totalCoursesCount = 0,
  totalSubcompCourses = 0,
  coursesLoading = false,
  expandedCourseIds,
  toggleExpandCourse,
  handleUpdateCourseRule,
  handleOpenAddActivityModal,
  setUnlinkCourseTarget,
  handleUpdateModuleRule,
  setUnlinkActivityTarget,
  setSelectorOpen,
  onNavigateToDetail,
  frameIdNum
}) => {
  const [search, setSearch] = useState('');
  const [filterRule, setFilterRule] = useState('all');

  const filteredCourses = useMemo(() => {
    let result = courses;
    if (filterRule !== 'all') {
      const ruleNum = Number(filterRule);
      result = result.filter((c) => c.ruleoutcome === ruleNum);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullname?.toLowerCase().includes(term) ||
          c.shortname?.toLowerCase().includes(term) ||
          c.idnumber?.toLowerCase().includes(term) ||
          c.categoryname?.toLowerCase().includes(term) ||
          c.activities?.some(
            (a) => a.name?.toLowerCase().includes(term) || a.modname?.toLowerCase().includes(term)
          )
      );
    }
    return result;
  }, [courses, filterRule, search]);

  const filteredSubcompetencyCourses = useMemo(() => {
    if (!subcompetencyCourses || subcompetencyCourses.length === 0) return [];
    const term = search.trim().toLowerCase();
    const ruleNum = filterRule !== 'all' ? Number(filterRule) : null;

    return subcompetencyCourses
      .map((sc) => {
        const subcompMatches = term && (
          sc.competencyname?.toLowerCase().includes(term) ||
          sc.competencyidnumber?.toLowerCase().includes(term)
        );

        const matchingCourses = (sc.courses || []).filter((c) => {
          if (ruleNum !== null && c.ruleoutcome !== ruleNum) {
            return false;
          }
          if (!term || subcompMatches) {
            return true;
          }
          return (
            c.fullname?.toLowerCase().includes(term) ||
            c.shortname?.toLowerCase().includes(term) ||
            c.idnumber?.toLowerCase().includes(term) ||
            c.categoryname?.toLowerCase().includes(term) ||
            c.activities?.some(
              (a) => a.name?.toLowerCase().includes(term) || a.modname?.toLowerCase().includes(term)
            )
          );
        });

        return {
          ...sc,
          courses: matchingCourses
        };
      })
      .filter((sc) => sc.courses.length > 0);
  }, [subcompetencyCourses, filterRule, search]);

  const filteredSubcompCoursesCount = useMemo(() => {
    return filteredSubcompetencyCourses.reduce((acc, sc) => acc + sc.courses.length, 0);
  }, [filteredSubcompetencyCourses]);

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por curso, actividad o subcompetencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filtrar por regla:</span>
            <select
              value={filterRule}
              onChange={(e) => setFilterRule(e.target.value)}
              className="text-xs rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="all">Todas las reglas ({totalCoursesCount})</option>
              <option value="3">Marcar completada (3)</option>
              <option value="1">Adjuntar evidencia (1)</option>
              <option value="2">Enviar a revisión (2)</option>
              <option value="0">Solo vincular (0)</option>
            </select>
          </div>

          <PermissionGate capability="can_manage_competencies">
            <Button
              variant="default"
              size="sm"
              onClick={() => setSelectorOpen(true)}
              className="h-9 gap-1.5 shadow-sm text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Vincular Cursos</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {coursesLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed border-border bg-card">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando cursos y actividades asociadas...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sección 1: Cursos Directos de la Competencia */}
          <div className="space-y-3">
            {!hasParent && (
              <div className="flex items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Cursos Vinculados Directamente
                  </h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-semibold">
                    {filteredCourses.length} de {courses.length}
                  </span>
                </div>

                <PermissionGate capability="can_manage_competencies">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectorOpen(true)}
                    className="text-xs gap-1.5 h-8"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Vincular Curso
                  </Button>
                </PermissionGate>
              </div>
            )}

            {filteredCourses.length === 0 ? (
              hasParent ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border bg-card/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">No hay cursos vinculados</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                    {search || filterRule !== 'all'
                      ? 'No se encontraron cursos que coincidan con los filtros aplicados.'
                      : 'Esta subcompetencia aún no está vinculada a ningún curso de la plataforma.'}
                  </p>
                  <PermissionGate capability="can_manage_competencies">
                    <Button
                      variant="default"
                      onClick={() => setSelectorOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Vincular Cursos Ahora
                    </Button>
                  </PermissionGate>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border bg-card/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">
                        {search || filterRule !== 'all'
                          ? 'No hay cursos directos coincidentes con los filtros'
                          : 'Sin cursos vinculados directamente a la competencia principal'}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {search || filterRule !== 'all'
                          ? 'Prueba modificando la búsqueda o el filtro de regla.'
                          : 'Esta competencia agrupa cursos a través de sus subcompetencias o puedes vincularle cursos directamente.'}
                      </p>
                    </div>
                  </div>
                  <PermissionGate capability="can_manage_competencies">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectorOpen(true)}
                      className="text-xs gap-1.5 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Vincular Curso Directo
                    </Button>
                  </PermissionGate>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {filteredCourses.map((course) => (
                  <CompetencyCourseCard
                    key={course.id}
                    course={course}
                    isExpanded={expandedCourseIds.has(course.id)}
                    onToggleExpand={toggleExpandCourse}
                    onUpdateCourseRule={handleUpdateCourseRule}
                    onOpenAddActivityModal={handleOpenAddActivityModal}
                    onRequestUnlinkCourse={setUnlinkCourseTarget}
                    onUpdateModuleRule={handleUpdateModuleRule}
                    onRequestUnlinkActivity={setUnlinkActivityTarget}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sección 2: Cursos de Subcompetencias (Modo Lectura) */}
          {!hasParent && (subcompetencyCourses.length > 0 || totalSubcompCourses > 0) && (
            <div className="space-y-4 pt-4 border-t border-border/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">
                        Cursos de las Subcompetencias
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                        Modo Lectura
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cursos y actividades asignadas a las subcompetencias hijas.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-medium text-muted-foreground self-start sm:self-center">
                  {filteredSubcompCoursesCount} curso(s) en subcompetencias
                </span>
              </div>

              {totalSubcompCourses === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border bg-card/40 text-center">
                  <p className="text-xs text-muted-foreground">
                    Las subcompetencias de esta competencia aún no tienen cursos vinculados.
                  </p>
                </div>
              ) : filteredSubcompetencyCourses.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border bg-card/40 text-center">
                  <p className="text-xs text-muted-foreground">
                    No se encontraron cursos en subcompetencias que coincidan con la búsqueda o el filtro de regla.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubcompetencyCourses.map((sc) => (
                    <div
                      key={sc.competencyid}
                      className="space-y-3 rounded-2xl border border-border/80 bg-card/30 p-3.5 sm:p-4 shadow-xs transition-all"
                    >
                      {/* Subcompetency header row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Subcompetencia:
                          </span>
                          <span className="font-semibold text-sm text-foreground truncate">
                            {sc.competencyname}
                          </span>
                          {sc.competencyidnumber && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {sc.competencyidnumber}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            {sc.courses.length} curso(s)
                          </Badge>
                        </div>

                        {onNavigateToDetail && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onNavigateToDetail('competency', {
                                frameworkId: frameIdNum,
                                competencyId: sc.competencyid
                              })
                            }
                            className="text-xs text-primary hover:text-primary gap-1 self-start sm:self-auto h-7 px-2.5"
                            title={`Ir al detalle de ${sc.competencyname}`}
                          >
                            <span>Ver Subcompetencia</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Subcompetency courses list */}
                      <div className="space-y-2.5">
                        {sc.courses.map((course) => {
                          const uniqueKey = `subcomp-${sc.competencyid}-${course.id}`;
                          return (
                            <CompetencyCourseCard
                              key={uniqueKey}
                              course={course}
                              isReadOnly={true}
                              subcompetencyInfo={{
                                id: sc.competencyid,
                                name: sc.competencyname,
                                idnumber: sc.competencyidnumber
                              }}
                              isExpanded={expandedCourseIds.has(uniqueKey)}
                              onToggleExpand={() => toggleExpandCourse(uniqueKey)}
                              onNavigateToSubcompetency={() =>
                                onNavigateToDetail
                                  ? onNavigateToDetail('competency', {
                                      frameworkId: frameIdNum,
                                      competencyId: sc.competencyid
                                    })
                                  : null
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
