import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { useCompetencyAction } from '../../hooks/useAdminerQueries';
import { PermissionGate } from '../../components/PermissionGate';
import {
  Layers,
  Plus,
  Search,
  BookOpen,
  ChevronRight,
  Edit,
  Trash2,
  Inbox,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { COMPETENCY_RULE_ALL_CHILDREN } from './competencyConstants';

export const CompetencySubcompetenciesTab = ({
  parentCompetency,
  subcompetencies = [],
  frameworkId,
  hasManagePermission,
  onNavigateToDetail,
  onRefetchParent,
  isCreateModalOpen,
  onCloseCreateModal
}) => {
  const { addToast } = useToast();
  const { mutateAsync: performCompetencyAction } = useCompetencyAction();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubcomp, setEditingSubcomp] = useState(null);
  const [formData, setFormData] = useState({
    shortname: '',
    idnumber: '',
    description: '',
    ruletype: '',
    ruleoutcome: 1
  });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subcompToDelete, setSubcompToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync external modal trigger if provided
  React.useEffect(() => {
    if (isCreateModalOpen) {
      handleOpenCreate();
    }
  }, [isCreateModalOpen]);

  const filteredSubcompetencies = useMemo(() => {
    if (!search.trim()) return subcompetencies;
    const term = search.toLowerCase();
    return subcompetencies.filter(
      (s) =>
        s.shortname?.toLowerCase().includes(term) ||
        s.idnumber?.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
    );
  }, [subcompetencies, search]);

  const handleOpenCreate = () => {
    setEditingSubcomp(null);
    setFormData({
      shortname: '',
      idnumber: '',
      description: '',
      ruletype: '',
      ruleoutcome: 1
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const handleOpenEdit = (subcomp, e) => {
    e?.stopPropagation();
    setEditingSubcomp(subcomp);
    setFormData({
      shortname: subcomp.shortname || '',
      idnumber: subcomp.idnumber || '',
      description: subcomp.description || '',
      ruletype: subcomp.ruletype || '',
      ruleoutcome: subcomp.ruleoutcome || 1
    });
    setModalOpen(true);
  };

  const handleSaveSubcompetency = async (e) => {
    e.preventDefault();
    if (!formData.shortname.trim()) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'El nombre de la subcompetencia es obligatorio.'
      });
      return;
    }

    setFormLoading(true);
    try {
      if (editingSubcomp) {
        await performCompetencyAction({
          action: 'edit',
          competencyid: editingSubcomp.id,
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
          ruletype: formData.ruletype,
          ruleoutcome: formData.ruleoutcome
        });
        addToast({ type: 'success', title: 'Subcompetencia actualizada' });
      } else {
        await performCompetencyAction({
          action: 'create',
          frameworkid: Number(frameworkId || parentCompetency?.competencyframeworkid),
          parentid: Number(parentCompetency.id),
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
          ruletype: formData.ruletype,
          ruleoutcome: formData.ruleoutcome
        });
        addToast({ type: 'success', title: 'Subcompetencia creada exitosamente' });
      }
      handleCloseModal();
      if (onRefetchParent) onRefetchParent();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al guardar',
        description: err.message || 'No se pudo guardar la subcompetencia.'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDelete = (subcomp, e) => {
    e?.stopPropagation();
    setSubcompToDelete(subcomp);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteSubcompetency = async () => {
    if (!subcompToDelete) return;
    setDeleteLoading(true);
    try {
      await performCompetencyAction({
        action: 'delete',
        competencyid: subcompToDelete.id
      });
      addToast({ type: 'success', title: 'Subcompetencia eliminada' });
      setDeleteConfirmOpen(false);
      setSubcompToDelete(null);
      if (onRefetchParent) onRefetchParent();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al eliminar',
        description: err.message || 'No se pudo eliminar la subcompetencia.'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleNavigateSubcomp = (subcomp) => {
    if (onNavigateToDetail) {
      onNavigateToDetail('competency', {
        frameworkId: frameworkId || parentCompetency?.competencyframeworkid,
        competencyId: subcomp.id
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar subcompetencias..."
            className="pl-9 bg-background h-9 text-sm"
          />
        </div>

        <PermissionGate capability="can_manage_competencies">
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="w-full sm:w-auto gap-1.5 shrink-0 bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nueva Subcompetencia
          </Button>
        </PermissionGate>
      </div>

      {/* Subcompetencies Grid / List */}
      {filteredSubcompetencies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-dashed border-border text-center">
          <div className="p-3 bg-muted rounded-full text-muted-foreground mb-3">
            <Inbox className="h-7 w-7" />
          </div>
          <p className="text-base font-medium text-foreground">
            {search ? 'No se encontraron subcompetencias coincidentes' : 'No hay subcompetencias registradas'}
          </p>
          <p className="text-sm text-muted-foreground max-w-md mt-1 mb-4">
            {search
              ? 'Prueba con otro término de búsqueda.'
              : 'Agrega subcompetencias para estructurar el aprendizaje jerárquico y activar reglas de completado automático.'}
          </p>
          {!search && (
            <PermissionGate capability="can_manage_competencies">
              <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Crear primera subcompetencia
              </Button>
            </PermissionGate>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredSubcompetencies.map((subcomp) => {
            const hasChildren = (subcomp.childrencount || 0) > 0;
            const hasRule = subcomp.ruletype === COMPETENCY_RULE_ALL_CHILDREN;

            return (
              <div
                key={subcomp.id}
                onClick={() => handleNavigateSubcomp(subcomp)}
                className="group relative bg-card hover:bg-muted/30 border border-border/80 hover:border-primary/40 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5 sm:mt-0">
                      <Layers className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                          {subcomp.shortname}
                        </h4>
                        {subcomp.idnumber && (
                          <Badge variant="outline" className="text-[11px] font-mono py-0 px-1.5 bg-muted/60 text-muted-foreground border-border">
                            {subcomp.idnumber}
                          </Badge>
                        )}
                        {hasRule && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            Auto-completar
                          </Badge>
                        )}
                      </div>

                      {subcomp.description && (
                        <p
                          className="text-xs text-muted-foreground line-clamp-1 mt-1 font-normal"
                          dangerouslySetInnerHTML={{
                            __html: subcomp.description.replace(/<[^>]*>?/gm, '')
                          }}
                        />
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-primary" />
                          <span>{subcomp.coursescount || 0} cursos</span>
                        </span>
                        {subcomp.timemodified > 0 && (
                          <span>Modificado: {formatDate(subcomp.timemodified)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <PermissionGate capability="can_manage_competencies">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleOpenEdit(subcomp, e)}
                        title="Editar subcompetencia"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleOpenDelete(subcomp, e)}
                        title="Eliminar subcompetencia"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-primary group-hover:translate-x-0.5 transition-transform gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateSubcomp(subcomp);
                      }}
                    >
                      <span>Ver detalle</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Subcompetencia */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingSubcomp ? 'Editar Subcompetencia' : 'Nueva Subcompetencia'}
      >
        <form onSubmit={handleSaveSubcompetency} className="space-y-4">
          <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <span>
              Competencia padre: <span className="font-semibold text-foreground">{parentCompetency?.shortname}</span>
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Nombre de la Subcompetencia <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.shortname}
              onChange={(e) => setFormData({ ...formData, shortname: e.target.value })}
              placeholder="Ej. Dominio de funciones asíncronas"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Código / ID Number (Opcional)
            </label>
            <Input
              value={formData.idnumber}
              onChange={(e) => setFormData({ ...formData, idnumber: e.target.value })}
              placeholder="Ej. JS-ASYNC-01"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Descripción (Opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Descripción de los objetivos y criterios de evaluación de esta subcompetencia..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading
                ? 'Guardando...'
                : editingSubcomp
                ? 'Actualizar Subcompetencia'
                : 'Crear Subcompetencia'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal Confirmar Eliminación */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar Subcompetencia"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">¿Confirmas la eliminación de esta subcompetencia?</p>
              <p className="text-xs text-destructive/90 mt-1">
                Competencia: <span className="font-bold">{subcompToDelete?.shortname}</span>
              </p>
              <p className="text-xs text-destructive/80 mt-1">
                Esta acción eliminará la subcompetencia y cualquier vinculación asociada de cursos o evidencias en Moodle.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubcompetency}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Eliminando...' : 'Confirmar Eliminación'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
