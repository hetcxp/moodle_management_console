import React, { useState, useMemo, useEffect } from 'react';
import {
  useCompetencyDetail,
  useCompetencyCourses
} from '../hooks/useAdminerQueries';
import { useCompetencyDetailActions } from '../hooks/useCompetencyDetailActions';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { SelectorModal } from '../components/ui/SelectorModal';
import { PermissionGate } from '../components/PermissionGate';
import { useAuth } from '../context/AuthContext';
import { CompetencyReviewsModal } from './competencies/CompetencyReviewsModal';
import { CompetencyDetailHeader } from './competencies/CompetencyDetailHeader';
import { CompetencyCourseCard } from './competencies/CompetencyCourseCard';
import { AddActivityToCompetencyModal } from './competencies/AddActivityToCompetencyModal';
import { CompetencySubcompetenciesTab } from './competencies/CompetencySubcompetenciesTab';
import { CompetencyRuleCard } from './competencies/CompetencyRuleCard';
import { CompetencyUsersTab } from './competencies/CompetencyUsersTab';
import {
  Search,
  Loader2,
  Inbox,
  Plus,
  Layers,
  BookOpen,
  Sparkles,
  Sliders,
  ExternalLink,
  Users,
  Clock
} from 'lucide-react';
import { COMPETENCY_RULE_ALL_CHILDREN } from './competencies/competencyConstants';

export const CompetencyDetailView = ({ frameworkId, competencyId, onBack, onNavigateToDetail }) => {
  const compIdNum = Number(competencyId);
  const frameIdNum = Number(frameworkId);
  const { permissions } = useAuth();
  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const { data: competency, isLoading: compLoading, refetch: refetchCompetency } = useCompetencyDetail(compIdNum);
  const { data: coursesData, isLoading: coursesLoading } = useCompetencyCourses(compIdNum);

  const {
    expandedCourseIds,
    setExpandedCourseIds,
    toggleExpandCourse,
    selectorOpen,
    setSelectorOpen,
    activityModalCourse,
    setActivityModalCourse,
    unlinkCourseTarget,
    setUnlinkCourseTarget,
    unlinkActivityTarget,
    setUnlinkActivityTarget,
    unlinkLoading,
    reviewsModalOpen,
    setReviewsModalOpen,
    handleLinkCourses,
    handleUpdateCourseRule,
    handleConfirmUnlinkCourse,
    handleUpdateModuleRule,
    handleConfirmUnlinkActivity,
    handleOpenAddActivityModal,
    handleAddActivity
  } = useCompetencyDetailActions(compIdNum);

  const [activeTab, setActiveTab] = useState('courses');
  const [search, setSearch] = useState('');
  const [filterRule, setFilterRule] = useState('all');
  const [createSubcompModalOpen, setCreateSubcompModalOpen] = useState(false);
  const [reviewsModalUser, setReviewsModalUser] = useState(null);

  const handleOpenReviews = (user = null) => {
    setReviewsModalUser(user);
    setReviewsModalOpen(true);
  };

  const hasParent = (competency?.parentid || 0) > 0;

  useEffect(() => {
    if (competency && (competency.parentid || 0) > 0 && !['courses', 'users'].includes(activeTab)) {
      setActiveTab('courses');
    }
  }, [competency, activeTab]);

  const courses = useMemo(() => coursesData?.courses || [], [coursesData]);
  const subcompetencyCourses = useMemo(() => coursesData?.subcompetencycourses || [], [coursesData]);
  const subcompetencies = useMemo(() => competency?.children || [], [competency?.children]);
  const pendingReviewsCount = competency?.pendingreviewscount || 0;
  const isRuleActive = competency?.ruletype === COMPETENCY_RULE_ALL_CHILDREN;

  // Expand all by default if there are few courses
  useEffect(() => {
    if (courses.length > 0 && courses.length <= 3 && expandedCourseIds.size === 0) {
      setExpandedCourseIds(new Set(courses.map((c) => c.id)));
    }
  }, [courses]);

  const totalSubcompCourses = useMemo(() => {
    return subcompetencyCourses.reduce((acc, sc) => acc + (sc.courses?.length || 0), 0);
  }, [subcompetencyCourses]);

  const totalSubcompActivities = useMemo(() => {
    return subcompetencyCourses.reduce((acc, sc) => {
      return acc + (sc.courses || []).reduce((cacc, c) => cacc + (c.activities?.length || 0), 0);
    }, 0);
  }, [subcompetencyCourses]);

  const totalDirectActivities = useMemo(() => {
    return courses.reduce((acc, c) => acc + (c.activities?.length || 0), 0);
  }, [courses]);

  const totalActivitiesCount = totalDirectActivities + (!hasParent ? totalSubcompActivities : 0);
  const totalCoursesCount = courses.length + (!hasParent ? totalSubcompCourses : 0);

  const completeRuleDirectCourses = useMemo(() => {
    return courses.filter((c) => c.ruleoutcome === 3).length;
  }, [courses]);

  const completeRuleSubcompCourses = useMemo(() => {
    return subcompetencyCourses.reduce((acc, sc) => {
      return acc + (sc.courses || []).filter((c) => c.ruleoutcome === 3).length;
    }, 0);
  }, [subcompetencyCourses]);

  const completeRuleCoursesCount = completeRuleDirectCourses + (!hasParent ? completeRuleSubcompCourses : 0);

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

  if (compLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando detalles de la competencia...</p>
      </div>
    );
  }

  const effectiveFrameworkName = competency?.frameworkname || 'Marco de Competencias';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header, KPIs and Description */}
      <CompetencyDetailHeader
        competency={competency}
        compIdNum={compIdNum}
        frameIdNum={frameIdNum}
        effectiveFrameworkName={effectiveFrameworkName}
        pendingReviewsCount={pendingReviewsCount}
        totalCoursesCount={totalCoursesCount}
        totalActivitiesCount={totalActivitiesCount}
        completeRuleCoursesCount={completeRuleCoursesCount}
        subcompetenciesCount={competency?.childrencount || subcompetencies.length}
        onBack={onBack}
        onNavigateToDetail={onNavigateToDetail}
        onOpenReviews={() => handleOpenReviews(null)}
      />

      {/* Tabs Navigation */}
      {!hasParent ? (
        <div className="flex items-center gap-2 border-b border-border/80 pb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'courses'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Cursos y Actividades</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'courses' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {totalCoursesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rule')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'rule'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Reglas de Completado</span>
            {isRuleActive && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subcompetencies')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'subcompetencies'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Subcompetencias</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'subcompetencies' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {competency?.childrencount ?? subcompetencies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Usuarios</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-border/80 pb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'courses'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Cursos y Actividades</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'courses' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {courses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Usuarios</span>
          </button>
        </div>
      )}

      {/* Tab: Subcompetencias */}
      {activeTab === 'subcompetencies' && (
        <CompetencySubcompetenciesTab
          parentCompetency={competency}
          subcompetencies={subcompetencies}
          frameworkId={frameIdNum}
          hasManagePermission={hasManageCompetencies}
          onNavigateToDetail={onNavigateToDetail}
          onRefetchParent={refetchCompetency}
          isCreateModalOpen={createSubcompModalOpen}
          onCloseCreateModal={() => setCreateSubcompModalOpen(false)}
        />
      )}

      {/* Tab: Regla de Completado */}
      {activeTab === 'rule' && (
        <CompetencyRuleCard
          competency={competency}
          hasManagePermission={hasManageCompetencies}
        />
      )}

      {/* Tab: Cursos y Actividades */}
      {activeTab === 'courses' && (
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
      )}

      {/* Tab: Usuarios */}
      {activeTab === 'users' && (
        <CompetencyUsersTab
          competencyId={compIdNum}
          competencyName={competency?.shortname || ''}
          courses={courses}
          onNavigateToDetail={onNavigateToDetail}
          onOpenReviews={handleOpenReviews}
          pendingReviewsCount={pendingReviewsCount}
        />
      )}

      {/* Modals */}
      <CompetencyReviewsModal
        open={reviewsModalOpen}
        onClose={() => {
          setReviewsModalOpen(false);
          setReviewsModalUser(null);
        }}
        frameworkId={frameIdNum}
        competencyId={compIdNum}
        userId={reviewsModalUser?.userid || 0}
        initialSearch={reviewsModalUser?.fullname || ''}
        title={reviewsModalUser ? `Revisiones: ${reviewsModalUser.fullname}` : `Revisiones: ${competency?.shortname || 'Competencia'}`}
      />

      <SelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        title="Vincular Cursos a la Competencia"
        entityType="courses"
        onSelect={handleLinkCourses}
        multiple={true}
      />

      {/* Modal for Adding an Activity to Course */}
      {activityModalCourse && (
        <AddActivityToCompetencyModal
          open={!!activityModalCourse}
          onClose={() => setActivityModalCourse(null)}
          course={activityModalCourse}
          competencyId={compIdNum}
          onAddActivity={handleAddActivity}
        />
      )}

      {/* Confirmation Dialog for Unlinking Course */}
      <Dialog
        open={!!unlinkCourseTarget}
        onClose={() => setUnlinkCourseTarget(null)}
        title="Confirmar Desvinculación de Curso"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas desvincular el curso{' '}
            <strong className="text-foreground font-semibold">"{unlinkCourseTarget?.fullname}"</strong> de esta competencia?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setUnlinkCourseTarget(null)}
              disabled={unlinkLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnlinkCourse}
              disabled={unlinkLoading}
              className="gap-2"
            >
              {unlinkLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Desvincular Curso
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog for Unlinking Activity */}
      <Dialog
        open={!!unlinkActivityTarget}
        onClose={() => setUnlinkActivityTarget(null)}
        title="Confirmar Desvinculación de Actividad"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas desvincular la actividad{' '}
            <strong className="text-foreground font-semibold">"{unlinkActivityTarget?.name}"</strong> de esta competencia?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setUnlinkActivityTarget(null)}
              disabled={unlinkLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnlinkActivity}
              disabled={unlinkLoading}
              className="gap-2"
            >
              {unlinkLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Desvincular Actividad
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
