import React, { useState, useMemo } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import {
  useCompetencyReviews,
  useCompetencyReviewAction
} from '../../hooks/useAdminerQueries';
import {
  Clock,
  Search,
  User,
  CheckCircle2,
  XCircle,
  Award,
  Loader2,
  FileText,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

export const CompetencyReviewsModal = ({
  open,
  onClose,
  frameworkId = 0,
  competencyId = 0,
  title = 'Revisiones de Competencias Pendientes'
}) => {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeReview, setActiveReview] = useState(null);
  const [grade, setGrade] = useState(1);
  const [proficiency, setProficiency] = useState(1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: reviewsData,
    isLoading,
    refetch
  } = useCompetencyReviews({
    frameworkid: frameworkId || 0,
    competencyid: competencyId || 0,
    search: search.trim()
  });

  const { mutateAsync: performReviewAction } = useCompetencyReviewAction();

  const reviews = useMemo(() => reviewsData?.reviews || [], [reviewsData]);

  const handleStartReview = (rev) => {
    setActiveReview(rev);
    setGrade(rev.currentgrade || (rev.scaleoptions?.[0]?.value ?? 1));
    setProficiency(rev.proficiency ?? 1);
    setNote('');
  };

  const handleCancelReview = () => {
    setActiveReview(null);
    setNote('');
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!activeReview) return;

    setIsSubmitting(true);
    try {
      await performReviewAction({
        action: 'evaluate',
        usercompid: activeReview.usercompid,
        grade: Number(grade),
        proficiency: Number(proficiency),
        note: note.trim()
      });

      addToast({
        type: 'success',
        title: 'Evaluación registrada',
        description: `Se evaluó exitosamente la competencia para ${activeReview.userfullname}.`
      });

      setActiveReview(null);
      refetch();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al evaluar',
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">
              Estudiantes con solicitudes de revisión o actividades completadas pendientes de dictamen.
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante, email o competencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background text-sm"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Cargando revisiones pendientes...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border bg-muted/20 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No hay revisiones pendientes</h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Todas las competencias asociadas a este ámbito se encuentran dictaminadas y al día.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {reviews.map((rev) => {
              const isSelected = activeReview?.usercompid === rev.usercompid;

              return (
                <div
                  key={rev.usercompid}
                  className={`rounded-xl border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs mt-0.5">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {rev.userfullname}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              ({rev.useremail})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            <div className="flex items-center gap-1 font-medium text-foreground">
                              <Award className="h-3.5 w-3.5 text-primary" />
                              <span>{rev.competencyname}</span>
                              {rev.competencyidnumber && (
                                <Badge variant="outline" className="text-[10px] font-mono py-0">
                                  {rev.competencyidnumber}
                                </Badge>
                              )}
                            </div>
                            <span>•</span>
                            <span className="text-[11px]">Marco: {rev.frameworkname}</span>
                          </div>

                          {rev.timemodified > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                              <Calendar className="h-3 w-3" />
                              <span>Solicitado: {formatDate(rev.timemodified)}</span>
                            </div>
                          )}

                          {rev.latestevidence && (
                            <div className="mt-2 text-xs bg-muted/40 p-2 rounded-lg border border-border/50 text-foreground/90 flex items-start gap-1.5">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                              <span className="line-clamp-2 italic">{rev.latestevidence}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end sm:self-center shrink-0">
                        {isSelected ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelReview}
                            className="text-xs"
                          >
                            Cancelar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStartReview(rev)}
                            className="text-xs gap-1.5 shadow-sm"
                          >
                            <Award className="h-3.5 w-3.5" />
                            Calificar y Dictaminar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Inline Evaluation Form */}
                    {isSelected && (
                      <form
                        onSubmit={handleSubmitEvaluation}
                        className="mt-4 pt-4 border-t border-border/60 space-y-3.5 animate-fadeIn"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Scale Rating Selector */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                              Calificación en la Escala ({rev.scalename}):
                            </label>
                            {rev.scaleoptions && rev.scaleoptions.length > 0 ? (
                              <select
                                value={grade}
                                onChange={(e) => setGrade(Number(e.target.value))}
                                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                              >
                                {rev.scaleoptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.name} ({opt.value})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={grade}
                                onChange={(e) => setGrade(Number(e.target.value))}
                                className="text-xs bg-background"
                              />
                            )}
                          </div>

                          {/* Proficiency Selector */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                              Dictamen de Competencia:
                            </label>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setProficiency(1)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                                  proficiency === 1
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                                    : 'border-border text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Competente
                              </button>
                              <button
                                type="button"
                                onClick={() => setProficiency(0)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                                  proficiency === 0
                                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400'
                                    : 'border-border text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Aún No Competente
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Note / Feedback */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">
                            Retroalimentación / Nota de Evidencia (Opcional):
                          </label>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Comentario sobre el desempeño del estudiante o justificación de la calificación..."
                            rows={2}
                            className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancelReview}
                            disabled={isSubmitting}
                            className="text-xs"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            variant="default"
                            size="sm"
                            disabled={isSubmitting}
                            className="text-xs gap-1.5 shadow-sm"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Guardar y Completar Revisión
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
