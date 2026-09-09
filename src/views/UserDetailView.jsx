import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useUserDetail, useUserCohortAction, useUserCourseAction, useUserAction } from '../hooks/useAdminerQueries';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Badge } from '../components/ui/Badge';
import { SelectorModal } from '../components/ui/SelectorModal';
import { ChevronLeft, ChevronRight, GraduationCap, Clock, BookOpen, User, ExternalLink, MessageSquare, UserCheck, UserX, KeyRound, Shield } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDate } from '../lib/utils';
import { API_CONFIG } from '../config/api';
import { AdminerApi } from '../services/adminer-api';
import { UserCoursesTab } from './users/UserCoursesTab';
import { UserCohortsTab } from './users/UserCohortsTab';
import { UserCompetenciesTab } from './users/UserCompetenciesTab';

export const UserDetailView = ({ userId, onBack, onNavigateToDetail, parentLabel }) => {
  const [, setLocation] = useLocation();
  const fallbackBack = React.useCallback(() => setLocation('/users'), [setLocation]);
  const handleBack = onBack || fallbackBack;
  const handleNavigateToDetail = onNavigateToDetail || ((entity, id) => {
    if (entity === 'course') {
      setLocation(`/courses/${id}`);
    } else if (entity === 'cohort') {
      setLocation(`/cohorts/${id}`);
    } else {
      setLocation(`/${entity}s/${id}`);
    }
  });

  const { addToast } = useToast();
  
  const { data, isLoading: loading, error } = useUserDetail(userId);
  const userCohortAction = useUserCohortAction();
  const userCourseAction = useUserCourseAction();
  const userAction = useUserAction();

  const [activeTab, setActiveTab] = useState('courses');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState('courses');
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [tempPassConfirmOpen, setTempPassConfirmOpen] = useState(false);
  const [tempPassLoading, setTempPassLoading] = useState(false);

  useEffect(() => {
    if (error) {
      addToast({ type: 'error', title: 'Error cargando usuario', description: error.message });
      handleBack();
    }
  }, [error, addToast, handleBack]);

  const systemRoles = React.useMemo(() => {
    if (Array.isArray(data?.system_roles) && data.system_roles.length > 0) {
      return data.system_roles;
    }
    if (data?.is_admin) {
      return [{ id: 0, name: 'Administrador del sitio', shortname: 'siteadmin' }];
    }
    return [];
  }, [data?.system_roles, data?.is_admin]);

  const handleLinkCohorts = async (cohortIds) => {
    try {
      await userCohortAction.mutateAsync({ action: 'add', userid: userId, cohortids: cohortIds });
      addToast({ type: 'success', title: 'Usuario vinculado a cohorte(s)' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al vincular', description: err.message });
    }
  };

  const handleUnlinkCohort = async (cohortId) => {
    try {
      await userCohortAction.mutateAsync({ action: 'remove', userid: userId, cohortids: [cohortId] });
      addToast({ type: 'success', title: 'Usuario desvinculado exitosamente' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al desvincular', description: err.message });
    }
  };

  const handleEnrollCourses = async (courseIds) => {
    try {
      await userCourseAction.mutateAsync({ action: 'add', userid: userId, courseids: courseIds });
      addToast({ type: 'success', title: 'Usuario matriculado exitosamente' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al matricular', description: err.message });
    }
  };

  const handleUnenrollCourse = async (courseId) => {
    try {
      await userCourseAction.mutateAsync({ action: 'remove', userid: userId, courseids: [courseId] });
      addToast({ type: 'success', title: 'Usuario desmatriculado del curso' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkUnenrollCourses = async (ids) => {
    try {
      await userCourseAction.mutateAsync({ action: 'remove', userid: userId, courseids: ids });
      addToast({ type: 'success', title: `${ids.length} curso(s) desmatriculados` });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleUserCourseAction = async (action, courseIds, extraParams = {}) => {
    try {
      await userCourseAction.mutateAsync({ action, userid: userId, courseids: courseIds, extraParams });
      let title = '';
      if (action === 'suspend') title = 'Matriculación suspendida exitosamente';
      else if (action === 'activate') title = 'Matriculación activada exitosamente';
      else if (action === 'update_dates') title = 'Fechas actualizadas exitosamente';
      addToast({ type: 'success', title });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkUnlinkCohorts = async (ids) => {
    try {
      await userCohortAction.mutateAsync({ action: 'remove', userid: userId, cohortids: ids });
      addToast({ type: 'success', title: `${ids.length} cohorte(s) desvinculadas` });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleToggleSuspend = async () => {
    try {
      const action = data.is_active ? 'suspend' : 'activate';
      await userAction.mutateAsync({ action, userids: [userId] });
      addToast({ type: 'success', title: `Usuario ${data.is_active ? 'suspendido' : 'activado'} exitosamente` });
    } catch (err) {
      addToast({ type: 'error', title: 'Error de acción', description: err.message });
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      setSendingMessage(true);
      const res = await userAction.mutateAsync({ action: 'message', userids: [userId], message_text: messageText });
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
      setSendingMessage(false);
    }
  };

  const handleSendTempPassword = async () => {
    try {
      setTempPassLoading(true);
      const res = await userAction.mutateAsync({ action: 'send_temp_password', userids: [userId] });
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Contraseña temporal enviada',
          description: `Se envió el correo con la contraseña temporal e instrucciones a ${data.fullname}.`
        });
        setTempPassConfirmOpen(false);
      } else {
        addToast({ type: 'error', title: 'Error al enviar clave temporal', description: res.message });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setTempPassLoading(false);
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-border/70 pb-6">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
          <button 
            onClick={handleBack} 
            className="flex items-center hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
          </button>
          <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
          <span className="text-foreground truncate max-w-[300px]">{data.fullname}</span>
        </nav>
        
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-900/30 rounded-xl shrink-0">
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

          {/* Acciones colocadas debajo del nombre y la imagen */}
          <div className="flex items-center gap-2 flex-wrap mt-4 pt-1">
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
              <Button variant="outline" onClick={() => setTempPassConfirmOpen(true)}>
                <KeyRound className="h-4 w-4 mr-2" /> Clave Temporal
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
      </div>

      {/* Grid Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Username & Último Acceso combinados */}
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-muted rounded-xl shrink-0"><User className="h-5 w-5 text-muted-foreground" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Username & Último Acceso</p>
            <h3 className="text-base font-bold text-foreground truncate mt-0.5">{data.username}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{data.lastaccess > 0 ? formatDate(data.lastaccess) : 'Nunca'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Roles de Sistema */}
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl shrink-0"><Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Roles de Sistema</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {systemRoles.length > 0 ? (
                systemRoles.map((r) => (
                  <Badge 
                    key={r.id || r.shortname} 
                    variant={r.shortname === 'siteadmin' ? 'default' : 'secondary'}
                    className="text-xs py-0.5 px-2 font-medium"
                  >
                    {r.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">Sin roles asignados</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Cursos */}
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl shrink-0"><BookOpen className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Cursos</p>
            <h3 className="text-base font-bold text-foreground">{data.completed_courses} / {data.enrolled_courses} Completados</h3>
          </div>
        </div>

        {/* Card 4: Progreso Global */}
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl shrink-0"><GraduationCap className="h-5 w-5 text-blue-500" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Progreso Global</p>
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
      <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'courses'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Cursos Inscritos</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{data.courses.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('cohorts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'cohorts'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Cohortes</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{data.cohorts.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('competencies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'competencies'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Competencias</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{data.competencies?.length || 0}</Badge>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'courses' && (
        <UserCoursesTab
          courses={data.courses}
          loading={loading}
          userId={userId}
          userFullname={data.fullname}
          onOpenSelector={() => { setSelectorType('courses'); setSelectorOpen(true); }}
          handleUnenrollCourse={handleUnenrollCourse}
          handleBulkUnenrollCourses={handleBulkUnenrollCourses}
          handleUserCourseAction={handleUserCourseAction}
          onNavigateToDetail={handleNavigateToDetail}
        />
      )}

      {activeTab === 'cohorts' && (
        <UserCohortsTab
          cohorts={data.cohorts}
          courses={data.courses}
          loading={loading}
          onOpenSelector={() => { setSelectorType('cohorts'); setSelectorOpen(true); }}
          handleUnlinkCohort={handleUnlinkCohort}
          handleBulkUnlinkCohorts={handleBulkUnlinkCohorts}
        />
      )}

      {activeTab === 'competencies' && (
        <UserCompetenciesTab
          competencies={data.competencies || []}
          loading={loading}
          userId={userId}
          userFullname={data.fullname}
          onNavigateToDetail={onNavigateToDetail}
        />
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
            <Button onClick={handleSendMessage} disabled={!messageText.trim() || sendingMessage}>Enviar Mensaje</Button>
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

      {/* Modal: Confirmar Envío de Contraseña Temporal */}
      <ConfirmDialog
        open={tempPassConfirmOpen}
        onClose={() => setTempPassConfirmOpen(false)}
        onConfirm={handleSendTempPassword}
        title="¿Enviar link de contraseña temporal?"
        description={`Se enviará un correo electrónico a ${data.fullname} (${data.email}) con una contraseña temporal e instrucciones de ingreso. Al iniciar sesión, se le solicitará cambiar su contraseña.`}
        loading={tempPassLoading}
        confirmText="Sí, enviar enlace"
      />

    </div>
  );
};
