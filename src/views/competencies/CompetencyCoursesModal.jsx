import React, { useState, useMemo } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Checkbox } from '../../components/ui/Checkbox';
import { SelectorModal } from '../../components/ui/SelectorModal';
import { PermissionGate } from '../../components/PermissionGate';
import { useToast } from '../../components/ui/Toast';
import {
  useCompetencyCourses,
  useCompetencyCourseAction
} from '../../hooks/useAdminerQueries';
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  Loader2,
  FolderTree,
  Inbox
} from 'lucide-react';

export const CompetencyCoursesModal = ({
  open,
  onClose,
  competency,
  onNavigateToDetail
}) => {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const competencyId = competency?.id;
  const { data: coursesData, isLoading, isFetching } = useCompetencyCourses(open ? competencyId : null);
  const { mutateAsync: performCourseAction } = useCompetencyCourseAction();

  const courses = useMemo(() => coursesData?.courses || [], [coursesData]);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const term = search.toLowerCase();
    return courses.filter(
      (c) =>
        c.fullname?.toLowerCase().includes(term) ||
        c.shortname?.toLowerCase().includes(term) ||
        c.idnumber?.toLowerCase().includes(term) ||
        c.categoryname?.toLowerCase().includes(term)
    );
  }, [courses, search]);

  const handleToggleSelectAll = () => {
    if (selectedCourseIds.length === filteredCourses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(filteredCourses.map((c) => c.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLinkCourses = async (courseIds) => {
    if (!competencyId || courseIds.length === 0) return;
    try {
      const res = await performCourseAction({
        action: 'add',
        competencyid: competencyId,
        courseids: courseIds,
      });
      addToast({
        type: 'success',
        title: 'Cursos vinculados',
        description: res.message || `${courseIds.length} curso(s) vinculados a la competencia.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al vincular cursos',
        description: err.message,
      });
    }
  };

  const handleUnlinkCourse = async (courseId) => {
    if (!competencyId) return;
    try {
      await performCourseAction({
        action: 'remove',
        competencyid: competencyId,
        courseids: [courseId],
      });
      setSelectedCourseIds((prev) => prev.filter((id) => id !== courseId));
      addToast({
        type: 'success',
        title: 'Curso desvinculado',
        description: 'El curso fue desvinculado de la competencia exitosamente.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al desvincular curso',
        description: err.message,
      });
    }
  };

  const handleBulkUnlink = async () => {
    if (!competencyId || selectedCourseIds.length === 0) return;
    try {
      const count = selectedCourseIds.length;
      await performCourseAction({
        action: 'remove',
        competencyid: competencyId,
        courseids: selectedCourseIds,
      });
      setSelectedCourseIds([]);
      addToast({
        type: 'success',
        title: 'Cursos desvinculados',
        description: `${count} curso(s) desvinculados de la competencia.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al desvincular cursos',
        description: err.message,
      });
    }
  };

  const isAllSelected =
    filteredCourses.length > 0 && selectedCourseIds.length === filteredCourses.length;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="max-w-2xl"
        title={
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Cursos Vinculados</span>
          </div>
        }
        description={
          competency
            ? `Gestiona los cursos asociados a la competencia "${competency.shortname}" (${competency.idnumber || 'Sin código'}).`
            : 'Gestiona los cursos asociados a la competencia.'
        }
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Total vinculados: <span className="font-semibold text-foreground">{courses.length}</span>
            </div>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          {/* Top action & search bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar cursos vinculados..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              {selectedCourseIds.length > 0 && (
                <PermissionGate capability="can_manage_competencies">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkUnlink}
                    className="h-9"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Desvincular ({selectedCourseIds.length})
                  </Button>
                </PermissionGate>
              )}
              <PermissionGate capability="can_manage_competencies">
                <Button
                  size="sm"
                  onClick={() => setSelectorOpen(true)}
                  className="h-9"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Vincular Cursos
                </Button>
              </PermissionGate>
            </div>
          </div>

          {/* Courses List Table */}
          <div className="relative border border-border/80 rounded-xl overflow-hidden bg-card min-h-[300px] max-h-[420px] flex flex-col">
            {(isLoading || isFetching) && courses.length === 0 && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {courses.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center p-10 text-center h-full my-auto">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Inbox className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Sin cursos vinculados</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-4">
                  Esta competencia aún no está vinculada a ningún curso del catálogo.
                </p>
                <PermissionGate capability="can_manage_competencies">
                  <Button size="sm" onClick={() => setSelectorOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Vincular Cursos Ahora
                  </Button>
                </PermissionGate>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full my-auto">
                <p className="text-xs text-muted-foreground">
                  No se encontraron cursos que coincidan con "{search}".
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs text-xs uppercase text-muted-foreground border-b border-border/60 z-10">
                    <tr>
                      <th className="p-3 w-10">
                        <Checkbox
                          id="select-all-courses"
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                        />
                      </th>
                      <th className="p-3 font-semibold">Curso</th>
                      <th className="p-3 font-semibold hidden sm:table-cell">Categoría</th>
                      <th className="p-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredCourses.map((c) => {
                      const isSelected = selectedCourseIds.includes(c.id);
                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-muted/40 transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="p-3">
                            <Checkbox
                              id={`course-sel-${c.id}`}
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(c.id)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate max-w-[220px] sm:max-w-xs">
                                  {c.fullname}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                  <span>{c.shortname}</span>
                                  {c.idnumber && <span>• {c.idnumber}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            {c.categoryname ? (
                              <Badge variant="outline" className="text-xs font-normal max-w-[150px] truncate">
                                <FolderTree className="h-3 w-3 mr-1 shrink-0 opacity-70" />
                                {c.categoryname}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">General</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onNavigateToDetail && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    onClose();
                                    onNavigateToDetail('course', c.id);
                                  }}
                                  title="Ver detalle del curso"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              <PermissionGate capability="can_manage_competencies">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                  onClick={() => handleUnlinkCourse(c.id)}
                                  title="Desvincular curso"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Selector Modal for Picking Courses to Link */}
      <SelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        title={`Vincular Cursos a "${competency?.shortname}"`}
        entityType="courses"
        multiple={true}
        onSelect={handleLinkCourses}
      />
    </>
  );
};
