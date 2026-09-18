import React, { useMemo } from 'react';
import { BookOpen, FolderTree, Users, TrendingUp, CheckCircle2, EyeOff } from 'lucide-react';

export const CategoryDetailKpis = ({ courses = [], subcategories = [] }) => {
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const visibleCourses = courses.filter((c) => Number(c.visible) === 1).length;
    const hiddenCourses = courses.filter((c) => Number(c.visible) === 0).length;
    const totalSubcats = subcategories.length;

    const totalEnrolments = courses.reduce((acc, c) => acc + (Number(c.enrolledcount) || 0), 0);
    const coursesWithEnrolments = courses.filter((c) => (Number(c.enrolledcount) || 0) > 0).length;
    const totalCompleted = courses.reduce((acc, c) => acc + (Number(c.completedcount) || 0), 0);
    const avgProgress = totalEnrolments > 0 ? Math.round((totalCompleted / totalEnrolments) * 100) : 0;

    return {
      totalCourses,
      visibleCourses,
      hiddenCourses,
      totalSubcats,
      totalEnrolments,
      coursesWithEnrolments,
      totalCompleted,
      avgProgress,
    };
  }, [courses, subcategories]);

  return (
    <section aria-label="Indicadores clave de la categoría" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Cursos */}
      <div
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Total de cursos en esta categoría con desglose de visibilidad"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cursos</p>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{stats.totalCourses}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-border/40">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {stats.visibleCourses} activos
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
            <EyeOff className="h-3.5 w-3.5" />
            {stats.hiddenCourses} ocultos
          </span>
        </div>
      </div>

      {/* Card 2: Subcategorías */}
      <div
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Subcategorías anidadas directamente bajo esta categoría"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <FolderTree className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subcategorías</p>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{stats.totalSubcats}</h3>
          </div>
        </div>
        <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground font-medium">
          <span>Estructura anidada</span>
        </div>
      </div>

      {/* Card 3: Matriculados Totales */}
      <div
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Suma total de inscripciones activas en los cursos de esta categoría"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matriculados</p>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{stats.totalEnrolments}</h3>
          </div>
        </div>
        <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground font-medium">
          <span>En {stats.coursesWithEnrolments} curso{stats.coursesWithEnrolments === 1 ? '' : 's'} con alumnos</span>
        </div>
      </div>

      {/* Card 4: Progreso Promedio */}
      <div
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Tasa de culminación promedio acumulada de todos los cursos de esta categoría"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progreso Promedio</p>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{stats.avgProgress}%</h3>
          </div>
        </div>
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${stats.avgProgress === 100 ? 'bg-emerald-500' : 'bg-emerald-600 dark:bg-emerald-400'}`}
              style={{ width: `${stats.avgProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>{stats.totalCompleted} de {stats.totalEnrolments} culminaciones</span>
          </div>
        </div>
      </div>
    </section>
  );
};
