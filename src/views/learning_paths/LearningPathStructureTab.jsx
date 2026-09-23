import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save,
  Lock,
  Unlock,
  BookOpen,
  ArrowRight,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useSearchCoursesForPath } from '../../hooks/useAdminerQueries';

export function LearningPathStructureTab({ path, onSave, saving = false, onViewInMoodle }) {
  const [coursesList, setCoursesList] = useState([]);
  const [enforceSequence, setEnforceSequence] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  useEffect(() => {
    if (path?.sections) {
      const initial = path.sections
        .filter((s) => s.subcourse_course_id)
        .map((s) => ({
          id: s.subcourse_course_id,
          fullname: s.subcourse_fullname || `Curso ${s.subcourse_course_id}`,
          shortname: s.subcourse_shortname || '',
        }));
      setCoursesList(initial);
      setEnforceSequence(!!path.enforce_sequence);
    }
  }, [path]);

  // Consulta de búsqueda de cursos para agregar
  const { data: searchData, isLoading: searching } = useSearchCoursesForPath({
    search: courseSearch,
    excludePathId: path?.id || 0,
    page: 0,
    perpage: 25,
  });

  const availableCourses = (searchData?.items || []).filter(
    (c) => !coursesList.some((existing) => existing.id === c.id)
  );

  const moveUp = (index) => {
    if (index === 0) return;
    setCoursesList((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveDown = (index) => {
    if (index >= coursesList.length - 1) return;
    setCoursesList((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removeCourse = (index) => {
    setCoursesList((prev) => prev.filter((_, i) => i !== index));
  };

  const addCourse = (course) => {
    setCoursesList((prev) => [...prev, course]);
    setSearchModalOpen(false);
    setCourseSearch('');
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        subcourse_course_ids: coursesList.map((c) => c.id),
        enforce_sequence: enforceSequence,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles de Configuración de Secuencia */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Reglas de Secuencia de Aprendizaje</h3>
            <p className="text-xs text-muted-foreground">
              Define el orden de avance pedagógico y si los estudiantes deben completar cada curso antes de desbloquear el siguiente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground bg-muted/60 px-3 py-2 rounded-lg border border-border">
              <input
                type="checkbox"
                checked={enforceSequence}
                onChange={(e) => setEnforceSequence(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
              {enforceSequence ? (
                <span className="flex items-center gap-1.5 text-primary">
                  <Lock className="h-3.5 w-3.5" /> Prelación Secuencial Activada
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Unlock className="h-3.5 w-3.5" /> Avance Libre (Sin bloqueo)
                </span>
              )}
            </label>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Estructura'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Secciones y Cursos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>Cursos en la Ruta ({coursesList.length})</span>
            {enforceSequence && (
              <Badge variant="secondary" className="text-xs">
                Encadenamiento estricto
              </Badge>
            )}
          </h4>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar Curso
          </Button>
        </div>

        {coursesList.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground">No hay cursos vinculados a esta ruta</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Agrega los cursos del catálogo que formarán los módulos de la ruta.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Vincular Primer Curso
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {coursesList.map((c, index) => (
              <React.Fragment key={c.id}>
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{c.fullname}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.shortname}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onViewInMoodle && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Ver curso en Moodle"
                        aria-label="Ver curso en Moodle"
                        onClick={() => onViewInMoodle(c.id)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      title="Mover arriba"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={index === coursesList.length - 1}
                      onClick={() => moveDown(index)}
                      title="Mover abajo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeCourse(index)}
                      title="Eliminar de la ruta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {enforceSequence && index < coursesList.length - 1 && (
                  <div className="flex items-center justify-center py-0.5 text-muted-foreground/60 text-xs">
                    <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                    <span className="text-[10px] ml-1 font-mono uppercase tracking-wider">Requisito previo</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Búsqueda de Cursos para Vincular */}
      <Dialog
        open={searchModalOpen}
        onClose={() => {
          setSearchModalOpen(false);
          setCourseSearch('');
        }}
        title="Vincular Curso a la Ruta"
        description="Selecciona un curso existente del catálogo para insertarlo en la secuencia formativa."
        footer={
          <Button variant="outline" onClick={() => setSearchModalOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              placeholder="Buscar curso por nombre o código..."
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 divide-y divide-border/40">
            {searching ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Buscando cursos...</div>
            ) : availableCourses.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No se encontraron cursos disponibles para vincular.
              </div>
            ) : (
              availableCourses.map((ac) => (
                <div
                  key={ac.id}
                  className="flex items-center justify-between p-2.5 hover:bg-muted/40 rounded-lg transition-colors"
                >
                  <div className="space-y-0.5 max-w-[75%]">
                    <div className="text-xs font-semibold text-foreground truncate">{ac.fullname}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span className="font-mono">{ac.shortname}</span>
                      <span>•</span>
                      <span>{ac.categoryname}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    onClick={() => addCourse(ac)}
                  >
                    Vincular
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
