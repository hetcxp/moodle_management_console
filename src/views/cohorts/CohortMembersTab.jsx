import React, { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { PermissionGate } from '../../components/PermissionGate';
import { Users, Clock, Trash2, User, Download } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { exportToCsv } from '../../components/CsvExporter';

export const CohortMembersTab = ({
  members,
  courses,
  cohortName = '',
  loading,
  setSelectorType,
  handleUnlinkUser,
  handleBulkUnlinkUsers,
  onNavigateToDetail
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('summary');

  const handleBulkUnlink = async (ids) => {
    await handleBulkUnlinkUsers(ids);
    setSelectedUserIds([]);
  };

  const handleExport = () => {
    if (exportOption === 'summary') {
      const cols = [
        { label: 'ID Usuario', accessor: 'id' },
        { label: 'Nombre Completo', accessor: 'fullname' },
        { label: 'Email', accessor: 'email' },
        { label: 'Estado', accessor: 'status' },
        { label: 'Progreso General', accessor: 'progress' },
      ];
      const exportData = members.map(m => ({
        ...m,
        status: m.suspended === 0 ? 'Activo' : 'Suspendido',
        progress: `${m.progress || 0}%`
      }));
      exportToCsv(`cohorte_${cohortName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_resumen`, exportData, cols);
    } else {
      const cols = [
        { label: 'ID Usuario', accessor: 'id' },
        { label: 'Nombre Completo', accessor: 'fullname' },
        { label: 'Email', accessor: 'email' },
        { label: 'Estado', accessor: 'status' },
        { label: 'ID Curso', accessor: 'course_id' },
        { label: 'Nombre Curso', accessor: 'course_name' },
        { label: 'Progreso Curso', accessor: 'course_progress' },
      ];

      const exportData = [];
      members.forEach(m => {
        if (!courses || courses.length === 0) {
          exportData.push({
            id: m.id,
            fullname: m.fullname,
            email: m.email,
            status: m.suspended === 0 ? 'Activo' : 'Suspendido',
            course_id: '',
            course_name: 'Sin cursos sincronizados',
            course_progress: ''
          });
        } else {
          courses.forEach(c => {
            const cp = m.course_progresses?.find(p => p.courseid === c.id);
            exportData.push({
              id: m.id,
              fullname: m.fullname,
              email: m.email,
              status: m.suspended === 0 ? 'Activo' : 'Suspendido',
              course_id: c.id,
              course_name: c.fullname,
              course_progress: cp ? `${cp.progress}%` : '0%'
            });
          });
        }
      });
      exportToCsv(`cohorte_${cohortName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_detalle`, exportData, cols);
    }
    setExportModalOpen(false);
  };

  const membersCols = [
    {
      header: 'Usuario',
      sortKey: 'fullname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 font-bold">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground flex items-center gap-2">
              {row.fullname}
              <Badge variant={row.suspended === 0 ? 'success' : 'destructive'} className="text-[10px] px-1 py-0 h-4">
                {row.suspended === 0 ? 'Activo' : 'Suspendido'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Último Acceso',
      sortKey: 'lastaccess',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 opacity-70" />
          {row.lastaccess > 0 ? formatDate(row.lastaccess) : 'Nunca'}
        </div>
      )
    },
    {
      header: 'Progreso',
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
        <PermissionGate capability="can_manage_cohorts">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleUnlinkUser(row.id); }}
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setExportModalOpen(true)}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
        <PermissionGate capability="can_manage_cohorts">
          <Button onClick={() => setSelectorType('users')}>
            <User className="h-4 w-4 mr-2" /> Añadir Usuario(s)
          </Button>
        </PermissionGate>
      </div>
      <DataTable
        columns={membersCols}
        data={members}
        loading={loading}
        totalCount={members.length}
        onRowClick={(row) => { setSelectedUserDetail(row); setUserDetailModalOpen(true); }}
        selectable={true}
        selectedIds={selectedUserIds}
        onSelectionChange={setSelectedUserIds}
        bulkActions={[{
          label: 'Remover Seleccionados',
          icon: <Trash2 className="h-3.5 w-3.5" />,
          onClick: handleBulkUnlink,
          variant: 'destructive'
        }]}
      />

      <Dialog
        open={userDetailModalOpen}
        onClose={() => setUserDetailModalOpen(false)}
        title={selectedUserDetail ? `Cursos de: ${selectedUserDetail.fullname}` : 'Detalle de Cursos'}
        description="Progreso del usuario en los cursos sincronizados por esta cohorte."
        footer={
          <>
            <Button variant="outline" onClick={() => setUserDetailModalOpen(false)}>Cerrar</Button>
            <Button onClick={() => onNavigateToDetail('user', selectedUserDetail?.id)}>
              Ir al Detalle del Usuario
            </Button>
          </>
        }
      >
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {courses && courses.length > 0 ? (
            <div className="rounded-md border border-border/70 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Curso</th>
                    <th className="px-4 py-3 font-semibold text-right">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {courses.map(c => {
                    const courseProgressObj = selectedUserDetail?.course_progresses?.find(cp => cp.courseid === c.id);
                    const progress = courseProgressObj ? courseProgressObj.progress : 0;
                    return (
                      <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{c.fullname}</div>
                          <div className="text-xs text-muted-foreground">{c.shortname}</div>
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
              No hay cursos sincronizados en esta cohorte.
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Opciones de Exportación"
        description="Selecciona el formato de exportación."
        footer={
          <>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleExport}>
              Exportar CSV
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Tipo de Exportación</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={exportOption}
              onChange={(e) => setExportOption(e.target.value)}
            >
              <option value="summary">Resumen (Lista de usuarios y progreso general)</option>
              <option value="detail">Detalle (Usuarios y progreso en cada curso de la cohorte)</option>
            </select>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
