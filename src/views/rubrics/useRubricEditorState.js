import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '../../components/ui/Toast';
import { useHelp } from '../../context/HelpContext';
import { useRubricTemplates, useRubricTemplateAction } from '../../hooks/queries/useCompetencyQueries';

export const createDefaultCriterion = (index = 1) => ({
  id: `temp_c_${Date.now()}_${index}`,
  sortorder: index,
  description: `Criterio ${index}: Descripción de la competencia evaluada`,
  levels: [
    { id: `temp_l_1`, score: 0, definition: 'No evidencia el desempeño mínimo esperado.' },
    { id: `temp_l_2`, score: 5, definition: 'Demuestra dominio en desarrollo pero requiere acompañamiento.' },
    { id: `temp_l_3`, score: 10, definition: 'Alcanza satisfactoriamente el estándar de competencia requerido.' },
  ],
});

export const useRubricEditorState = ({ templateId = null, onBack } = {}) => {
  const [, setLocation] = useLocation();
  const { addToast } = useToast();
  const { helpData, toggle: toggleHelp } = useHelp();
  const isEditing = Boolean(templateId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState([createDefaultCriterion(1)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isInitialized, setIsInitialized] = useState(!isEditing);

  const { data: rubricsData, isLoading: isQueryLoading } = useRubricTemplates(
    { page: 0, perpage: 100 },
    { enabled: isEditing }
  );
  const isLoadingTemplate = isEditing && isQueryLoading;

  const { mutateAsync: performRubricAction } = useRubricTemplateAction();

  const existingTemplate = useMemo(() => {
    if (!isEditing || !rubricsData?.templates) return null;
    return rubricsData.templates.find((t) => String(t.id) === String(templateId)) || null;
  }, [isEditing, rubricsData?.templates, templateId]);

  const templateNotFound = isEditing && !isLoadingTemplate && !existingTemplate;

  useEffect(() => {
    if (isEditing && existingTemplate && !isInitialized) {
      setName(existingTemplate.name || '');
      const rawDesc = existingTemplate.description || '';
      setDescription(rawDesc.replace(/<[^>]*>?/gm, '').trim());

      if (Array.isArray(existingTemplate.criteria) && existingTemplate.criteria.length > 0) {
        setCriteria(
          existingTemplate.criteria.map((c, cIdx) => ({
            id: c.id || `crit_${cIdx + 1}`,
            sortorder: c.sortorder ?? cIdx + 1,
            description: (c.description || '').replace(/<[^>]*>?/gm, '').trim(),
            levels: Array.isArray(c.levels) && c.levels.length > 0
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
      setIsInitialized(true);
    }
  }, [isEditing, existingTemplate, isInitialized]);

  const totalMaxScore = useMemo(() => {
    return criteria.reduce((sum, crit) => {
      const maxLevel = crit.levels.reduce((m, l) => Math.max(m, Number(l.score) || 0), 0);
      return sum + maxLevel;
    }, 0);
  }, [criteria]);

  const handleAddCriterion = () => {
    setError('');
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

  const handleDuplicateCriterion = (critIdx) => {
    setError('');
    setCriteria((prev) => {
      const source = prev[critIdx];
      const duplicated = {
        ...source,
        id: `temp_c_${Date.now()}_dup`,
        sortorder: prev.length + 1,
        description: `${source.description} (Copia)`,
        levels: source.levels.map((l, lIdx) => ({
          ...l,
          id: `temp_l_${Date.now()}_${lIdx}`,
        })),
      };
      const next = [...prev];
      next.splice(critIdx + 1, 0, duplicated);
      return next;
    });
  };

  const handleMoveCriterion = (critIdx, direction) => {
    const targetIdx = critIdx + direction;
    if (targetIdx < 0 || targetIdx >= criteria.length) return;
    setCriteria((prev) => {
      const next = [...prev];
      const temp = next[critIdx];
      next[critIdx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleCriterionDescChange = (critIdx, val) => {
    setCriteria((prev) => {
      const next = [...prev];
      next[critIdx] = { ...next[critIdx], description: val };
      return next;
    });
  };

  const handleAddLevel = (critIdx) => {
    setError('');
    setCriteria((prev) => {
      const next = [...prev];
      const levels = next[critIdx].levels;
      const lastScore = levels.length > 0 ? Number(levels[levels.length - 1].score) || 0 : 0;
      next[critIdx] = {
        ...next[critIdx],
        levels: [
          ...levels,
          {
            id: `temp_l_${Date.now()}`,
            score: lastScore + 5,
            definition: 'Nivel adicional de desempeño.',
          },
        ],
      };
      return next;
    });
  };

  const handleRemoveLevel = (critIdx, lvlIdx) => {
    setError('');
    setCriteria((prev) => {
      const next = [...prev];
      if (next[critIdx].levels.length <= 2) {
        setError('Cada criterio debe contener al menos 2 niveles de desempeño.');
        return prev;
      }
      next[critIdx] = {
        ...next[critIdx],
        levels: next[critIdx].levels.filter((_, idx) => idx !== lvlIdx),
      };
      return next;
    });
  };

  const handleLevelChange = (critIdx, lvlIdx, field, val) => {
    setCriteria((prev) => {
      const next = [...prev];
      const levels = [...next[critIdx].levels];
      levels[lvlIdx] = { ...levels[lvlIdx], [field]: field === 'score' ? Number(val) : val };
      next[critIdx] = { ...next[critIdx], levels };
      return next;
    });
  };

  const handleCancel = () => {
    if (onBack) {
      onBack();
    } else if (isEditing) {
      setLocation(`/competencies/rubrics/${templateId}`);
    } else {
      setLocation('/competencies/rubrics');
    }
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (!name.trim()) {
      setError('El nombre de la plantilla de rúbrica es obligatorio.');
      return;
    }

    if (criteria.length === 0) {
      setError('Debes incluir al menos un criterio de evaluación.');
      return;
    }

    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].description.trim()) {
        setError(`El criterio #${i + 1} no puede tener la descripción vacía.`);
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
      if (isEditing) {
        await performRubricAction({
          action: 'update',
          templateid: templateId,
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

        addToast({
          title: 'Plantilla actualizada',
          description: `La rúbrica "${name.trim()}" fue actualizada exitosamente.`,
          type: 'success',
        });

        if (onBack) {
          onBack();
        } else {
          setLocation(`/competencies/rubrics/${templateId}`);
        }
      } else {
        await performRubricAction({
          action: 'create',
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

        addToast({
          title: 'Rúbrica creada',
          description: `La plantilla "${name.trim()}" se guardó exitosamente en el banco compartido.`,
          type: 'success',
        });

        if (onBack) {
          onBack();
        } else {
          setLocation('/competencies/rubrics');
        }
      }
    } catch (err) {
      setError(err?.message || 'Error al guardar la plantilla de rúbrica.');
    } finally {
      setSaving(false);
    }
  };

  return {
    isEditing,
    isLoadingTemplate,
    templateNotFound,
    name,
    setName,
    description,
    setDescription,
    criteria,
    totalMaxScore,
    saving,
    error,
    handleAddCriterion,
    handleRemoveCriterion,
    handleDuplicateCriterion,
    handleMoveCriterion,
    handleCriterionDescChange,
    handleAddLevel,
    handleRemoveLevel,
    handleLevelChange,
    handleSave,
    handleCancel,
    helpData,
    toggleHelp,
  };
};
