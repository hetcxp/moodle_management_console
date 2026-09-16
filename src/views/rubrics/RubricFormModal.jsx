import React, { useState, useMemo, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Trash2, Layers, Award } from 'lucide-react';

const createDefaultCriterion = (index = 1) => ({
  id: `temp_c_${Date.now()}_${index}`,
  sortorder: index,
  description: `Criterio ${index}: Descripción de la competencia evaluada`,
  levels: [
    { id: `temp_l_1`, score: 0, definition: 'No evidencia el desempeño mínimo esperado.' },
    { id: `temp_l_2`, score: 5, definition: 'Demuestra dominio en desarrollo pero requiere acompañamiento.' },
    { id: `temp_l_3`, score: 10, definition: 'Alcanza satisfactoriamente el estándar de competencia requerido.' },
  ],
});

export const RubricFormModal = ({
  open,
  onClose,
  onSave,
  initialData = null,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState([createDefaultCriterion(1)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Total max score calculated in real-time
  const totalMaxScore = useMemo(() => {
    return criteria.reduce((sum, crit) => {
      const maxLevel = crit.levels.reduce((m, l) => Math.max(m, Number(l.score) || 0), 0);
      return sum + maxLevel;
    }, 0);
  }, [criteria]);

  const handleReset = () => {
    setName('');
    setDescription('');
    setCriteria([createDefaultCriterion(1)]);
    setError('');
    setSaving(false);
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name || '');
        const rawDesc = initialData.description || '';
        setDescription(rawDesc.replace(/<[^>]*>?/gm, '').trim());
        if (Array.isArray(initialData.criteria) && initialData.criteria.length > 0) {
          setCriteria(
            initialData.criteria.map((c, cIdx) => ({
              id: c.id || `crit_${cIdx + 1}`,
              sortorder: c.sortorder ?? cIdx + 1,
              description: (c.description || '').replace(/<[^>]*>?/gm, '').trim(),
              levels: (c.levels && c.levels.length > 0)
                ? c.levels.map((l, lIdx) => ({
                    id: l.id || `lvl_${lIdx + 1}`,
                    score: Number(l.score) || 0,
                    definition: (l.definition || '').replace(/<[^>]*>?/gm, '').trim(),
                  }))
                : [
                    { id: `temp_l_1`, score: 0, definition: 'No cumple' },
                    { id: `temp_l_2`, score: 10, definition: 'Cumple' },
                  ],
            }))
          );
        } else {
          setCriteria([createDefaultCriterion(1)]);
        }
      } else {
        handleReset();
      }
      setError('');
      setSaving(false);
    }
  }, [open, initialData]);

  const handleAddCriterion = () => {
    setCriteria((prev) => [...prev, createDefaultCriterion(prev.length + 1)]);
  };

  const handleRemoveCriterion = (critIdx) => {
    if (criteria.length <= 1) {
      setError('La rúbrica debe contener al menos un criterio de evaluación.');
      return;
    }
    setError('');
    setCriteria((prev) => prev.filter((_, idx) => idx !== critIdx));
  };

  const handleCriterionDescChange = (critIdx, val) => {
    setCriteria((prev) => {
      const copy = [...prev];
      copy[critIdx] = { ...copy[critIdx], description: val };
      return copy;
    });
  };

  const handleAddLevel = (critIdx) => {
    setCriteria((prev) => {
      const copy = [...prev];
      const levels = copy[critIdx].levels;
      const lastScore = levels.length > 0 ? Number(levels[levels.length - 1].score) || 0 : 0;
      copy[critIdx] = {
        ...copy[critIdx],
        levels: [
          ...levels,
          {
            id: `temp_l_${Date.now()}`,
            score: lastScore + 5,
            definition: 'Nivel adicional de desempeño.',
          },
        ],
      };
      return copy;
    });
  };

  const handleRemoveLevel = (critIdx, lvlIdx) => {
    setCriteria((prev) => {
      const copy = [...prev];
      if (copy[critIdx].levels.length <= 1) {
        return copy;
      }
      copy[critIdx] = {
        ...copy[critIdx],
        levels: copy[critIdx].levels.filter((_, idx) => idx !== lvlIdx),
      };
      return copy;
    });
  };

  const handleLevelChange = (critIdx, lvlIdx, field, val) => {
    setCriteria((prev) => {
      const copy = [...prev];
      const levels = [...copy[critIdx].levels];
      levels[lvlIdx] = { ...levels[lvlIdx], [field]: field === 'score' ? Number(val) : val };
      copy[critIdx] = { ...copy[critIdx], levels };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la plantilla de rúbrica es obligatorio.');
      return;
    }

    if (criteria.length === 0) {
      setError('Debes incluir al menos un criterio.');
      return;
    }

    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].description.trim()) {
        setError(`El criterio #${i + 1} no puede estar vacío.`);
        return;
      }
      if (criteria[i].levels.length < 2) {
        setError(`El criterio #${i + 1} debe contener al menos 2 niveles de desempeño.`);
        return;
      }
    }

    setError('');
    setSaving(true);
    try {
      await onSave({
        id: initialData?.id,
        name: name.trim(),
        description: description.trim(),
        criteria: criteria.map((c, idx) => ({
          id: c.id,
          sortorder: idx + 1,
          description: c.description.trim(),
          levels: c.levels.map((l) => ({
            id: l.id,
            score: Number(l.score) || 0,
            definition: l.definition.trim(),
          })),
        })),
      });
      handleReset();
    } catch (err) {
      setError(err?.message || 'Error al guardar la rúbrica.');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(initialData);

  return (
    <Dialog
      open={open}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title={isEditing ? 'Editar Plantilla de Rúbrica' : 'Nueva Plantilla de Rúbrica'}
      description={
        isEditing
          ? 'Modifica los criterios, niveles y ponderaciones de la matriz analítica existente.'
          : 'Diseña una matriz analítica de evaluación con criterios y niveles ponderados.'
      }
      className="max-w-4xl"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Plantilla'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        {/* General Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre de la Rúbrica *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Rúbrica Analítica: Resolución de Problemas Complejos"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Puntaje Máximo Calculado</label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-muted/50 border border-border">
              <Award className="h-4 w-4 text-amber-600" />
              <span className="font-black text-sm text-foreground">{totalMaxScore} puntos</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Descripción o Propósito Pedagógico</label>
          <textarea
            className="flex min-h-[70px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instrucciones para los evaluadores o contexto de aplicación..."
          />
        </div>

        {/* Criteria & Levels Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                Criterios de Evaluación ({criteria.length})
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCriterion}
              className="gap-1.5 h-8 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir Criterio</span>
            </Button>
          </div>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {criteria.map((crit, cIdx) => (
              <div
                key={crit.id}
                className="p-4 rounded-xl border border-border/80 bg-card/40 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">
                      Criterio #{cIdx + 1}
                    </label>
                    <Input
                      value={crit.description}
                      onChange={(e) => handleCriterionDescChange(cIdx, e.target.value)}
                      placeholder="Ej. Dominio conceptual y rigor metodológico"
                      className="text-xs font-medium"
                    />
                  </div>
                  {criteria.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCriterion(cIdx)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-5"
                      title="Eliminar este criterio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Levels */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                    <span>Niveles de Desempeño</span>
                    <button
                      type="button"
                      onClick={() => handleAddLevel(cIdx)}
                      className="text-primary hover:underline flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Plus className="h-3 w-3" /> Añadir Nivel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {crit.levels.map((lvl, lIdx) => (
                      <div
                        key={lvl.id || lIdx}
                        className="p-2.5 rounded-lg border border-border bg-background space-y-2 relative group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            Nivel {lIdx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] text-muted-foreground">Pts:</label>
                            <input
                              type="number"
                              step="any"
                              value={lvl.score}
                              onChange={(e) => handleLevelChange(cIdx, lIdx, 'score', e.target.value)}
                              className="w-14 h-6 px-1.5 text-xs text-right font-bold rounded border border-input bg-muted/40 text-foreground"
                            />
                            {crit.levels.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLevel(cIdx, lIdx)}
                                className="text-muted-foreground hover:text-destructive p-0.5 ml-1"
                                title="Eliminar nivel"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          value={lvl.definition}
                          onChange={(e) => handleLevelChange(cIdx, lIdx, 'definition', e.target.value)}
                          placeholder="Descripción cualitativa del nivel..."
                          className="w-full text-[11px] p-1.5 rounded border border-input bg-card text-foreground resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
};
