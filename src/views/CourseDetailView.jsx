import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/DataTable';
import { SelectorModal } from '../components/ui/SelectorModal';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { ChevronLeft, ChevronRight, GraduationCap, Users, Layers, Trash2, BookOpen, Ban, Check, CalendarClock, UserCog, UserPlus, HelpCircle, MessageSquare, Download, Calendar, Edit3 } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';
import { useAuth } from '../context/AuthContext';
import { formatDateOnly } from '../lib/utils';

export const CourseDetailView = ({ courseId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'cohorts'
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState('cohorts'); // 'cohorts' | 'users'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedCohorts, setSelectedCohorts] = useState([]);
  
  // Local sorting for users
  const [sortUserKey, setSortUserKey] = useState('fullname');
  const [sortUserDir, setSortUserDir] = useState('ASC');

  // Local sorting for cohorts
  const [sortCohortKey, setSortCohortKey] = useState('name');
  const [sortCohortDir, setSortCohortDir] = useState('ASC');
  // User Expiration
  const [expirationModalOpen, setExpirationModalOpen] = useState(false);
  const [expirationUserIds, setExpirationUserIds] = useState([]);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationEnabled, setExpirationEnabled] = useState(false);

  // User Messaging
  const [userMessageModalOpen, setUserMessageModalOpen] = useState(false);
  const [userMessageText, setUserMessageText] = useState('');
  
  // User Group
  const [userGroupModalOpen, setUserGroupModalOpen] = useState(false);
  const [userGroupSelection, setUserGroupSelection] = useState('0');
  const [userNewGroupName, setUserNewGroupName] = useState('');

  // Cohort Link Configuration
  const [cohortLinkIds, setCohortLinkIds] = useState([]);
  const [cohortLinkConfigOpen, setCohortLinkConfigOpen] = useState(false);
  
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

  // Course Dates Edit
  const [courseDatesModalOpen, setCourseDatesModalOpen] = useState(false);
  const [courseDatesForm, setCourseDatesForm] = useState({ startdate: '', enddate: '' });
  const [courseDatesLoading, setCourseDatesLoading] = useState(false);

  const [cohortDetailOpen, setCohortDetailOpen] = useState(false);
  const [selectedCohortDetail, setSelectedCohortDetail] = useState(null);



  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCourseDetail(courseId);
      setData(res);
      setCourseDatesForm({
        startdate: res.startdate > 0 ? new Date(res.startdate * 1000).toISOString().split('T')[0] : '',
        enddate: res.enddate > 0 ? new Date(res.enddate * 1000).toISOString().split('T')[0] : ''
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando curso', description: err.message });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [courseId, addToast, onBack]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCohortAction = async (action, cohortIds, options = {}) => {
    try {
      await AdminerApi.courseCohortAction(action, courseId, cohortIds, options);
      const actionTitles = { add: 'vinculada(s)', remove: 'desvinculada(s)', suspend: 'suspendida(s)', activate: 'activada(s)', set_group: 'asignada(s) a grupo', set_expiration: 'actualizada(s)', message: 'notificada(s)' };
      addToast({ type: 'success', title: `Cohorte(s) ${actionTitles[action]} exitosamente` });
      setSelectedCohorts([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al procesar acción', description: err.message });
    }
  };

  const handleCohortLinkSubmit = async () => {
    const timeend = cohortExpirationEnabled && cohortExpirationDate ? Math.floor(new Date(cohortExpirationDate).getTime() / 1000) : 0;
    await handleCohortAction('add', cohortLinkIds, {
      groupid: cohortGroupSelection === 'new' ? 0 : parseInt(cohortGroupSelection),
      newgroupname: cohortGroupSelection === 'new' ? cohortNewGroupName : '',
      timeend
    });
    setCohortLinkConfigOpen(false);
  };

  const handleCohortGroupSubmit = async () => {
    await handleCohortAction('set_group', selectedCohorts.length > 0 ? selectedCohorts : [selectedCohortDetail?.id], {
      groupid: cohortGroupSelection === 'new' ? 0 : parseInt(cohortGroupSelection),
      newgroupname: cohortGroupSelection === 'new' ? cohortNewGroupName : ''
    });
    setCohortGroupModalOpen(false);
  };

  const handleCohortExpirationSubmit = async () => {
    const timeend = cohortExpirationEnabled && cohortExpirationDate ? Math.floor(new Date(cohortExpirationDate).getTime() / 1000) : 0;
    await handleCohortAction('set_expiration', selectedCohorts.length > 0 ? selectedCohorts : [selectedCohortDetail?.id], { timeend });
    setCohortExpirationModalOpen(false);
  };

  const handleCohortMessageSubmit = async () => {
    if (!cohortMessageText.trim()) return;
    await handleCohortAction('message', selectedCohorts.length > 0 ? selectedCohorts : [selectedCohortDetail?.id], { message_text: cohortMessageText });
    setCohortMessageModalOpen(false);
    setCohortMessageText('');
  };

  const handleUserAction = async (action, userIds, options = {}) => {
    try {
      const { timeend = 0, groupid = 0, newgroupname = '', message_text = '' } = options;
      await AdminerApi.courseUserAction(action, courseId, userIds, timeend, groupid, newgroupname, message_text);
      const actionTitles = { add: 'matriculado(s)', remove: 'desmatriculado(s)', suspend: 'suspendido(s)', activate: 'activado(s)', set_expiration: 'actualizado(s)', setgroup: 'asignado(s) a grupo', message: 'notificado(s)' };
      addToast({ type: 'success', title: `Usuario(s) ${actionTitles[action] || 'procesado(s)'} exitosamente` });
      setSelectedUsers([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al procesar acción', description: err.message });
    }
  };

  const handleSetExpirationSubmit = async () => {
    const timeend = expirationEnabled && expirationDate ? Math.floor(new Date(expirationDate).getTime() / 1000) : 0;
    await handleUserAction('set_expiration', expirationUserIds, { timeend });
    setExpirationModalOpen(false);
  };

  const handleUserMessageSubmit = async () => {
    if (!userMessageText.trim()) return;
    await handleUserAction('message', selectedUsers, { message_text: userMessageText });
    setUserMessageModalOpen(false);
    setUserMessageText('');
  };

  const handleUserGroupSubmit = async () => {
    await handleUserAction('setgroup', selectedUsers, {
      groupid: userGroupSelection === 'new' ? 0 : parseInt(userGroupSelection),
      newgroupname: userGroupSelection === 'new' ? userNewGroupName : ''
    });
    setUserGroupModalOpen(false);
  };

  const exportUsersCSV = () => {
    if (!sortedUsers.length) return;
    const headers = ['ID', 'Nombre', 'Email', 'Progreso', 'Estado', 'Roles'];
    const rows = sortedUsers.map(u => [
      u.id, 
      `"${u.fullname}"`, 
      u.email, 
      `${u.progress}%`, 
      u.status === 0 ? 'Activo' : 'Suspendido',
      `"${u.roles || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `curso_${data.shortname}_usuarios.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateCourseDates = async (e) => {
    e.preventDefault();
    setCourseDatesLoading(true);
    try {
      await AdminerApi.courseAction({
        action: 'update_dates',
        courseids: [courseId],
        startdate: courseDatesForm.startdate ? (new Date(courseDatesForm.startdate).getTime() / 1000) : 0,
        enddate: courseDatesForm.enddate ? (new Date(courseDatesForm.enddate).getTime() / 1000) : 0
      });
      addToast({ type: 'success', title: 'Fechas actualizadas exitosamente' });
      setCourseDatesModalOpen(false);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al actualizar fechas', description: err.message });
    } finally {
      setCourseDatesLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const sortedUsers = useMemo(() => {
    if (!data?.users) return [];
    return [...data.users].sort((a, b) => {
      let aVal = a[sortUserKey];
      let bVal = b[sortUserKey];
      
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (aVal === bVal) return 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortUserDir === 'ASC' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortUserDir === 'ASC' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data?.users, sortUserKey, sortUserDir]);

  const cohortUsers = useMemo(() => {
    if (!data?.users || !selectedCohortDetail) return [];
    const cohortIdStr = String(selectedCohortDetail.id);
    return data.users.filter(u => {
      if (!u.cohortids) return false;
      const ids = u.cohortids.split(',');
      return ids.includes(cohortIdStr);
    });
  }, [data?.users, selectedCohortDetail]);

  const sortedCohorts = useMemo(() => {
    if (!data?.cohorts) return [];
    return [...data.cohorts].sort((a, b) => {
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
  }, [data?.cohorts, sortCohortKey, sortCohortDir]);

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) return null;

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
              onClick={(e) => { e.stopPropagation(); handleUserAction(row.status === 0 ? 'suspend' : 'activate', [row.id]); }}
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
              onClick={(e) => { e.stopPropagation(); handleUserAction('remove', [row.id]); }}
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.status === 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
          {row.status === 0 ? 'Activa' : 'Suspendida'}
        </span>
      )
    },
    {
      header: 'Grupo',
      sortKey: 'groupid',
      filterType: 'text',
      cell: (row) => {
        const group = data?.coursegroups?.find(g => g.id === row.groupid);
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
              onClick={(e) => { e.stopPropagation(); handleCohortAction(row.status === 0 ? 'suspend' : 'activate', [row.id]); }}
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
              onClick={(e) => { e.stopPropagation(); handleCohortAction('remove', [row.id]); }}
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

  const userSelectionStatus = getSelectionStatus(selectedUsers, data.users);
  const userBulkActions = [
    ...(userSelectionStatus === 'all_active' ? [{ label: 'Suspender', onClick: () => handleUserAction('suspend', selectedUsers), variant: 'warning' }] : []),
    ...(userSelectionStatus === 'all_suspended' ? [{ label: 'Activar', onClick: () => handleUserAction('activate', selectedUsers), variant: 'success' }] : []),
    { label: 'Enviar Mensaje', onClick: () => { setUserMessageText(''); setUserMessageModalOpen(true); }, variant: 'outline' },
    { label: 'Asignar a Grupo', onClick: () => { setUserGroupSelection('0'); setUserNewGroupName(''); setUserGroupModalOpen(true); }, variant: 'outline' },
    { label: 'Configurar Expiración', onClick: () => { setExpirationUserIds(selectedUsers); setExpirationEnabled(false); setExpirationDate(''); setExpirationModalOpen(true); }, variant: 'outline' },
    { label: 'Desmatricular', onClick: () => handleUserAction('remove', selectedUsers), variant: 'destructive' }
  ];

  const cohortSelectionStatus = getSelectionStatus(selectedCohorts, data.cohorts);
  const cohortBulkActions = [
    ...(cohortSelectionStatus === 'all_active' ? [{ label: 'Suspender', onClick: () => handleCohortAction('suspend', selectedCohorts), variant: 'warning' }] : []),
    ...(cohortSelectionStatus === 'all_suspended' ? [{ label: 'Activar', onClick: () => handleCohortAction('activate', selectedCohorts), variant: 'success' }] : []),
    { label: 'Configurar Grupo', onClick: () => { setCohortGroupSelection('0'); setCohortNewGroupName(''); setCohortGroupModalOpen(true); }, variant: 'outline' },
    { label: 'Configurar Expiración', onClick: () => { setCohortExpirationEnabled(false); setCohortExpirationDate(''); setCohortExpirationModalOpen(true); }, variant: 'outline' },
    { label: 'Enviar Mensaje', onClick: () => { setCohortMessageText(''); setCohortMessageModalOpen(true); }, variant: 'outline' },
    { label: 'Desvincular', onClick: () => handleCohortAction('remove', selectedCohorts), variant: 'destructive' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button 
              onClick={onBack} 
              className="flex items-center hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">{data.fullname}</span>
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.fullname}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="font-mono">{data.shortname}</span>
                <span className="hidden sm:inline text-border">•</span>
                <div className="flex items-center gap-1.5" title="Fecha de creación">
                  <Calendar className="h-3.5 w-3.5" />
                  Creado: {formatDateOnly(data.timecreated)}
                </div>
                <div className="flex items-center gap-1.5" title="Inicio / Fin">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {data.startdate > 0 ? formatDateOnly(data.startdate) : 'Sin inicio'} 
                  {' — '} 
                  {data.enddate > 0 ? formatDateOnly(data.enddate) : 'Sin fin'}
                </div>
                <PermissionGate capability="can_update_courses">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 ml-1 text-xs text-primary hover:bg-primary/10"
                    onClick={() => setCourseDatesModalOpen(true)}
                  >
                    <Edit3 className="h-3 w-3 mr-1" /> Editar fechas
                  </Button>
                </PermissionGate>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/70">
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('users')}
        >
          Usuarios Inscritos ({data.users.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'cohorts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('cohorts')}
        >
          Cohortes Vinculadas ({data.cohorts.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={exportUsersCSV}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <PermissionGate capability="can_manage_courses">
              <Button onClick={() => { setSelectorType('users'); setSelectorOpen(true); }}>
                <Users className="h-4 w-4 mr-2" /> Matricular Usuarios
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={usersCols}
            data={sortedUsers}
            loading={loading}
            totalCount={data.users.length}
            sort={sortUserKey}
            dir={sortUserDir}
            onSortChange={(key, dir) => { setSortUserKey(key); setSortUserDir(dir); }}
            onRowClick={(row) => onNavigateToDetail('course_user', { courseId: data.id, userId: row.id })}
            selectable={true}
            selectedIds={selectedUsers}
            onSelectionChange={setSelectedUsers}
            bulkActions={userBulkActions}
          />
        </div>
      )}

      {activeTab === 'cohorts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_courses">
              <Button onClick={() => { setSelectorType('cohorts'); setSelectorOpen(true); }}>
                <Layers className="h-4 w-4 mr-2" /> Vincular Cohorte
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={cohortsCols}
            data={sortedCohorts}
            loading={loading}
            totalCount={data.cohorts.length}
            sort={sortCohortKey}
            dir={sortCohortDir}
            onSortChange={(key, dir) => { setSortCohortKey(key); setSortCohortDir(dir); }}
            onRowClick={(row) => { setSelectedCohortDetail(row); setCohortDetailOpen(true); }}
            selectable={true}
            selectedIds={selectedCohorts}
            onSelectionChange={setSelectedCohorts}
            bulkActions={cohortBulkActions}
          />
        </div>
      )}

      {/* Modals */}
      <SelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        title={selectorType === 'cohorts' ? 'Vincular Cohorte a Curso' : 'Matricular Usuario(s)'}
        entityType={selectorType}
        onSelect={(ids) => {
          if (selectorType === 'cohorts') {
            setSelectorOpen(false);
            setCohortLinkIds(ids);
            setCohortGroupSelection('0');
            setCohortNewGroupName('');
            setCohortExpirationEnabled(false);
            setCohortExpirationDate('');
            setCohortLinkConfigOpen(true);
          } else {
            handleUserAction('add', ids);
          }
        }}
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

      {/* User Message Modal */}
      <Dialog
        open={userMessageModalOpen}
        onClose={() => setUserMessageModalOpen(false)}
        title="Enviar Mensaje Privado"
        description="El mensaje será enviado a los usuarios seleccionados a través de la mensajería interna de Moodle."
        footer={
          <>
            <Button variant="ghost" onClick={() => setUserMessageModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleUserMessageSubmit}>Enviar Mensaje</Button>
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

      {/* Course Dates Modal */}
      <Dialog
        open={courseDatesModalOpen}
        onClose={() => setCourseDatesModalOpen(false)}
        title="Editar Fechas del Curso"
        description="Establece o elimina las fechas de inicio y fin del curso."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCourseDatesModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateCourseDates} disabled={courseDatesLoading}>
              {courseDatesLoading ? 'Guardando...' : 'Guardar Fechas'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateCourseDates} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha de Inicio</label>
              <Input 
                type="date" 
                value={courseDatesForm.startdate} 
                onChange={(e) => setCourseDatesForm({ ...courseDatesForm, startdate: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground">Deja en blanco para no definir inicio.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha de Fin</label>
              <Input 
                type="date" 
                value={courseDatesForm.enddate} 
                onChange={(e) => setCourseDatesForm({ ...courseDatesForm, enddate: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground">Deja en blanco para no definir fin.</p>
            </div>
          </div>
        </form>
      </Dialog>

      {/* User Group Modal */}
      <Dialog
        open={userGroupModalOpen}
        onClose={() => setUserGroupModalOpen(false)}
        title="Asignar a Grupo de Curso"
        description="Selecciona un grupo existente o crea uno nuevo para los usuarios seleccionados."
        footer={
          <>
            <Button variant="ghost" onClick={() => setUserGroupModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleUserGroupSubmit}>Asignar</Button>
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
              {data.coursegroups?.map(g => (
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
      
      {/* Cohort Link Config Modal */}
      <Dialog
        open={cohortLinkConfigOpen}
        onClose={() => setCohortLinkConfigOpen(false)}
        title="Opciones de Vinculación de Cohorte"
        description="Opcionalmente, puedes asignar a los miembros a un grupo del curso y establecer una fecha de expiración."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCohortLinkConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleCohortLinkSubmit}>Vincular</Button>
          </>
        }
      >
        <div className="space-y-6 pt-2">
          {/* Group */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Grupo (Opcional)
            </label>
            <select
              value={cohortGroupSelection}
              onChange={(e) => setCohortGroupSelection(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="0">Ninguno</option>
              {data.coursegroups?.map(g => (
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
          
          {/* Expiration */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={cohortExpirationEnabled} 
                onChange={(e) => setCohortExpirationEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Habilitar expiración de matrícula</span>
            </label>
            
            {cohortExpirationEnabled && (
              <Input 
                type="date" 
                value={cohortExpirationDate} 
                onChange={(e) => setCohortExpirationDate(e.target.value)} 
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>
        </div>
      </Dialog>

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
            {data.coursegroups?.map(g => (
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
    </div>
  );
};
