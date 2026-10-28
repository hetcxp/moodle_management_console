import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  AlertTriangle,
  Bug,
  Lightbulb,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Filter,
  Check,
  Loader2,
  ChevronRight,
  ShieldCheck,
  User
} from 'lucide-react';
import { FeedbackApi } from '../services/api/feedback-api';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth';
import { useToast } from '../components/ui/Toast';

export const FeedbackReportsView = () => {
  const { permissions, token } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const isManagerOrAdmin = Boolean(permissions?.can_config_site || permissions?.can_manage_categories);

  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'all'
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [newStatus, setNewStatus] = useState('resolved');
  const [screenshotModal, setScreenshotModal] = useState(null); // { url, rawUrl, ticketId }
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [fallbackTried, setFallbackTried] = useState(false);

  const resolveScreenshotUrl = (rawUrl, userToken) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;

    try {
      const url = new URL(rawUrl, window.location.origin);
      if (userToken) {
        if (url.pathname.includes('/pluginfile.php') && !url.pathname.includes('/webservice/pluginfile.php')) {
          url.pathname = url.pathname.replace('/pluginfile.php', '/webservice/pluginfile.php');
        }
        url.searchParams.set('token', userToken);
      } else {
        if (url.pathname.includes('/webservice/pluginfile.php')) {
          url.pathname = url.pathname.replace('/webservice/pluginfile.php', '/pluginfile.php');
          url.searchParams.delete('token');
        }
      }
      return url.toString();
    } catch {
      if (userToken) {
        const cleanUrl = rawUrl.replace(/[?&]token=[^&]*/, '');
        const sep = cleanUrl.includes('?') ? '&' : '?';
        return `${cleanUrl}${sep}token=${encodeURIComponent(userToken)}`;
      }
      return rawUrl.replace('/webservice/pluginfile.php', '/pluginfile.php').replace(/[?&]token=[^&]*/, '');
    }
  };

  const getFallbackUrl = (currentUrl, userToken) => {
    if (!currentUrl || currentUrl.startsWith('data:') || currentUrl.startsWith('blob:')) return null;
    try {
      const url = new URL(currentUrl, window.location.origin);
      if (url.pathname.includes('/webservice/pluginfile.php')) {
        url.pathname = url.pathname.replace('/webservice/pluginfile.php', '/pluginfile.php');
        url.searchParams.delete('token');
        return url.toString();
      }
      if (url.pathname.includes('/pluginfile.php') && userToken) {
        url.pathname = url.pathname.replace('/pluginfile.php', '/webservice/pluginfile.php');
        url.searchParams.set('token', userToken);
        return url.toString();
      }
    } catch {
      if (currentUrl.includes('/webservice/pluginfile.php')) {
        return currentUrl.replace('/webservice/pluginfile.php', '/pluginfile.php').replace(/[?&]token=[^&]*/, '');
      }
    }
    return null;
  };

  // Query for user's own tickets
  const {
    data: myData,
    isLoading: loadingMine,
    refetch: refetchMine
  } = useQuery({
    queryKey: ['feedback', 'my_reports'],
    queryFn: () => FeedbackApi.getMyFeedback({ page: 0, perpage: 50 }),
  });

  // Query for all tickets (admin view)
  const {
    data: allData,
    isLoading: loadingAll,
    refetch: refetchAll
  } = useQuery({
    queryKey: ['feedback', 'all_tickets', statusFilter, typeFilter],
    queryFn: () => FeedbackApi.getFeedbackTickets({ status: statusFilter, type: typeFilter, page: 0, perpage: 50 }),
    enabled: isManagerOrAdmin && activeTab === 'all',
  });

  // Mutation to update ticket status
  const updateStatusMutation = useMutation({
    mutationFn: ({ feedbackid, status, comment }) =>
      FeedbackApi.updateFeedbackStatus({ feedbackid, status, admincomment: comment }),
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Ticket actualizado',
        description: 'El estado del ticket y la notificación al usuario han sido procesados.',
      });
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setSelectedTicket(null);
      setAdminComment('');
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Error al actualizar',
        description: err.message || 'No se pudo actualizar el ticket.',
      });
    },
  });

  const currentList = activeTab === 'all' ? (allData?.items || []) : (myData?.items || []);
  const isLoading = activeTab === 'all' ? loadingAll : loadingMine;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Resuelto
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="h-3 w-3" aria-hidden="true" />
            En revisión
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
            <XCircle className="h-3 w-3" aria-hidden="true" />
            Desestimado
          </span>
        );
      case 'new':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Nuevo
          </span>
        );
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'error':
        return <Bug className="h-4 w-4 text-rose-500" aria-hidden="true" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
      case 'issue':
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />;
    }
  };

  const handleResolveSubmit = (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    updateStatusMutation.mutate({
      feedbackid: selectedTicket.id,
      status: newStatus,
      comment: adminComment,
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
            Centro de Soporte & Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitorea el estado de tus consultas, problemas reportados y sugerencias.
          </p>
        </div>

        {/* Tab switcher for admins */}
        {isManagerOrAdmin && (
          <div className="flex rounded-xl bg-muted p-1 border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('mine')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'mine'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mis Soportes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Gestión Global (Admin)
            </button>
          </div>
        )}
      </div>

      {/* Filters bar if admin view */}
      {activeTab === 'all' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Filtros:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="new">Nuevos</option>
            <option value="in_review">En revisión</option>
            <option value="resolved">Resueltos</option>
            <option value="rejected">Desestimados</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
          >
            <option value="">Todos los tipos</option>
            <option value="issue">Problema</option>
            <option value="error">Error técnico</option>
            <option value="suggestion">Sugerencia</option>
          </select>

          <button
            type="button"
            onClick={() => (activeTab === 'all' ? refetchAll() : refetchMine())}
            className="ml-auto text-xs text-primary hover:underline font-semibold"
          >
            Actualizar lista
          </button>
        </div>
      )}

      {/* Tickets List / Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No hay solicitudes de soporte</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {activeTab === 'mine'
                ? 'Puedes solicitar soporte técnico o reportar sugerencias haciendo clic en el botón flotante de la esquina inferior derecha.'
                : 'No se encontraron tickets con los filtros aplicados.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {currentList.map((ticket) => (
              <div
                key={ticket.id}
                className="p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      #{ticket.id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold capitalize text-foreground">
                      {getTypeIcon(ticket.type)}
                      {ticket.type}
                    </span>
                    {getStatusBadge(ticket.status)}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(ticket.timecreated * 1000).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    {ticket.userfullname && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" aria-hidden="true" />
                        {ticket.userfullname}
                      </span>
                    )}
                    {ticket.pageurl && (
                      <span className="truncate max-w-[200px]" title={ticket.pageurl}>
                        Ruta: <code>{ticket.pageurl}</code>
                      </span>
                    )}
                  </div>

                  {ticket.admincomment && (
                    <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                      <strong>Respuesta del equipo:</strong> {ticket.admincomment}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ticket.screenshoturl && (
                    <button
                      type="button"
                      onClick={() => {
                        const effectiveToken = token || AuthService.getToken();
                        setScreenshotModal({
                          url: resolveScreenshotUrl(ticket.screenshoturl, effectiveToken),
                          rawUrl: ticket.screenshoturl,
                          ticketId: ticket.id,
                          token: effectiveToken,
                        });
                        setImageLoading(true);
                        setImageError(false);
                        setFallbackTried(false);
                      }}
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Captura
                    </button>
                  )}

                  {isManagerOrAdmin && activeTab === 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setNewStatus(ticket.status === 'new' ? 'resolved' : ticket.status);
                        setAdminComment(ticket.admincomment || '');
                      }}
                      className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1"
                    >
                      Gestionar
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Ticket Resolution Modal */}
      {selectedTicket && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Gestionar Ticket #{selectedTicket.id}
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedTicket.description}
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Actualizar Estado
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                >
                  <option value="new">Nuevo</option>
                  <option value="in_review">En revisión</option>
                  <option value="resolved">Resuelto</option>
                  <option value="rejected">Desestimado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                  Respuesta o nota para el usuario
                </label>
                <textarea
                  rows={3}
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Explica la resolución o solución aplicada (será notificada al usuario por mensajería)..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Guardar & Notificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screenshot Zoom Modal */}
      {screenshotModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Captura de pantalla ticket #${screenshotModal.ticketId}`}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md transition-opacity"
          onClick={() => setScreenshotModal(null)}
        >
          <div
            className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted-foreground">#{screenshotModal.ticketId}</span>
                <h3 className="text-sm font-bold text-foreground">Captura de pantalla adjunta</h3>
              </div>
              <button
                type="button"
                onClick={() => setScreenshotModal(null)}
                aria-label="Cerrar vista de captura"
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Content area */}
            <div className="relative flex-1 min-h-[240px] max-h-[calc(90vh-110px)] overflow-auto bg-black/5 dark:bg-black/40 flex items-center justify-center p-4">
              {imageLoading && !imageError && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium">Cargando captura...</span>
                </div>
              )}

              {imageError ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center max-w-md">
                  <div className="rounded-full bg-rose-500/10 p-3 text-rose-500">
                    <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">No se pudo cargar la imagen</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      El archivo no está disponible o requiere una sesión activa con permisos de descarga.
                    </p>
                  </div>
                  {screenshotModal.url && (
                    <a
                      href={screenshotModal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-muted transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Intentar abrir en pestaña nueva
                    </a>
                  )}
                </div>
              ) : (
                <img
                  src={screenshotModal.url}
                  alt={`Captura ticket #${screenshotModal.ticketId}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    const fallbackUrl = !fallbackTried
                      ? getFallbackUrl(screenshotModal.url, screenshotModal.token)
                      : null;
                    if (fallbackUrl && fallbackUrl !== screenshotModal.url) {
                      setFallbackTried(true);
                      setScreenshotModal((prev) => (prev ? { ...prev, url: fallbackUrl } : null));
                    } else {
                      setImageLoading(false);
                      setImageError(true);
                    }
                  }}
                  className={`max-w-full h-auto rounded-lg shadow-sm transition-opacity duration-200 ${
                    imageLoading ? 'opacity-0 absolute' : 'opacity-100'
                  }`}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
              <span>Resolución y vista del navegador al momento del reporte</span>
              <button
                type="button"
                onClick={() => setScreenshotModal(null)}
                className="rounded-lg px-3 py-1 text-xs font-semibold hover:bg-muted text-foreground transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackReportsView;
