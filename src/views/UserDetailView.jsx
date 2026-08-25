import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/DataTable';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { SelectorModal } from '../components/ui/SelectorModal';
import { ChevronLeft, ChevronRight, GraduationCap, Users, Layers, Trash2, BookOpen, User, ExternalLink, MessageSquare, Clock, UserCheck, UserX } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';
import { formatDate } from '../lib/utils';
import { API_CONFIG } from '../config/api';

export const UserDetailView = ({ userId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState('courses');
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedCohortIds, setSelectedCohortIds] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getUserDetail(userId);
      setData(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando usuario', description: err.message });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [userId, addToast, onBack]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLinkCohorts = async (cohortIds) => {
    try {
      await AdminerApi.userCohortAction('add', userId, cohortIds);
      addToast({ type: 'success', title: 'Usuario vinculado a cohorte(s)' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al vincular', description: err.message });
    }
  };

  const handleUnlinkCohort = async (cohortId) => {
    try {
      await AdminerApi.userCohortAction('remove', userId, [cohortId]);
      addToast({ type: 'success', title: 'Usuario desvinculado exitosamente' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al desvincular', description: err.message });
    }
  };

  const handleEnrollCourses = async (courseIds) => {
    try {
      await AdminerApi.userCourseAction('add', userId, courseIds);
      addToast({ type: 'success', title: 'Usuario matriculado exitosamente' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al matricular', description: err.message });
    }
  };

  const handleUnenrollCourse = async (courseId) => {
    try {
      await AdminerApi.userCourseAction('remove', userId, [courseId]);
      addToast({ type: 'success', title: 'Usuario desmatriculado del curso' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkUnenrollCourses = async (ids) => {
    try {
      await AdminerApi.userCourseAction('remove', userId, ids);
      addToast({ type: 'success', title: `${ids.length} curso(s) desmatriculados` });
      setSelectedCourseIds([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkUnlinkCohorts = async (ids) => {
    try {
      await AdminerApi.userCohortAction('remove', userId, ids);
      addToast({ type: 'success', title: `${ids.length} cohorte(s) desvinculadas` });
      setSelectedCohortIds([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleToggleSuspend = async () => {
    try {
      const action = data.is_active ? 'suspend' : 'activate';
      await AdminerApi.userAction({ action, userids: [userId] });
      addToast({ type: 'success', title: `Usuario ${data.is_active ? 'suspendido' : 'activado'} exitosamente` });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error de acción', description: err.message });
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      setLoading(true);
      const res = await AdminerApi.userAction({ action: 'message', userids: [userId], message_text: messageText });
      if (res.success) {
        addToast({ type: 'success', title: 'Mensaje enviado' });
        setMessageModalOpen(false);
        setMessageText('');
      } else {
        addToast({ type: 'error', title: 'Error al enviar mensaje', description: res.message });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error de red', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) return null;

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
      header: 'Progreso',
      sortKey: 'progress',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[100px] max-w-[200px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold">{row.progress}%</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <PermissionGate capability="can_manage_courses">
          <Button variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); handleUnenrollCourse(row.id); }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Desmatricular
          </Button>
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
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <PermissionGate capability="can_manage_cohorts">
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
            <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-900/30 rounded-xl">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.fullname}</h1>
                <Badge variant={data.is_active ? 'success' : 'destructive'} className="ml-2">
                  {data.is_active ? 'Activo' : 'Suspendido'}
                </Badge>
              </div>
              <p className="text-sm font-mono text-muted-foreground mt-0.5">{data.email}</p>
            </div>
          </div>
        </div>

        {/* Acciones Header */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap mt-4 sm:mt-0">
          <PermissionGate capability="can_update_users">
            <Button
              variant="outline"
              className={data.is_active ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
              onClick={handleToggleSuspend}
            >
              {data.is_active ? <><UserX className="h-4 w-4 mr-2" /> Suspender</> : <><UserCheck className="h-4 w-4 mr-2" /> Activar</>}
            </Button>
            <Button variant="outline" onClick={() => setMessageModalOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" /> Mensaje
            </Button>
          </PermissionGate>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await AdminerApi.getAutologinUrl(`/user/profile.php?id=${userId}`);
                window.open(res?.url || `${API_CONFIG.baseUrl}/user/profile.php?id=${userId}`, '_blank');
              } catch { window.open(`${API_CONFIG.baseUrl}/user/profile.php?id=${userId}`, '_blank'); }
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" /> Ver en Moodle
          </Button>
        </div>
      </div>

      {/* Grid Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-muted rounded-xl"><User className="h-5 w-5 text-muted-foreground" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Username</p>
            <h3 className="text-lg font-bold text-foreground">{data.username}</h3>
          </div>
        </div>
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-muted rounded-xl"><Clock className="h-5 w-5 text-muted-foreground" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Último Acceso</p>
            <h3 className="text-sm font-bold text-foreground">{data.lastaccess > 0 ? formatDate(data.lastaccess) : 'Nunca'}</h3>
          </div>
        </div>
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl"><BookOpen className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cursos</p>
            <h3 className="text-lg font-bold text-foreground">{data.completed_courses} / {data.enrolled_courses} Completados</h3>
          </div>
        </div>
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl"><GraduationCap className="h-5 w-5 text-blue-500" /></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Progreso Global</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${data.progress}%` }} />
              </div>
              <span className="text-sm font-bold text-foreground">{data.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/70">
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('courses')}
        >
          Cursos Inscritos ({data.courses.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'cohorts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('cohorts')}
        >
          Cohortes ({data.cohorts.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_courses">
              <Button onClick={() => { setSelectorType('courses'); setSelectorOpen(true); }}>
                <BookOpen className="h-4 w-4 mr-2" /> Matricular en Curso(s)
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={coursesCols}
            data={data.courses}
            loading={loading}
            totalCount={data.courses.length}
            selectable={true}
            selectedIds={selectedCourseIds}
            onSelectionChange={setSelectedCourseIds}
            onRowClick={(row) => onNavigateToDetail('course_user', { courseId: row.id, userId: userId })}
            bulkActions={[{
              label: 'Desmatricular Seleccionados',
              icon: <Trash2 className="h-3.5 w-3.5" />,
              onClick: handleBulkUnenrollCourses,
              variant: 'destructive'
            }]}
          />
        </div>
      )}

      {activeTab === 'cohorts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_cohorts">
              <Button onClick={() => { setSelectorType('cohorts'); setSelectorOpen(true); }}>
                <Layers className="h-4 w-4 mr-2" /> Vincular a Cohorte
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={cohortsCols}
            data={data.cohorts}
            loading={loading}
            totalCount={data.cohorts.length}
            selectable={true}
            selectedIds={selectedCohortIds}
            onSelectionChange={setSelectedCohortIds}
            onRowClick={(row) => onNavigateToDetail('cohort', row.id)}
            bulkActions={[{
              label: 'Remover Seleccionadas',
              icon: <Trash2 className="h-3.5 w-3.5" />,
              onClick: handleBulkUnlinkCohorts,
              variant: 'destructive'
            }]}
          />
        </div>
      )}

      {/* Modals */}
      <SelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        title={selectorType === 'cohorts' ? 'Vincular a Cohorte' : 'Matricular en Curso(s)'}
        entityType={selectorType}
        onSelect={selectorType === 'cohorts' ? handleLinkCohorts : handleEnrollCourses}
      />

      <Dialog
        open={messageModalOpen}
        onClose={() => { setMessageModalOpen(false); setMessageText(''); }}
        title="Enviar Mensaje Directo"
        description={`Envía un mensaje privado a ${data.fullname}. Llegará a Moodle y potencialmente por email.`}
        footer={
          <>
            <Button variant="outline" onClick={() => { setMessageModalOpen(false); setMessageText(''); }}>Cancelar</Button>
            <Button onClick={handleSendMessage} disabled={!messageText.trim() || loading}>Enviar Mensaje</Button>
          </>
        }
      >
        <div className="pt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensaje</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Escribe el mensaje aquí..."
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};
