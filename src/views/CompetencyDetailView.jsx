import React, { useState, useMemo, useEffect } from 'react';
import {
  useCompetencyDetail,
  useCompetencyCourses
} from '../hooks/useAdminerQueries';
import { useCompetencyDetailActions } from '../hooks/useCompetencyDetailActions';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { SelectorModal } from '../components/ui/SelectorModal';
import { PermissionGate } from '../components/PermissionGate';
import { CompetencyReviewsModal } from './competencies/CompetencyReviewsModal';
import { CompetencyDetailHeader } from './competencies/CompetencyDetailHeader';
import { CompetencyCourseCard } from './competencies/CompetencyCourseCard';
import { AddActivityToCompetencyModal } from './competencies/AddActivityToCompetencyModal';
import {
  Search,
  Loader2,
  Inbox,
  Plus
} from 'lucide-react';

export const CompetencyDetailView = ({ frameworkId, competencyId, onBack, onNavigateToDetail }) => {
  const compIdNum = Number(competencyId);
  const frameIdNum = Number(frameworkId);

  const { data: competency, isLoading: compLoading } = useCompetencyDetail(compIdNum);
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

  const [search, setSearch] = useState('');
  const [filterRule, setFilterRule] = useState('all');

  const courses = useMemo(() => coursesData?.courses || [], [coursesData]);
  const pendingReviewsCount = competency?.pendingreviewscount || 0;

  // Expand all by default if there are few courses
  useEffect(() => {
    if (courses.length > 0 && courses.length <= 3 && expandedCourseIds.size === 0) {
      setExpandedCourseIds(new Set(courses.map((c) => c.id)));
    }
  }, [courses]);

  const totalActivitiesCount = useMemo(() => {
    return courses.reduce((acc, c) => acc + (c.activities?.length || 0), 0);
  }, [courses]);

  const completeRuleCoursesCount = useMemo(() => {
    return courses.filter((c) => c.ruleoutcome === 3).length;
  }, [courses]);

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
        totalCoursesCount={courses.length}
        totalActivitiesCount={totalActivitiesCount}
        completeRuleCoursesCount={completeRuleCoursesCount}
        onBack={onBack}
        onNavigateToDetail={onNavigateToDetail}
        onOpenReviews={() => setReviewsModalOpen(true)}
        onOpenLinkCourses={() => setSelectorOpen(true)}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por curso o actividad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filtrar por regla:</span>
            <select
              value={filterRule}
              onChange={(e) => setFilterRule(e.target.value)}
              className="text-xs rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="all">Todas las reglas ({courses.length})</option>
              <option value="3">Marcar completada (3)</option>
              <option value="1">Adjuntar evidencia (1)</option>
              <option value="2">Enviar a revisión (2)</option>
              <option value="0">Solo vincular (0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses Master-Detail List */}
      <div className="space-y-3">
        {coursesLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed border-border bg-card">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando cursos y actividades asociadas...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border bg-card/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No hay cursos vinculados</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              {search || filterRule !== 'all'
                ? 'No se encontraron cursos que coincidan con los filtros aplicados.'
                : 'Esta competencia aún no está vinculada a ningún curso de la plataforma.'}
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
          filteredCourses.map((course) => (
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
          ))
        )}
      </div>

      {/* Modals */}
      <CompetencyReviewsModal
        open={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        frameworkId={frameIdNum}
        competencyId={compIdNum}
        title={`Revisiones: ${competency?.shortname || 'Competencia'}`}
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
