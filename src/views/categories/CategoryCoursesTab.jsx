import React, { useState } from 'react';
import { FilterBar } from '../../components/FilterBar';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { BookOpen, ChevronRight, ExternalLink, Eye, EyeOff, FolderInput, Plus, Search, Users } from 'lucide-react';
import { API_CONFIG } from '../../config/api';
import { AdminerApi } from '../../services/adminer-api';
import { useToast } from '../../components/ui/Toast';
import { useBulkSelection } from '../../hooks/useBulkSelection';

export const CategoryCoursesTab = ({
  courses,
  loading,
  hasCreateCourse,
  hasUpdateCourse,
  loadData,
  handleBulkCourseAction,
  handleOpenMoveModal,
  onNavigateToDetail,
  setCreateCourseModalOpen,
  setBringCourseModalOpen
}) => {
  const { addToast } = useToast();
  const [courseSearch, setCourseSearch] = useState('');
  const [courseVisibility, setCourseVisibility] = useState('-1');
  const { selectedIds: selectedCourseIds, setSelectedIds: setSelectedCourseIds, clearSelection: clearSelectedCourseIds } = useBulkSelection();
  const [courseSort, setCourseSort] = useState('fullname');
  const [courseDir, setCourseDir] = useState('ASC');

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseModalData, setCourseModalData] = useState(null);
  const [courseModalLoading, setCourseModalLoading] = useState(false);
  const [courseModalSearch, setCourseModalSearch] = useState('');

  const handleOpenCourseModal = async (course) => {
    setCourseModalData(course);
    setCourseModalOpen(true);
    setCourseModalLoading(true);
    setCourseModalSearch('');
    try {
      const res = await AdminerApi.getCourseDetail(course.id);
      setCourseModalData({ ...course, ...res, id: course.id });
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando usuarios', description: err.message });
      setCourseModalOpen(false);
    } finally {
      setCourseModalLoading(false);
    }
  };

  const handleBulkSubmit = async (action, ids) => {
    await handleBulkCourseAction(action, ids);
    clearSelectedCourseIds();
  };

  const handleMoveSubmit = (ids) => {
    handleOpenMoveModal(ids);
    clearSelectedCourseIds();
  };

  const handleGoToCourseDetail = (courseId) => {
    setCourseModalOpen(false);
    if (onNavigateToDetail && courseId) {
      onNavigateToDetail('course', courseId);
    }
  };

  let filteredCourses = (courses || []).filter(c => {
    const matchesSearch = c.fullname.toLowerCase().includes(courseSearch.toLowerCase()) || 
                          c.shortname.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesVis = courseVisibility === '-1' || String(c.visible) === courseVisibility;
    return matchesSearch && matchesVis;
  });

  filteredCourses.sort((a, b) => {
    let valA = a[courseSort];
    let valB = b[courseSort];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return courseDir === 'ASC' ? -1 : 1;
    if (valA > valB) return courseDir === 'ASC' ? 1 : -1;
    return 0;
  });

  const coursesCols = [
    {
      header: 'Curso',
      sortKey: 'fullname',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground hover:text-primary transition-colors">{row.fullname}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.shortname}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Progreso',
      sortKey: 'enrolledcount',
      cell: (row) => {
        const enrolled = row.enrolledcount || 0;
        const completed = row.completedcount || 0;
        if (enrolled === 0) {
          return <span className="text-xs text-muted-foreground italic">Sin inscritos</span>;
        }
        const percentage = Math.round((completed / enrolled) * 100);
        return (
          <div className="flex flex-col gap-1 w-full max-w-[120px]">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>{completed} / {enrolled}</span>
              <span>{percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary overflow-hidden rounded-full">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Estado',
      sortKey: 'visible',
      cell: (row) => (
        <Badge variant={row.visible === 1 ? 'success' : 'warning'}>
          {row.visible === 1 ? 'Visible' : 'Oculto'}
        </Badge>
      )
    },
    {
      header: 'Acciones',
      className: 'text-center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleGoToCourseDetail(row.id);
            }}
            title="Ir al detalle completo del curso"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`${API_CONFIG.baseUrl}/course/view.php?id=${row.id}`, '_blank');
            }}
            title="Ver en Moodle"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {hasUpdateCourse && (
             <Button
               variant="ghost"
               size="icon"
               onClick={(e) => {
                 e.stopPropagation();
                 handleBulkCourseAction(row.visible === 1 ? 'hide' : 'show', [row.id]);
               }}
               title={row.visible === 1 ? 'Ocultar curso' : 'Hacer visible'}
               className="h-8 w-8 text-muted-foreground hover:text-foreground"
             >
               {row.visible === 1 ? <EyeOff className="h-4 w-4 text-amber-600" /> : <Eye className="h-4 w-4 text-emerald-600" />}
             </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        onRefresh={loadData}
        loading={loading}
        searchPlaceholder="Buscar curso por nombre..."
        searchValue={courseSearch}
        onSearchChange={setCourseSearch}
        filters={[
          {
            id: 'visibility',
            label: 'Estado',
            value: courseVisibility,
            onChange: setCourseVisibility,
            options: [
              { label: 'Todos', value: '-1' },
              { label: 'Visibles', value: '1' },
              { label: 'Ocultos', value: '0' }
            ]
          }
        ]}
        primaryAction={hasCreateCourse ? {
          label: 'Crear Curso',
          onClick: () => setCreateCourseModalOpen(true),
          icon: <Plus className="h-4 w-4" />
        } : null}
        secondaryAction={hasUpdateCourse ? {
          label: 'Traer Curso',
          onClick: () => setBringCourseModalOpen(true),
          icon: <FolderInput className="h-4 w-4" />
        } : null}
      />
      {selectedCourseIds.length > 0 && hasUpdateCourse && (() => {
        const selectedCourses = courses.filter(c => selectedCourseIds.includes(c.id));
        const isAllVisible = selectedCourses.every(c => c.visible === 1);
        const isAllHidden = selectedCourses.every(c => c.visible === 0);

        return (
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-fadeIn">
            <span className="text-sm font-medium text-primary">
              {selectedCourseIds.length} curso(s) seleccionado(s)
            </span>
            <div className="ml-auto flex items-center gap-2">
              {isAllVisible && (
                <Button size="sm" variant="outline" onClick={() => handleBulkSubmit('hide', selectedCourseIds)} className="h-8 gap-1">
                  <EyeOff className="h-3.5 w-3.5" /> Ocultar
                </Button>
              )}
              {isAllHidden && (
                <Button size="sm" variant="outline" onClick={() => handleBulkSubmit('show', selectedCourseIds)} className="h-8 gap-1">
                  <Eye className="h-3.5 w-3.5" /> Mostrar
                </Button>
              )}
              <Button size="sm" onClick={() => handleMoveSubmit(selectedCourseIds)} className="h-8 gap-1">
                <FolderInput className="h-3.5 w-3.5" /> Mover
              </Button>
            </div>
          </div>
        );
      })()}
      <DataTable
        columns={coursesCols}
        data={filteredCourses}
        loading={loading}
        totalCount={filteredCourses.length}
        onRowClick={(row) => handleOpenCourseModal(row)}
        sort={courseSort}
        dir={courseDir}
        onSortChange={(newSort, newDir) => { setCourseSort(newSort); setCourseDir(newDir); }}
        selectable={hasUpdateCourse}
        selectedIds={selectedCourseIds}
        onSelectionChange={setSelectedCourseIds}
      />

      <Dialog
        open={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        title="Usuarios Matriculados"
        description={courseModalData ? `Detalle de progreso para el curso: ${courseModalData.fullname}` : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => setCourseModalOpen(false)}>Cerrar</Button>
            {onNavigateToDetail && courseModalData?.id && (
              <Button
                onClick={() => handleGoToCourseDetail(courseModalData.id)}
                className="gap-1.5"
              >
                <span>Ir al Detalle del Curso</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </>
        }
      >
        {courseModalLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : courseModalData?.users ? (
          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9" 
                placeholder="Buscar por nombre o correo..." 
                value={courseModalSearch}
                onChange={(e) => setCourseModalSearch(e.target.value)}
              />
            </div>
            
            {(() => {
              const users = courseModalData.users.filter(u => 
                u.fullname.toLowerCase().includes(courseModalSearch.toLowerCase()) || 
                u.email.toLowerCase().includes(courseModalSearch.toLowerCase())
              );

              if (users.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Sin usuarios matriculados</p>
                    <p className="text-xs">O no hay coincidencias en tu búsqueda.</p>
                  </div>
                );
              }

              return (
                <div className="max-h-[400px] overflow-y-auto border border-border/70 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-card sticky top-0 z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
                      <tr className="bg-secondary/50">
                        <th className="px-4 py-3 font-semibold">Usuario</th>
                        <th className="px-4 py-3 font-semibold w-1/3">Progreso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {users.map(u => (
                        <tr
                          key={u.id}
                          className="hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setCourseModalOpen(false);
                            onNavigateToDetail?.('user', u.id);
                          }}
                          title="Ver detalle del usuario"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{u.fullname}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-secondary overflow-hidden rounded-full">
                                <div 
                                  className="h-full bg-primary transition-all duration-500" 
                                  style={{ width: `${u.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold tabular-nums min-w-[36px]">{u.progress}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No se pudo cargar la información del curso.
          </div>
        )}
      </Dialog>
    </div>
  );
};
