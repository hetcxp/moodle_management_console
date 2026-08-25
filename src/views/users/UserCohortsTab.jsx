import React, { useState } from 'react';
import { Layers, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { PermissionGate } from '../../components/PermissionGate';

export const UserCohortsTab = ({
  cohorts,
  courses,
  loading,
  onOpenSelector,
  handleUnlinkCohort,
  handleBulkUnlinkCohorts
}) => {
  const [selectedCohortIds, setSelectedCohortIds] = useState([]);
  const [selectedCohortModal, setSelectedCohortModal] = useState(null);

  const handleBulkSubmit = (ids) => {
    handleBulkUnlinkCohorts(ids);
    setSelectedCohortIds([]);
  };

  const cohortsCols = [
    {
      header: 'Cohorte',
      sortKey: 'name',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.name}</div>
            <div className="text-xs font-mono text-muted-foreground">{row.idnumber || 'Sin código'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Progreso de Cursos',
      cell: (row) => {
        const cohortCourses = courses.filter(c => {
          if (c.enrolmethod !== 'cohort') return false;
          if (c.cohortid) return String(c.cohortid) === String(row.id);
          if (c.cohortids) return String(c.cohortids).split(',').includes(String(row.id));
          return true; // Fallback
        });
        
        const totalProgress = cohortCourses.length > 0 
          ? Math.round(cohortCourses.reduce((acc, c) => acc + (c.progress || 0), 0) / cohortCourses.length) 
          : 0;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] mb-1 max-w-[120px]">
              <span className="text-muted-foreground">{cohortCourses.length} curso(s)</span>
              <span className="font-semibold">{totalProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden max-w-[120px]">
              <div
                className={`h-full transition-all duration-300 ${totalProgress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <PermissionGate capability="can_view_cohorts">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleUnlinkCohort(row.id); }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Remover
          </Button>
        </PermissionGate>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PermissionGate capability="can_manage_cohorts">
          <Button onClick={onOpenSelector}>
            <Layers className="h-4 w-4 mr-2" /> Vincular a Cohorte
          </Button>
        </PermissionGate>
      </div>
      <DataTable
        columns={cohortsCols}
        data={cohorts}
        loading={loading}
        totalCount={cohorts.length}
        selectable={true}
        selectedIds={selectedCohortIds}
        onSelectionChange={setSelectedCohortIds}
        onRowClick={(row) => setSelectedCohortModal(row)}
        bulkActions={[{
          label: 'Remover Seleccionadas',
          icon: <Trash2 className="h-3.5 w-3.5" />,
          onClick: handleBulkSubmit,
          variant: 'destructive'
        }]}
      />

      <Dialog
        open={!!selectedCohortModal}
        onClose={() => setSelectedCohortModal(null)}
        title={`Cursos de: ${selectedCohortModal?.name}`}
        description="Progreso del usuario en los cursos vinculados a esta cohorte."
        footer={<Button onClick={() => setSelectedCohortModal(null)}>Cerrar</Button>}
      >
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {selectedCohortModal && (() => {
            const cohortCourses = courses.filter(c => {
              if (c.enrolmethod !== 'cohort') return false;
              if (c.cohortid) return String(c.cohortid) === String(selectedCohortModal.id);
              if (c.cohortids) return String(c.cohortids).split(',').includes(String(selectedCohortModal.id));
              return true;
            });

            if (cohortCourses.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/70 rounded-md">
                  No hay cursos vinculados a esta cohorte.
                </div>
              );
            }

            return (
              <div className="rounded-md border border-border/70 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Curso</th>
                      <th className="px-4 py-3 font-semibold text-right">Progreso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {cohortCourses.map(course => {
                      const progress = course.progress || 0;
                      return (
                        <tr key={course.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{course.fullname}</div>
                            <div className="text-xs text-muted-foreground">{course.shortname}</div>
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
            );
          })()}
        </div>
      </Dialog>
    </div>
  );
};
