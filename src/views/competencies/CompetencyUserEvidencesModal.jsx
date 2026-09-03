import React from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Calendar,
  ExternalLink,
  Award,
  Sparkles,
  Inbox
} from 'lucide-react';

export const CompetencyUserEvidencesModal = ({
  open,
  onClose,
  user,
  competencyName
}) => {
  if (!user) return null;

  const evidences = user.evidences || [];
  const isProficient = user.proficiency === 1;
  const isInReview = user.status === 1 || user.status === 2;

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha no registrada';
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Evidencias de Competencia"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 pt-2">
        {/* User & Competency Summary Header */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
              {getInitials(user.fullname)}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">
                {user.fullname}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
              {competencyName && (
                <p className="text-xs text-primary/80 font-medium truncate mt-0.5">
                  {competencyName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
            {isProficient ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1 font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                Competente
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs gap-1">
                <Clock className="h-3 w-3" />
                Aún no competente
              </Badge>
            )}

            {user.gradename && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {user.gradename}
              </Badge>
            )}

            {isInReview && (
              <Badge variant="warning" className="text-xs font-semibold animate-pulse">
                En Revisión
              </Badge>
            )}
          </div>
        </div>

        {/* Evidences List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Evidencias Registradas</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-semibold">
                {evidences.length}
              </span>
            </h4>
          </div>

          {evidences.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mx-auto mb-2.5">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Sin evidencias registradas
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Este usuario aún no cuenta con evidencias documentadas, evaluaciones de actividades o revisiones para esta competencia.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {evidences.map((evidence) => (
                <div
                  key={evidence.id}
                  className="p-4 rounded-xl border border-border bg-card/80 shadow-xs space-y-2.5 transition-all hover:border-border/80"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-border/50 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        {evidence.action === 0 && <FileText className="h-3.5 w-3.5 text-primary" />}
                        {evidence.action === 1 && <Sparkles className="h-3.5 w-3.5 text-sky-500" />}
                        {evidence.action === 2 && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        {evidence.action === 3 && <Award className="h-3.5 w-3.5 text-amber-500" />}
                        {evidence.actionname || 'Evidencia'}
                      </span>

                      {evidence.gradename && (
                        <Badge variant="outline" className="text-[10px] py-0 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                          {evidence.gradename}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(evidence.timecreated)}</span>
                    </div>
                  </div>

                  {evidence.note && (
                    <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/40 whitespace-pre-wrap leading-relaxed">
                      {evidence.note}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3 w-3 opacity-70" />
                      <span>Registrado por: <strong className="text-foreground font-medium">{evidence.actionuserfullname}</strong></span>
                    </span>

                    {evidence.url && (
                      <a
                        href={evidence.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Ver archivo adjunto</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
