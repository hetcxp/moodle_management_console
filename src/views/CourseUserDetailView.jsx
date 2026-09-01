import React, { useState, useEffect, useMemo } from 'react';
import { useCourseUserDetail, useCourseUserAction } from '../hooks/useAdminerQueries';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/DataTable';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { ChevronLeft, ChevronRight, User, Ban, Check, CalendarClock, Trash2, Mail, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';

export const CourseUserDetailView = ({ courseId, userId, onBack, parentLabel }) => {
  const { addToast } = useToast();
  
  const { data, isLoading: loading, error } = useCourseUserDetail(courseId, userId);
  const courseUserAction = useCourseUserAction();

  const [activeTab, setActiveTab] = useState('performance'); // 'performance' | 'audit'

  const [expirationModalOpen, setExpirationModalOpen] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationEnabled, setExpirationEnabled] = useState(false);

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');

  const [unenrollConfirmOpen, setUnenrollConfirmOpen] = useState(false);

  useEffect(() => {
    if (error) {
      addToast({ type: 'error', title: 'Error cargando detalle', description: error.message });
      onBack();
    }
  }, [error, addToast, onBack]);

  const handleAction = async (action, options = {}) => {
    try {
      if (action === 'message') {
        if (!messageText.trim()) {
          addToast({ type: 'warning', title: 'El mensaje no puede estar vacío' });
          return;
        }
        await courseUserAction.mutateAsync({
          action: 'message',
          courseid: courseId,
          userids: [userId],
          timeend: 0,
          message_text: messageText
        });
        addToast({ type: 'success', title: 'Mensaje enviado exitosamente' });
        setMessageModalOpen(false);
        setMessageText('');
        return;
      }

      await courseUserAction.mutateAsync({
        action,
        courseid: courseId,
        userids: [userId],
        timeend: options.timeend || 0
      });
      
      if (action === 'remove') {
        addToast({ type: 'success', title: 'Usuario desmatriculado exitosamente' });
        onBack();
        return;
      }

      const actionTitles = { suspend: 'suspendido', activate: 'activado', set_expiration: 'actualizada' };
      addToast({ type: 'success', title: `Matriculación ${actionTitles[action]} exitosamente` });
      
      if (action === 'set_expiration') setExpirationModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al procesar acción', description: err.message });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatActivityName = (modname) => {
    const names = {
      assign: 'Tarea',
      quiz: 'Cuestionario',
      forum: 'Foro',
      scorm: 'Paquete SCORM',
      page: 'Página',
      resource: 'Archivo',
      url: 'URL',
      folder: 'Carpeta',
      label: 'Etiqueta',
      book: 'Libro',
      lesson: 'Lección',
      feedback: 'Retroalimentación',
      choice: 'Consulta',
      glossary: 'Glosario'
    };
    return names[modname] || modname;
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) return null;

  const user = data.user;

  const activitiesCols = [
    {
      header: 'Actividad',
      sortKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground">{formatActivityName(row.modname)}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Estado de Finalización',
      sortKey: 'completionstatus',
      cell: (row) => {
        let icon = <XCircle className="h-4 w-4 text-muted-foreground" />;
        let text = 'Incompleto';
        let color = 'text-muted-foreground';

        if (row.completionstatus === 1 || row.completionstatus === 2) {
          icon = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
          text = 'Completado';
          color = 'text-emerald-600';
        } else if (row.completionstatus === 3) {
          icon = <XCircle className="h-4 w-4 text-rose-500" />;
          text = 'Fallado';
          color = 'text-rose-600';
        }

        return (
          <div className={`flex items-center gap-2 ${color} text-sm font-medium`}>
            {icon} {text}
          </div>
        );
      }
    },
    {
      header: 'Calificación',
      sortKey: 'grade',
      cell: (row) => (
        <span className="font-medium text-foreground">
          {row.grade !== '' ? row.grade : '-'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button 
              onClick={onBack} 
              className="flex items-center hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">Detalle de Usuario</span>
          </nav>
          
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/10 text-primary rounded-2xl">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{user.fullname}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              
              <div className="flex items-center gap-3 mt-3">
                <Badge variant={data.status === 0 ? 'success' : 'destructive'}>
                  {data.status === 0 ? 'Activo en Curso' : 'Suspendido en Curso'}
                </Badge>
                <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                  Progreso: {data.progress}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <PermissionGate capability="can_manage_courses">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setMessageText(''); setMessageModalOpen(true); }}
            >
              <Mail className="h-4 w-4 mr-2" /> Mensaje
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExpirationEnabled(data.timeend > 0);
                if (data.timeend > 0) {
                  setExpirationDate(new Date(data.timeend * 1000).toISOString().split('T')[0]);
                } else {
                  setExpirationDate('');
                }
                setExpirationModalOpen(true);
              }}
            >
              <CalendarClock className="h-4 w-4 mr-2" /> Expiración
            </Button>
            
            <Button
              variant={data.status === 0 ? "outline" : "default"}
              size="sm"
              className={data.status === 0 ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
              onClick={() => handleAction(data.status === 0 ? 'suspend' : 'activate')}
            >
              {data.status === 0 ? (
                <><Ban className="h-4 w-4 mr-2" /> Suspender</>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> Activar</>
              )}
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setUnenrollConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Desmatricular
            </Button>
          </div>
        </PermissionGate>
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50">
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'performance'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Desempeño y Actividades</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{(data.activities || []).length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'audit'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Auditoría de Acceso</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'performance' && (
        <div className="space-y-6 pt-4">
          <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Progreso General</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${data.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                  style={{ width: `${data.progress}%` }}
                />
              </div>
              <span className="text-xl font-bold text-foreground w-12 text-right">{data.progress}%</span>
            </div>
          </div>

          <DataTable
            columns={activitiesCols}
            data={data.activities || []}
            totalCount={(data.activities || []).length}
            selectable={false}
          />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Fechas de Matriculación</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Inicio de Matrícula</span>
                <span className="text-sm font-medium text-foreground">{formatDate(data.timestart)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Fin de Matrícula</span>
                <span className="text-sm font-medium text-foreground">{data.timeend ? formatDate(data.timeend) : 'Sin límite'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Métodos Activos</span>
                <div className="flex flex-col items-end">
                  {data.enrolments?.map((e, i) => (
                    <span key={i} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded mb-1">{e.method}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Registros de Acceso</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Primer Acceso al Curso</span>
                <span className="text-sm font-medium text-foreground">{formatDate(data.firstaccess)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Último Acceso al Curso</span>
                <span className="text-sm font-medium text-foreground">{formatDate(data.lastaccess)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <Dialog
        open={expirationModalOpen}
        onClose={() => setExpirationModalOpen(false)}
        title="Configurar Expiración de Matriculación"
        description="Activa o desactiva la expiración para este usuario y establece una fecha límite."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExpirationModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              const t = expirationEnabled && expirationDate ? Math.floor(new Date(expirationDate).getTime() / 1000) : 0;
              handleAction('set_expiration', { timeend: t });
            }}>Guardar</Button>
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
        open={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        title="Enviar Mensaje a Usuario"
        description="El mensaje se enviará utilizando el sistema interno de Moodle."
        footer={
          <>
            <Button variant="ghost" onClick={() => setMessageModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleAction('message')}>Enviar</Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Escribe tu mensaje aquí..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          ></textarea>
        </div>
      </Dialog>

      {/* Confirmation Dialog for Unenrollment */}
      <Dialog
        open={unenrollConfirmOpen}
        onClose={() => setUnenrollConfirmOpen(false)}
        title="Confirmar Desmatriculación"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas desmatricular a <strong className="text-foreground font-semibold">"{user?.fullname}"</strong> de este curso? Perderá acceso permanentemente.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setUnenrollConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setUnenrollConfirmOpen(false);
                handleAction('remove');
              }}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Desmatricular
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
