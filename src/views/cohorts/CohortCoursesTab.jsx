import React, { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { PermissionGate } from '../../components/PermissionGate';
import { Users, Trash2, BookOpen } from 'lucide-react';
import { useBulkSelection } from '../../hooks/useBulkSelection';

export const CohortCoursesTab = ({
  courses,
  members,
  loading,
  setSelectorType,
  handleUnlinkCourse,
  handleBulkUnlinkCourses,
  onNavigateToDetail
}) => {
  const { selectedIds: selectedCourseIds, setSelectedIds: setSelectedCourseIds, clearSelection: clearSelectedCourseIds } = useBulkSelection();
  const [courseDetailModalOpen, setCourseDetailModalOpen] = useState(false);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);

  const handleBulkUnlink = async (ids) => {
    await handleBulkUnlinkCourses(ids);
    clearSelectedCourseIds();
  };

  const coursesCols = [
    {
      header: 'Curso',
      sortKey: 'fullname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.fullname}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.shortname}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Inscritos por Cohorte',
      sortKey: 'enrolledcount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {row.enrolledcount} usuarios
        </div>
      )
    },
    {
      header: 'Progreso Promedio',
      sortKey: 'progress',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px] max-w-[120px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress || 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-8 text-right">{row.progress || 0}%</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <PermissionGate capability="can_manage_courses">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleUnlinkCourse(row.id); }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Desvincular
          </Button>
        </PermissionGate>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PermissionGate capability="can_manage_courses">
          <Button onClick={() => setSelectorType('courses')}>
            <BookOpen className="h-4 w-4 mr-2" /> Sincronizar Curso
          </Button>
        </PermissionGate>
      </div>
      <DataTable
        columns={coursesCols}
        data={courses}
        loading={loading}
        totalCount={courses.length}
        onRowClick={(row) => { setSelectedCourseDetail(row); setCourseDetailModalOpen(true); }}
        selectable={true}
        selectedIds={selectedCourseIds}
        onSelectionChange={setSelectedCourseIds}
        bulkActions={[{
          label: 'Desvincular Seleccionados',
          icon: <Trash2 className="h-3.5 w-3.5" />,
          onClick: handleBulkUnlink,
          variant: 'destructive'
        }]}
      />

      <Dialog
        open={courseDetailModalOpen}
        onClose={() => setCourseDetailModalOpen(false)}
        title={selectedCourseDetail ? `Progreso en: ${selectedCourseDetail.fullname}` : 'Detalle de Progreso'}
        description="Progreso individual de los miembros de la cohorte en este curso."
        footer={
          <>
            <Button variant="outline" onClick={() => setCourseDetailModalOpen(false)}>Cerrar</Button>
            <Button onClick={() => onNavigateToDetail('course', selectedCourseDetail?.id)}>
              Ir al Detalle del Curso
            </Button>
          </>
        }
      >
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {members && members.length > 0 ? (
            <div className="rounded-md border border-border/70 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold text-right">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {members.map(u => {
                    const progress = u.progress || 0; 
                    return (
                      <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{u.fullname}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-24 max-w-[100px]">
                              <div
                                className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/70 rounded-md">
              No hay usuarios en esta cohorte.
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
