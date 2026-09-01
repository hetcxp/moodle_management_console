import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Layers, Trash2, Ban, Check, CalendarClock, Users, MessageSquare } from 'lucide-react';
import { PermissionGate } from '../../components/PermissionGate';

export const CourseCohortsTab = ({ 
  cohorts, 
  users, 
  coursegroups, 
  handleCohortAction, 
  onOpenSelector 
}) => {
  const [selectedCohorts, setSelectedCohorts] = useState([]);
  const [sortCohortKey, setSortCohortKey] = useState('name');
  const [sortCohortDir, setSortCohortDir] = useState('ASC');

  // Selected cohort for details
  const [cohortDetailOpen, setCohortDetailOpen] = useState(false);
  const [selectedCohortDetail, setSelectedCohortDetail] = useState(null);

  // Cohort Group Assignment
  const [cohortGroupModalOpen, setCohortGroupModalOpen] = useState(false);
  const [cohortGroupSelection, setCohortGroupSelection] = useState('0');
  const [cohortNewGroupName, setCohortNewGroupName] = useState('');
  
  // Cohort Expiration
  const [cohortExpirationModalOpen, setCohortExpirationModalOpen] = useState(false);
  const [cohortExpirationDate, setCohortExpirationDate] = useState('');
  const [cohortExpirationEnabled, setCohortExpirationEnabled] = useState(false);

  // Cohort Messaging
  const [cohortMessageModalOpen, setCohortMessageModalOpen] = useState(false);
  const [cohortMessageText, setCohortMessageText] = useState('');

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const handleCohortGroupSubmit = async () => {
    await handleCohortAction('set_group', selectedCohorts.length > 0 ? selectedCohorts : [selectedCohortDetail?.id], {
      groupid: cohortGroupSelection === 'new' ? 0 : parseInt(cohortGroupSelection),
      newgroupname: cohortGroupSelection === 'new' ? cohortNewGroupName : ''
    });
    setSelectedCohorts([]);
    setCohortGroupModalOpen(false);
  };

  const handleCohortExpirationSubmit = async () => {
    const timeend = cohortExpirationEnabled && cohortExpirationDate ? Math.floor(new Date(cohortExpirationDate).getTime() / 1000) : 0;
    await handleCohortAction('set_expiration', selectedCohorts.length > 0 ? selectedCohorts : [selectedCohortDetail?.id], { timeend });
    setSelectedCohorts([]);
    setCohortExpirationModalOpen(false);
  };

  const handleCohortMessageSubmit = async () => {
    if (!cohortMessageText.trim()) return;
    await handleCohortAction('message', selectedCohorts.length > 0 ? selectedCohorts : [selectedCohortDetail?.id], { message_text: cohortMessageText });
    setSelectedCohorts([]);
    setCohortMessageModalOpen(false);
    setCohortMessageText('');
  };

  const sortedCohorts = useMemo(() => {
    if (!cohorts) return [];
    return [...cohorts].sort((a, b) => {
      let aVal = a[sortCohortKey];
      let bVal = b[sortCohortKey];
      
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (aVal === bVal) return 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortCohortDir === 'ASC' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortCohortDir === 'ASC' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [cohorts, sortCohortKey, sortCohortDir]);

  const cohortUsers = useMemo(() => {
    if (!users || !selectedCohortDetail) return [];
    const cohortIdStr = String(selectedCohortDetail.id);
    return users.filter(u => {
      if (!u.cohortids) return false;
      const ids = u.cohortids.split(',');
      return ids.includes(cohortIdStr);
    });
  }, [users, selectedCohortDetail]);

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
      header: 'Estado',
      sortKey: 'status',
      filterType: 'select',
      filterOptions: [
        { label: 'Activa', value: '0' },
        { label: 'Suspendida', value: '1' }
      ],
      cell: (row) => (
        <Badge variant={row.status === 0 ? 'success' : 'destructive'}>
          {row.status === 0 ? 'Activa' : 'Suspendida'}
        </Badge>
      )
    },
    {
      header: 'Grupo',
      sortKey: 'groupid',
      filterType: 'text',
      cell: (row) => {
        const group = coursegroups?.find(g => g.id === row.groupid);
        return <span className="text-sm text-muted-foreground">{group ? group.name : 'Sin grupo'}</span>;
      }
    },
    {
      header: 'Vigencia',
      sortKey: 'timecreated',
      filterType: 'text',
      accessor: (row) => `${formatDate(row.timecreated)} - ${row.enrolenddate ? formatDate(row.enrolenddate) : 'Sin límite'}`,
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(row.timecreated)} - {row.enrolenddate ? formatDate(row.enrolenddate) : 'Sin límite'}
        </div>
      )
    },
    {
      header: 'Progreso',
      sortKey: 'progress',
      filterType: 'select',
      filterOptions: [
        { label: '0%', value: '0' },
        { label: '100%', value: '100' }
      ],
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[100px] max-w-[200px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right">{row.progress}%</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-center',
      cell: (row) => (
        <PermissionGate capability="can_manage_courses">
          <div className="flex justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                handleCohortAction(row.status === 0 ? 'suspend' : 'activate', [row.id]);
                setSelectedCohorts([]); 
              }}
              className={row.status === 0 ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 px-2' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-2'}
              title={row.status === 0 ? 'Suspender' : 'Activar'}
            >
              {row.status === 0 ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation();
                setSelectedCohortDetail(row);
                setSelectedCohorts([]);
                setCohortGroupSelection(row.groupid > 0 ? String(row.groupid) : '0');
                setCohortNewGroupName('');
                setCohortGroupModalOpen(true);
              }}
              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2"
              title="Configurar Grupo"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation();
                setSelectedCohortDetail(row);
                setSelectedCohorts([]);
                setCohortExpirationEnabled(row.enrolenddate > 0);
                if (row.enrolenddate > 0) {
                  setCohortExpirationDate(new Date(row.enrolenddate * 1000).toISOString().split('T')[0]);
                } else {
                  setCohortExpirationDate('');
                }
                setCohortExpirationModalOpen(true);
              }}
              className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2"
              title="Configurar Expiración"
            >
              <CalendarClock className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation();
                setSelectedCohortDetail(row);
                setSelectedCohorts([]);
                setCohortMessageText('');
                setCohortMessageModalOpen(true);
              }}
              className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-2"
              title="Enviar Mensaje"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                handleCohortAction('remove', [row.id]);
                setSelectedCohorts([]); 
              }}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2"
              title="Desvincular"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </PermissionGate>
      )
    }
  ];

  const getSelectionStatus = (selectedIds, collection) => {
    if (selectedIds.length === 0) return null;
    const selectedItems = collection.filter(item => selectedIds.includes(item.id));
    const allActive = selectedItems.every(item => item.status === 0);
    const allSuspended = selectedItems.every(item => item.status === 1);
    
    if (allActive) return 'all_active';
    if (allSuspended) return 'all_suspended';
    return 'mixed';
  };

  const cohortSelectionStatus = getSelectionStatus(selectedCohorts, cohorts);
  const cohortBulkActions = [
    ...(cohortSelectionStatus === 'all_active' ? [{ label: 'Suspender', onClick: () => { handleCohortAction('suspend', selectedCohorts); setSelectedCohorts([]); }, variant: 'warning' }] : []),
    ...(cohortSelectionStatus === 'all_suspended' ? [{ label: 'Activar', onClick: () => { handleCohortAction('activate', selectedCohorts); setSelectedCohorts([]); }, variant: 'success' }] : []),
    { label: 'Configurar Grupo', onClick: () => { setCohortGroupSelection('0'); setCohortNewGroupName(''); setCohortGroupModalOpen(true); }, variant: 'outline' },
    { label: 'Configurar Expiración', onClick: () => { setCohortExpirationEnabled(false); setCohortExpirationDate(''); setCohortExpirationModalOpen(true); }, variant: 'outline' },
    { label: 'Enviar Mensaje', onClick: () => { setCohortMessageText(''); setCohortMessageModalOpen(true); }, variant: 'outline' },
    { label: 'Desvincular', onClick: () => { handleCohortAction('remove', selectedCohorts); setSelectedCohorts([]); }, variant: 'destructive' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PermissionGate capability="can_manage_courses">
          <Button onClick={onOpenSelector}>
            <Layers className="h-4 w-4 mr-2" /> Vincular Cohorte
          </Button>
        </PermissionGate>
      </div>
      
      <DataTable
        columns={cohortsCols}
        data={sortedCohorts}
        totalCount={cohorts.length}
        sort={sortCohortKey}
        dir={sortCohortDir}
        onSortChange={(key, dir) => { setSortCohortKey(key); setSortCohortDir(dir); }}
        onRowClick={(row) => { setSelectedCohortDetail(row); setCohortDetailOpen(true); }}
        selectable={true}
        selectedIds={selectedCohorts}
        onSelectionChange={setSelectedCohorts}
        bulkActions={cohortBulkActions}
      />

      {/* Cohort Group Config Modal */}
      <Dialog
        open={cohortGroupModalOpen}
        onClose={() => setCohortGroupModalOpen(false)}
        title="Configurar Asignación a Grupo"
        description="Selecciona a qué grupo del curso pertenecerán automáticamente los usuarios de esta cohorte."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCohortGroupModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCohortGroupSubmit}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <select
            value={cohortGroupSelection}
            onChange={(e) => setCohortGroupSelection(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="0">Ninguno</option>
            {coursegroups?.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
            <option value="new">+ Crear nuevo grupo...</option>
          </select>
          {cohortGroupSelection === 'new' && (
            <Input
              placeholder="Nombre del nuevo grupo"
              value={cohortNewGroupName}
              onChange={(e) => setCohortNewGroupName(e.target.value)}
            />
          )}
        </div>
      </Dialog>

      {/* Cohort Expiration Config Modal */}
      <Dialog
        open={cohortExpirationModalOpen}
        onClose={() => setCohortExpirationModalOpen(false)}
        title="Configurar Expiración de Cohorte"
        description="Establece una fecha límite de matriculación para toda la cohorte."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCohortExpirationModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCohortExpirationSubmit}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={cohortExpirationEnabled} 
              onChange={(e) => setCohortExpirationEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium">Habilitar expiración</span>
          </label>
          
          {cohortExpirationEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha de Expiración</label>
              <Input 
                type="date" 
                value={cohortExpirationDate} 
                onChange={(e) => setCohortExpirationDate(e.target.value)} 
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>
      </Dialog>

      {/* Cohort Messaging Modal */}
      <Dialog
        open={cohortMessageModalOpen}
        onClose={() => setCohortMessageModalOpen(false)}
        title="Enviar Mensaje Masivo"
        description="Envía un mensaje a todos los usuarios de la(s) cohorte(s) vinculada(s)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCohortMessageModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCohortMessageSubmit} disabled={!cohortMessageText.trim()}>Enviar Mensaje</Button>
          </>
        }
      >
        <div className="space-y-4 pt-4">
          <textarea
            value={cohortMessageText}
            onChange={(e) => setCohortMessageText(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            className="w-full min-h-[150px] p-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
        </div>
      </Dialog>

      <Dialog
        open={cohortDetailOpen}
        onClose={() => setCohortDetailOpen(false)}
        title={selectedCohortDetail ? `Usuarios de la Cohorte: ${selectedCohortDetail.name}` : 'Detalle de Cohorte'}
        description="Listado de usuarios vinculados a esta cohorte en este curso y su avance."
        footer={
          <Button variant="ghost" onClick={() => setCohortDetailOpen(false)}>Cerrar</Button>
        }
      >
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {cohortUsers.length > 0 ? (
            <div className="rounded-md border border-border/70 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {cohortUsers.map(u => (
                    <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{u.fullname}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-24 max-w-[100px]">
                            <div
                              className={`h-full ${u.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                              style={{ width: `${u.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{u.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/70 rounded-md">
              No hay usuarios en esta cohorte para este curso.
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
