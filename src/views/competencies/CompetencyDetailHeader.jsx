import React from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PermissionGate } from '../../components/PermissionGate';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plus,
  Clock,
  Layers,
  CheckCircle2
} from 'lucide-react';

export const CompetencyDetailHeader = ({
  competency,
  compIdNum,
  frameIdNum,
  effectiveFrameworkName,
  pendingReviewsCount,
  totalCoursesCount,
  totalActivitiesCount,
  completeRuleCoursesCount,
  subcompetenciesCount = 0,
  onBack,
  onNavigateToDetail,
  onOpenReviews,
  onOpenLinkCourses,
  onOpenCreateSubcompetency
}) => {
  const hasParent = competency?.parentid > 0;
  const isRuleActive = competency?.ruletype === 'core_competency\\competency_rule_all_children';

  return (
    <>
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4 flex-wrap gap-y-1">
            <button
              onClick={() => onNavigateToDetail ? onNavigateToDetail('competency_framework', frameIdNum) : onBack()}
              className="flex items-center hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {effectiveFrameworkName}
            </button>

            {hasParent && (
              <>
                <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
                <button
                  type="button"
                  onClick={() => onNavigateToDetail ? onNavigateToDetail('competency', { frameworkId: frameIdNum, competencyId: competency.parentid }) : null}
                  className="hover:text-foreground transition-colors max-w-[200px] truncate"
                >
                  {competency.parentname || `Competencia #${competency.parentid}`}
                </button>
              </>
            )}

            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[260px] font-semibold">
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
                {isRuleActive && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Auto-completado Activo
                  </Badge>
                )}
                {hasParent && (
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 text-xs">
                    <Layers className="h-3 w-3 mr-1" />
                    Subcompetencia
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
                {hasParent && (
                  <>
                    {' · '}
                    <span>Hija de: </span>
                    <button
                      type="button"
                      onClick={() => onNavigateToDetail ? onNavigateToDetail('competency', { frameworkId: frameIdNum, competencyId: competency.parentid }) : null}
                      className="font-medium text-foreground hover:underline hover:text-primary transition-colors"
                    >
                      {competency.parentname || `Competencia #${competency.parentid}`}
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Header */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={onOpenReviews}
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
            {!hasParent && (
              <Button
                variant="outline"
                onClick={onOpenCreateSubcompetency}
                className="gap-1.5 shadow-sm text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Subcompetencia</span>
              </Button>
            )}
            <Button
              variant="default"
              onClick={onOpenLinkCourses}
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
        {!hasParent ? (
          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subcompetencias</p>
              <h3 className="text-xl font-bold text-foreground">{subcompetenciesCount}</h3>
            </div>
          </div>
        ) : (
          <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Actividades Totales</p>
              <h3 className="text-xl font-bold text-foreground">{totalActivitiesCount}</h3>
            </div>
          </div>
        )}

        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cursos Vinculados</p>
            <h3 className="text-xl font-bold text-foreground">{totalCoursesCount}</h3>
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
          onClick={onOpenReviews}
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
              onOpenReviews();
            }}
            className="text-xs text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
          >
            {pendingReviewsCount > 0 ? 'Revisar' : 'Ver'}
          </Button>
        </div>
      </div>
    </>
  );
};
