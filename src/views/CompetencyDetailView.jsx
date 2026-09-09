import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  useCompetencyDetail,
  useCompetencyCourses,
  useCompetencyUsers
} from '../hooks/useAdminerQueries';
import { useCompetencyDetailActions } from '../hooks/useCompetencyDetailActions';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { SelectorModal } from '../components/ui/SelectorModal';
import { useAuth } from '../context/AuthContext';
import { CompetencyReviewsModal } from './competencies/CompetencyReviewsModal';
import { CompetencyDetailHeader } from './competencies/CompetencyDetailHeader';
import { CompetencyCoursesTab } from './competencies/CompetencyCoursesTab';
import { AddActivityToCompetencyModal } from './competencies/AddActivityToCompetencyModal';
import { CompetencySubcompetenciesTab } from './competencies/CompetencySubcompetenciesTab';
import { CompetencyRuleCard } from './competencies/CompetencyRuleCard';
import { CompetencyUsersTab } from './competencies/CompetencyUsersTab';
import {
  Loader2,
  Layers,
  BookOpen,
  Sparkles,
  Users
} from 'lucide-react';
import { COMPETENCY_RULE_ALL_CHILDREN } from './competencies/competencyConstants';

export const CompetencyDetailView = ({ frameworkId, competencyId, onBack, onNavigateToDetail }) => {
  const [, setLocation] = useLocation();
  const handleBack = onBack || (() => setLocation(`/competencies/${frameworkId}`));
  const handleNavigateToDetail = onNavigateToDetail || ((entity, id) => {
    if (entity === 'course') {
      setLocation(`/courses/${id}`);
    } else if (entity === 'user') {
      setLocation(`/users/${id}`);
    } else if (entity === 'competency') {
      if (typeof id === 'object' && id.frameworkId && id.competencyId) {
        setLocation(`/competencies/${id.frameworkId}/competency/${id.competencyId}`);
      } else {
        setLocation(`/competencies/${id}`);
      }
    } else {
      setLocation(`/${entity}s/${id}`);
    }
  });

  const compIdNum = Number(competencyId);
  const frameIdNum = Number(frameworkId);
  const { permissions } = useAuth();
  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const { data: competency, isLoading: compLoading, refetch: refetchCompetency } = useCompetencyDetail(compIdNum);
  const { data: coursesData, isLoading: coursesLoading } = useCompetencyCourses(compIdNum);

  const defaultUsersParams = useMemo(() => ({
    search: '',
    status: 'all',
    courseid: 0,
    page: 0,
    perpage: 20,
    sort: 'fullname',
    dir: 'ASC'
  }), []);
  const { data: usersData } = useCompetencyUsers(compIdNum, defaultUsersParams);
  const totalUsersCount = usersData?.totalcount ?? 0;

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
    if (courses.length > 0 && courses.length <= 3) {
      setExpandedCourseIds((prev) => (prev.size === 0 ? new Set(courses.map((c) => c.id)) : prev));
    }
  }, [courses, setExpandedCourseIds]);

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
        onBack={handleBack}
        onNavigateToDetail={handleNavigateToDetail}
        onOpenReviews={() => handleOpenReviews(null)}
      />

      {/* Tabs Navigation */}
      {!hasParent ? (
        <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              activeTab === 'courses'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Cursos y Actividades</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {totalCoursesCount}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              activeTab === 'rule'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              activeTab === 'subcompetencies'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Subcompetencias</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {competency?.childrencount ?? subcompetencies.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Usuarios</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {totalUsersCount}
            </Badge>
          </button>
        </div>
      ) : (
        <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              activeTab === 'courses'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Cursos y Actividades</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {courses.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Usuarios</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {totalUsersCount}
            </Badge>
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
          onNavigateToDetail={handleNavigateToDetail}
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
        <CompetencyCoursesTab
          courses={courses}
          subcompetencyCourses={subcompetencyCourses}
          hasParent={hasParent}
          totalCoursesCount={totalCoursesCount}
          totalSubcompCourses={totalSubcompCourses}
          coursesLoading={coursesLoading}
          expandedCourseIds={expandedCourseIds}
          toggleExpandCourse={toggleExpandCourse}
          handleUpdateCourseRule={handleUpdateCourseRule}
          handleOpenAddActivityModal={handleOpenAddActivityModal}
          setUnlinkCourseTarget={setUnlinkCourseTarget}
          handleUpdateModuleRule={handleUpdateModuleRule}
          setUnlinkActivityTarget={setUnlinkActivityTarget}
          setSelectorOpen={setSelectorOpen}
          onNavigateToDetail={handleNavigateToDetail}
          frameIdNum={frameIdNum}
        />
      )}

      {/* Tab: Usuarios */}
      {activeTab === 'users' && (
        <CompetencyUsersTab
          competencyId={compIdNum}
          competencyName={competency?.shortname || ''}
          courses={courses}
          onNavigateToDetail={handleNavigateToDetail}
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
