import React, { useState, useMemo } from 'react';
import {
  useCompetencyDetail,
  useCompetencyCourses,
  useCompetencyCourseAction,
  useCourseAvailableActivities,
  useModuleCompetencyAction
} from '../hooks/useAdminerQueries';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { SelectorModal } from '../components/ui/SelectorModal';
import { PermissionGate } from '../components/PermissionGate';
import { CompetencyReviewsModal } from './competencies/CompetencyReviewsModal';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  Loader2,
  CheckCircle2,
  FileCheck,
  Clock,
  Link as LinkIcon,
  HelpCircle,
  FileText,
  HelpCircle as QuizIcon,
  MessageSquare,
  Layers,
  Sparkles,
  Info,
  FolderTree,
  Inbox
} from 'lucide-react';

const RULE_OUTCOMES = [
  {
    value: 3,
    label: 'Marcar completada',
    fullLabel: 'Marcar competencia como completada',
    description: 'Al completar el curso o actividad, la competencia se marca como completada automáticamente.',
    colorClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500'
  },
  {
    value: 1,
    label: 'Adjuntar evidencia',
    fullLabel: 'Adjuntar evidencia de competencia',
    description: 'Al completar el curso o actividad, se adjunta automáticamente evidencia de la competencia.',
    colorClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/20',
    icon: FileCheck,
    dotColor: 'bg-sky-500'
  },
  {
    value: 2,
    label: 'Enviar a revisión',
    fullLabel: 'Enviar competencia a revisión',
    description: 'Al completar el curso o actividad, se envía una solicitud de revisión al docente.',
    colorClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
    icon: Clock,
    dotColor: 'bg-amber-500'
  },
  {
    value: 0,
    label: 'Solo vincular',
    fullLabel: 'Solo vincular (Sin acción automática)',
    description: 'La competencia está asociada para seguimiento, pero no realiza acciones automáticas.',
    colorClass: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
    icon: LinkIcon,
    dotColor: 'bg-muted-foreground'
  }
];

const getModuleIcon = (modname) => {
  switch (modname?.toLowerCase()) {
    case 'quiz':
      return QuizIcon;
    case 'assign':
      return FileCheck;
    case 'h5pactivity':
    case 'h5p':
      return Sparkles;
    case 'forum':
      return MessageSquare;
    case 'page':
    case 'book':
    case 'lesson':
      return FileText;
    default:
      return Layers;
  }
};

const getModuleTypeName = (modname) => {
  const map = {
    quiz: 'Cuestionario',
    assign: 'Tarea',
    h5pactivity: 'Contenido H5P',
    h5p: 'Contenido H5P',
    forum: 'Foro',
    page: 'Página',
    book: 'Libro',
    lesson: 'Lección',
    scorm: 'Paquete SCORM',
    url: 'Enlace web',
    feedback: 'Encuesta',
    choice: 'Consulta',
    glossary: 'Glosario',
    resource: 'Recurso / Archivo'
  };
  return map[modname?.toLowerCase()] || modname || 'Actividad';
};

export const CompetencyDetailView = ({ frameworkId, competencyId, onBack, onNavigateToDetail }) => {
  const { addToast } = useToast();

  const compIdNum = Number(competencyId);
  const frameIdNum = Number(frameworkId);

  const { data: competency, isLoading: compLoading } = useCompetencyDetail(compIdNum);
  const { data: coursesData, isLoading: coursesLoading, isFetching: coursesFetching } = useCompetencyCourses(compIdNum);
  const { mutateAsync: performCourseAction } = useCompetencyCourseAction();
  const { mutateAsync: performModuleAction } = useModuleCompetencyAction();

  const [search, setSearch] = useState('');
  const [filterRule, setFilterRule] = useState('all');
  const [expandedCourseIds, setExpandedCourseIds] = useState(new Set());

  // Link courses modal state
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedInitialRule, setSelectedInitialRule] = useState(3);

  // Link activities modal state
  const [activityModalCourse, setActivityModalCourse] = useState(null);
  const [selectedActivityCmid, setSelectedActivityCmid] = useState('');
  const [selectedActivityRule, setSelectedActivityRule] = useState(3);
  const [activitySaving, setActivitySaving] = useState(false);

  // Unlink confirm modal state
  const [unlinkCourseTarget, setUnlinkCourseTarget] = useState(null);
  const [unlinkActivityTarget, setUnlinkActivityTarget] = useState(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  // Reviews modal state
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  const courses = useMemo(() => coursesData?.courses || [], [coursesData]);
  const pendingReviewsCount = competency?.pendingreviewscount || 0;

  // Expand all by default if there are few courses
  React.useEffect(() => {
    if (courses.length > 0 && courses.length <= 3 && expandedCourseIds.size === 0) {
      setExpandedCourseIds(new Set(courses.map(c => c.id)));
    }
  }, [courses]);

  const totalActivitiesCount = useMemo(() => {
    return courses.reduce((acc, c) => acc + (c.activities?.length || 0), 0);
  }, [courses]);

  const completeRuleCoursesCount = useMemo(() => {
    return courses.filter(c => c.ruleoutcome === 3).length;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let result = courses;
    if (filterRule !== 'all') {
      const ruleNum = Number(filterRule);
      result = result.filter(c => c.ruleoutcome === ruleNum);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(c =>
        c.fullname?.toLowerCase().includes(term) ||
        c.shortname?.toLowerCase().includes(term) ||
        c.idnumber?.toLowerCase().includes(term) ||
        c.categoryname?.toLowerCase().includes(term) ||
        c.activities?.some(a => a.name?.toLowerCase().includes(term) || a.modname?.toLowerCase().includes(term))
      );
    }
    return result;
  }, [courses, filterRule, search]);

  const toggleExpandCourse = (courseId) => {
    setExpandedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleLinkCourses = async (courseIds) => {
    if (!compIdNum || courseIds.length === 0) return;
    try {
      const res = await performCourseAction({
        action: 'add',
        competencyid: compIdNum,
        courseids: courseIds,
        ruleoutcome: selectedInitialRule
      });
      addToast({
        type: 'success',
        title: 'Cursos vinculados',
        description: res.message || `${courseIds.length} curso(s) vinculados a la competencia.`
      });
      // Expand newly added courses
      setExpandedCourseIds(prev => new Set([...prev, ...courseIds]));
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al vincular cursos',
        description: err.message
      });
    }
  };

  const handleUpdateCourseRule = async (courseId, newRule) => {
    try {
      await performCourseAction({
        action: 'update_rule',
        competencyid: compIdNum,
        courseids: [courseId],
        ruleoutcome: Number(newRule)
      });
      addToast({
        type: 'success',
        title: 'Regla del curso actualizada',
        description: 'La regla de finalización para el curso ha sido actualizada exitosamente.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al actualizar regla',
        description: err.message
      });
    }
  };

  const handleConfirmUnlinkCourse = async () => {
    if (!unlinkCourseTarget) return;
    setUnlinkLoading(true);
    try {
      await performCourseAction({
        action: 'remove',
        competencyid: compIdNum,
        courseids: [unlinkCourseTarget.id]
      });
      addToast({
        type: 'success',
        title: 'Curso desvinculado',
        description: `El curso "${unlinkCourseTarget.fullname}" fue desvinculado de la competencia.`
      });
      setUnlinkCourseTarget(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al desvincular curso',
        description: err.message
      });
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleUpdateModuleRule = async (cmid, newRule) => {
    try {
      await performModuleAction({
        action: 'update_rule',
        competencyid: compIdNum,
        cmid: Number(cmid),
        ruleoutcome: Number(newRule)
      });
      addToast({
        type: 'success',
        title: 'Regla de actividad actualizada',
        description: 'La regla de compleción de la actividad fue guardada.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al actualizar actividad',
        description: err.message
      });
    }
  };

  const handleConfirmUnlinkActivity = async () => {
    if (!unlinkActivityTarget) return;
    setUnlinkLoading(true);
    try {
      await performModuleAction({
        action: 'remove',
        competencyid: compIdNum,
        cmid: unlinkActivityTarget.cmid
      });
      addToast({
        type: 'success',
        title: 'Actividad desvinculada',
        description: `La actividad "${unlinkActivityTarget.name}" fue desvinculada de la competencia.`
      });
      setUnlinkActivityTarget(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al desvincular actividad',
        description: err.message
      });
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleOpenAddActivityModal = (course) => {
    setActivityModalCourse(course);
    setSelectedActivityCmid('');
    setSelectedActivityRule(3);
  };

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
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button
              onClick={() => onNavigateToDetail ? onNavigateToDetail('competency_framework', frameIdNum) : onBack()}
              className="flex items-center hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {effectiveFrameworkName}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">
              {competency?.shortname || `Competencia #${compIdNum}`}
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {competency?.shortname}
                </h1>
                {competency?.idnumber && (
                  <Badge variant="outline" className="font-mono text-xs font-medium">
                    {competency.idnumber}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pertenece al marco:{' '}
                <button
                  type="button"
                  onClick={() => onNavigateToDetail ? onNavigateToDetail('competency_framework', frameIdNum) : onBack()}
                  className="font-medium text-foreground hover:underline hover:text-primary transition-colors"
                >
                  {effectiveFrameworkName}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Header */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => setReviewsModalOpen(true)}
            title="Ver revisiones pendientes"
            className="gap-2 shadow-sm border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Revisiones Pendientes</span>
            {pendingReviewsCount > 0 && (
              <Badge variant="warning" className="ml-1 px-1.5 py-0.5 text-[10px] font-bold">
                {pendingReviewsCount}
              </Badge>
            )}
          </Button>

          <PermissionGate capability="can_manage_competencies">
            <Button
              variant="primary"
              onClick={() => setSelectorOpen(true)}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Vincular Cursos
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Description if present */}
      {competency?.description && (
        <div
          className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm text-sm text-muted-foreground max-w-4xl prose dark:prose-invert prose-sm"
          dangerouslySetInnerHTML={{ __html: competency.description }}
        />
      )}

      {/* Standalone KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cursos Vinculados</p>
            <h3 className="text-xl font-bold text-foreground">{courses.length}</h3>
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Actividades Clave</p>
            <h3 className="text-xl font-bold text-foreground">{totalActivitiesCount}</h3>
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Con Auto-Completado</p>
            <h3 className="text-xl font-bold text-foreground">{completeRuleCoursesCount} curso(s)</h3>
          </div>
        </div>

        <div
          onClick={() => setReviewsModalOpen(true)}
          className={`bg-card/60 backdrop-blur-md rounded-2xl border p-5 shadow-sm flex items-center justify-between gap-3 transition-all cursor-pointer hover:border-amber-500/50 ${pendingReviewsCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`p-2.5 rounded-xl shrink-0 ${pendingReviewsCount > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">Revisiones Pendientes</p>
              <h3 className="text-xl font-bold text-foreground">{pendingReviewsCount}</h3>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setReviewsModalOpen(true);
            }}
            className="text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
          >
            {pendingReviewsCount > 0 ? 'Revisar' : 'Ver'}
          </Button>
        </div>
      </div>

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
            <PermissionGate permission="can_manage_competencies">
              <Button
                variant="primary"
                onClick={() => setSelectorOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Vincular Cursos Ahora
              </Button>
            </PermissionGate>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isExpanded = expandedCourseIds.has(course.id);
            const activities = course.activities || [];
            const currentRule = RULE_OUTCOMES.find(r => r.value === course.ruleoutcome) || RULE_OUTCOMES[0];

            return (
              <div
                key={course.id}
                className="rounded-xl border border-border bg-card shadow-sm transition-all overflow-hidden"
              >
                {/* Course Main Row */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card hover:bg-muted/30 transition-colors">
                  {/* Left: Course Info & Expand Button */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => toggleExpandCourse(course.id)}
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
                          onClick={() => toggleExpandCourse(course.id)}
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
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <button
                          onClick={() => toggleExpandCourse(course.id)}
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

                      <PermissionGate
                        permission="can_manage_competencies"
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
                            onChange={(e) => handleUpdateCourseRule(course.id, e.target.value)}
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
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <PermissionGate permission="can_manage_competencies">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAddActivityModal(course)}
                          className="text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 h-8"
                          title="Vincular actividad del curso"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Actividad</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setUnlinkCourseTarget(course)}
                          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          title="Desvincular curso"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </PermissionGate>

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

                      <PermissionGate permission="can_manage_competencies">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAddActivityModal(course)}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Asociar Actividad
                        </Button>
                      </PermissionGate>
                    </div>

                    {activities.length === 0 ? (
                      <div className="py-6 px-4 text-center rounded-lg border border-dashed border-border/80 bg-background/50">
                        <p className="text-xs text-muted-foreground">
                          No hay actividades específicas vinculadas a esta competencia en este curso.
                        </p>
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                          Puedes asociar exámenes o tareas clave para que al completarlas se registre la competencia.
                        </p>
                        <PermissionGate permission="can_manage_competencies">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAddActivityModal(course)}
                            className="mt-2 text-xs text-primary gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Vincular Primera Actividad
                          </Button>
                        </PermissionGate>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {activities.map((act) => {
                          const ModIcon = getModuleIcon(act.modname);
                          const actRule = RULE_OUTCOMES.find(r => r.value === act.ruleoutcome) || RULE_OUTCOMES[0];

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

                                  <PermissionGate
                                    permission="can_manage_competencies"
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
                                        onChange={(e) => handleUpdateModuleRule(act.cmid, e.target.value)}
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
                                </div>

                                <PermissionGate permission="can_manage_competencies">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setUnlinkActivityTarget(act)}
                                    className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                    title="Desvincular actividad"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </PermissionGate>
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
          })
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
          onAddActivity={async (cmid, ruleoutcome) => {
            await performModuleAction({
              action: 'add',
              competencyid: compIdNum,
              cmid,
              ruleoutcome
            });
            addToast({
              type: 'success',
              title: 'Actividad vinculada',
              description: 'La actividad clave fue asociada a la competencia exitosamente.'
            });
            setActivityModalCourse(null);
          }}
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

// Subcomponent for selecting and adding an activity from a course
const AddActivityToCompetencyModal = ({ open, onClose, course, competencyId, onAddActivity }) => {
  const { data: activitiesData, isLoading, isError, error, refetch } = useCourseAvailableActivities(course?.id, competencyId);
  const [selectedCmid, setSelectedCmid] = useState('');
  const [ruleOutcome, setRuleOutcome] = useState(3);
  const [saving, setSaving] = useState(false);

  const activities = activitiesData?.activities || [];
  const unlinkedActivities = activities.filter(a => a.islinked === 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedCmid) return;
    setSaving(true);
    try {
      await onAddActivity(Number(selectedCmid), Number(ruleOutcome));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span>Vincular Actividad Clave</span>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <p className="text-xs text-muted-foreground">
          Curso: <strong className="text-foreground">{course?.fullname}</strong>
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Cargando actividades del curso...</p>
          </div>
        ) : isError ? (
          <div className="py-4 px-3 text-center text-xs text-destructive bg-destructive/10 rounded-lg space-y-2">
            <p className="font-semibold">Error al cargar actividades: {error?.message || 'Error desconocido'}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : unlinkedActivities.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground bg-muted/40 rounded-lg p-4">
            {activities.length === 0
              ? 'Este curso no contiene actividades creadas actualmente.'
              : 'Todas las actividades de este curso ya están vinculadas a la competencia.'}
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Selecciona la Actividad del Curso:
              </label>
              <select
                value={selectedCmid}
                onChange={(e) => setSelectedCmid(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Elige una actividad --</option>
                {unlinkedActivities.map((act) => (
                  <option key={act.cmid} value={act.cmid}>
                    [{getModuleTypeName(act.modname)}] {act.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Regla al completar la actividad:
              </label>
              <select
                value={ruleOutcome}
                onChange={(e) => setRuleOutcome(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {RULE_OUTCOMES.map((ro) => (
                  <option key={ro.value} value={ro.value}>
                    {ro.fullLabel}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {RULE_OUTCOMES.find(r => r.value === ruleOutcome)?.description}
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving || unlinkedActivities.length === 0 || !selectedCmid}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Vincular Actividad
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
