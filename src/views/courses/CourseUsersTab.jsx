import React, { useState, useMemo } from 'react';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Users, Trash2, Ban, Check, CalendarClock, UserCog, UserPlus, HelpCircle, MessageSquare, Download, Layers, FileText } from 'lucide-react';
import { PermissionGate } from '../../components/PermissionGate';
import { useCourseUserActions } from '../../hooks/useCourseUserActions';

export const CourseUsersTab = ({ 
  courseId, 
  courseShortname, 
  users, 
  coursegroups, 
  handleUserAction, 
  onNavigateToDetail, 
  onOpenSelector 
}) => {
  const { addToast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sortUserKey, setSortUserKey] = useState('fullname');
  const [sortUserDir, setSortUserDir] = useState('ASC');

  // Compute sorting once to pass to hook and local grid
  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      let aVal = a[sortUserKey] ?? '';
      let bVal = b[sortUserKey] ?? '';

      if (aVal === bVal) return 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortUserDir === 'ASC' ? aVal - bVal : bVal - aVal;
      }
      return sortUserDir === 'ASC' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [users, sortUserKey, sortUserDir]);

  const {
    exportState,
    expirationState,
    messageState,
    groupState
  } = useCourseUserActions({
    courseId,
    courseShortname,
    handleUserAction,
    sortedUsers,
    setSelectedUsers
  });

  const {
    isExportingDetails, exportModalOpen, setExportModalOpen, exportOption, setExportOption, handleExport
  } = exportState;

  const {
    expirationModalOpen, setExpirationModalOpen, setExpirationUserIds,
    expirationDate, setExpirationDate, expirationEnabled, setExpirationEnabled, handleSetExpirationSubmit
  } = expirationState;

  const {
    userMessageModalOpen, setUserMessageModalOpen, userMessageText, setUserMessageText, handleUserMessageSubmit
  } = messageState;

  const {
    userGroupModalOpen, setUserGroupModalOpen, userGroupSelection, setUserGroupSelection, userNewGroupName, setUserNewGroupName, handleUserGroupSubmit
  } = groupState;

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getEnrolmentIcon = (method, index) => {
    switch (method) {
      case 'manual': return <UserCog key={index} className="h-4 w-4 text-blue-500" title="Manual" />;
      case 'cohort': return <Layers key={index} className="h-4 w-4 text-purple-500" title="Cohorte" />;
      case 'self': return <UserPlus key={index} className="h-4 w-4 text-emerald-500" title="Auto-matriculación" />;
      case 'guest': return <Users key={index} className="h-4 w-4 text-gray-500" title="Invitado" />;
      default: return <HelpCircle key={index} className="h-4 w-4 text-slate-400" title={method || 'Desconocido'} />;
    }
  };

  const usersCols = [
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
            <div className="font-semibold text-foreground">{row.fullname}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Rol',
      accessor: (row) => row.roles || 'student',
      sortKey: 'roles',
      filterType: 'select',
      filterOptions: [
        { label: 'Estudiante', value: 'student' },
        { label: 'Profesor (Edición)', value: 'editingteacher' },
        { label: 'Profesor', value: 'teacher' },
        { label: 'Manager', value: 'manager' }
      ],
      cell: (row) => {
        const roleMap = {
          'student': 'Estudiante',
          'editingteacher': 'Prof. Edición',
          'teacher': 'Profesor',
          'manager': 'Manager'
        };
        const r = (row.roles || 'student').split(',')[0];
        return (
          <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded">
            {roleMap[r] || r}
          </span>
        );
      }
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
      header: 'Estado',
      sortKey: 'status',
      filterType: 'select',
      filterOptions: [
        { label: 'Activo', value: '0' },
        { label: 'Suspendido', value: '1' }
      ],
      cell: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.status === 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
          {row.status === 0 ? 'Activo' : 'Suspendido'}
        </span>
      )
    },
    {
      header: 'Matriculaciones',
      accessor: (row) => row.enrolments?.[0]?.method || '',
      sortKey: 'enrolMethod',
      filterType: 'select',
      filterOptions: [
        { label: 'Manual', value: 'manual' },
        { label: 'Cohorte', value: 'cohort' },
        { label: 'Auto-matriculación', value: 'self' },
        { label: 'Invitado', value: 'guest' }
      ],
      cell: (row) => (
        <div className="flex flex-col gap-2">
          {row.enrolments?.length > 0 ? (
            row.enrolments.map((enr, i) => (
              <div key={i} className="flex items-center gap-2">
                {getEnrolmentIcon(enr.method, i)}
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(enr.timestart)} - {enr.timeend ? formatDate(enr.timeend) : 'Sin límite'}
                </span>
              </div>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
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
                handleUserAction(row.status === 0 ? 'suspend' : 'activate', [row.id]); 
                setSelectedUsers([]);
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
                setSelectedUsers([row.id]);
                setUserGroupSelection('0');
                setUserNewGroupName('');
                setUserGroupModalOpen(true);
              }}
              className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2"
              title="Asignar a Grupo"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedUsers([row.id]);
                setUserMessageText('');
                setUserMessageModalOpen(true);
              }}
              className="text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 px-2"
              title="Enviar Mensaje"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                setExpirationUserIds([row.id]); 
                setExpirationEnabled(row.timeend > 0);
                if (row.timeend > 0) {
                  const d = new Date(row.timeend * 1000);
                  setExpirationDate(d.toISOString().split('T')[0]);
                } else {
                  setExpirationDate('');
                }
                setExpirationModalOpen(true); 
              }}
              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2"
              title="Configurar Expiración"
            >
              <CalendarClock className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                handleUserAction('remove', [row.id]); 
                setSelectedUsers([]);
              }}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2"
              title="Desmatricular"
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

  const userSelectionStatus = getSelectionStatus(selectedUsers, users);
  const userBulkActions = [
    ...(userSelectionStatus === 'all_active' ? [{ label: 'Suspender', onClick: () => { handleUserAction('suspend', selectedUsers); setSelectedUsers([]); }, variant: 'warning' }] : []),
    ...(userSelectionStatus === 'all_suspended' ? [{ label: 'Activar', onClick: () => { handleUserAction('activate', selectedUsers); setSelectedUsers([]); }, variant: 'success' }] : []),
    { label: 'Enviar Mensaje', onClick: () => { setUserMessageText(''); setUserMessageModalOpen(true); }, variant: 'outline' },
    { label: 'Asignar a Grupo', onClick: () => { setUserGroupSelection('0'); setUserNewGroupName(''); setUserGroupModalOpen(true); }, variant: 'outline' },
    { label: 'Configurar Expiración', onClick: () => { setExpirationUserIds(selectedUsers); setExpirationEnabled(false); setExpirationDate(''); setExpirationModalOpen(true); }, variant: 'outline' },
    { label: 'Desmatricular', onClick: () => { handleUserAction('remove', selectedUsers); setSelectedUsers([]); }, variant: 'destructive' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setExportModalOpen(true)}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
        <PermissionGate capability="can_manage_courses">
          <Button onClick={onOpenSelector}>
            <Users className="h-4 w-4 mr-2" /> Matricular Usuarios
          </Button>
        </PermissionGate>
      </div>
      
      <DataTable
        columns={usersCols}
        data={sortedUsers}
        totalCount={users.length}
        sort={sortUserKey}
        dir={sortUserDir}
        onSortChange={(key, dir) => { setSortUserKey(key); setSortUserDir(dir); }}
        onRowClick={(row) => onNavigateToDetail('course_user', { courseId, userId: row.id })}
        selectable={true}
        selectedIds={selectedUsers}
        onSelectionChange={setSelectedUsers}
        bulkActions={userBulkActions}
      />

      <Dialog
        open={expirationModalOpen}
        onClose={() => setExpirationModalOpen(false)}
        title="Configurar Expiración de Matriculación"
        description="Activa o desactiva la expiración para los usuarios seleccionados y establece una fecha límite."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExpirationModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSetExpirationSubmit}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={expirationEnabled} 
              onChange={(e) => setExpirationEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium">Habilitar expiración</span>
          </label>
          
          {expirationEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha de Expiración</label>
              <Input 
                type="date" 
                value={expirationDate} 
                onChange={(e) => setExpirationDate(e.target.value)} 
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        open={userMessageModalOpen}
        onClose={() => setUserMessageModalOpen(false)}
        title="Enviar Mensaje Privado"
        description="El mensaje será enviado a los usuarios seleccionados a través de la mensajería interna de Moodle."
        footer={
          <>
            <Button variant="ghost" onClick={() => setUserMessageModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleUserMessageSubmit(selectedUsers)}>Enviar Mensaje</Button>
          </>
        }
      >
        <div className="pt-2">
          <textarea
            className="w-full h-32 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            placeholder="Escribe el mensaje que recibirán los usuarios seleccionados..."
            value={userMessageText}
            onChange={(e) => setUserMessageText(e.target.value)}
          />
        </div>
      </Dialog>

      <Dialog
        open={userGroupModalOpen}
        onClose={() => setUserGroupModalOpen(false)}
        title="Asignar a Grupo de Curso"
        description="Selecciona un grupo existente o crea uno nuevo para los usuarios seleccionados."
        footer={
          <>
            <Button variant="ghost" onClick={() => setUserGroupModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleUserGroupSubmit(selectedUsers)}>Asignar</Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Grupo</label>
            <select
              value={userGroupSelection}
              onChange={(e) => setUserGroupSelection(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="0">Seleccionar grupo...</option>
              {coursegroups?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
              <option value="new">+ Crear nuevo grupo...</option>
            </select>
          </div>
          {userGroupSelection === 'new' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nombre del Grupo</label>
              <Input
                placeholder="Ej. Cohorte 2026, Revisión B..."
                value={userNewGroupName}
                onChange={(e) => setUserNewGroupName(e.target.value)}
              />
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
            <Button onClick={handleExport} disabled={isExportingDetails}>
              {isExportingDetails ? 'Generando...' : 'Exportar CSV'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Tipo de Exportación</label>
            <select
              value={exportOption}
              onChange={(e) => setExportOption(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="visible">Exportar Resumen (solo información visible)</option>
              <option value="detailed">Exportar con Detalles (incluye progreso por actividad)</option>
            </select>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
