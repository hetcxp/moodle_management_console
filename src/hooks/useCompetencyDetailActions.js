import { useState } from 'react';
import { useToast } from '../components/ui/Toast';
import {
  useCompetencyCourseAction,
  useModuleCompetencyAction
} from './useAdminerQueries';

export function useCompetencyDetailActions(compIdNum) {
  const { addToast } = useToast();
  const { mutateAsync: performCourseAction } = useCompetencyCourseAction();
  const { mutateAsync: performModuleAction } = useModuleCompetencyAction();

  const [expandedCourseIds, setExpandedCourseIds] = useState(new Set());
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedInitialRule, setSelectedInitialRule] = useState(3);
  const [activityModalCourse, setActivityModalCourse] = useState(null);
  const [unlinkCourseTarget, setUnlinkCourseTarget] = useState(null);
  const [unlinkActivityTarget, setUnlinkActivityTarget] = useState(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  const toggleExpandCourse = (courseId) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleLinkCourses = async (courseIds) => {
    if (!compIdNum || courseIds.length === 0) return;
    try {
      const res = await performCourseAction({
        action: 'add',
        competencyid: compIdNum,
        courseids: courseIds,
        ruleoutcome: selectedInitialRule
      });
      addToast({
        type: 'success',
        title: 'Cursos vinculados',
        description: res.message || `${courseIds.length} curso(s) vinculados a la competencia.`
      });
      setExpandedCourseIds((prev) => new Set([...prev, ...courseIds]));
      setSelectorOpen(false);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al vincular cursos',
        description: err.message
      });
    }
  };

  const handleUpdateCourseRule = async (courseId, newRule) => {
    try {
      await performCourseAction({
        action: 'update_rule',
        competencyid: compIdNum,
        courseids: [courseId],
        ruleoutcome: Number(newRule)
      });
      addToast({
        type: 'success',
        title: 'Regla del curso actualizada',
        description: 'La regla de finalización para el curso ha sido actualizada exitosamente.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al actualizar regla',
        description: err.message
      });
    }
  };

  const handleConfirmUnlinkCourse = async () => {
    if (!unlinkCourseTarget) return;
    setUnlinkLoading(true);
    try {
      await performCourseAction({
        action: 'remove',
        competencyid: compIdNum,
        courseids: [unlinkCourseTarget.id]
      });
      addToast({
        type: 'success',
        title: 'Curso desvinculado',
        description: `El curso "${unlinkCourseTarget.fullname}" fue desvinculado de la competencia.`
      });
      setUnlinkCourseTarget(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al desvincular curso',
        description: err.message
      });
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleUpdateModuleRule = async (cmid, newRule) => {
    try {
      await performModuleAction({
        action: 'update_rule',
        competencyid: compIdNum,
        cmid: Number(cmid),
        ruleoutcome: Number(newRule)
      });
      addToast({
        type: 'success',
        title: 'Regla de actividad actualizada',
        description: 'La regla de compleción de la actividad fue guardada.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al actualizar actividad',
        description: err.message
      });
    }
  };

  const handleConfirmUnlinkActivity = async () => {
    if (!unlinkActivityTarget) return;
    setUnlinkLoading(true);
    try {
      await performModuleAction({
        action: 'remove',
        competencyid: compIdNum,
        cmid: unlinkActivityTarget.cmid
      });
      addToast({
        type: 'success',
        title: 'Actividad desvinculada',
        description: `La actividad "${unlinkActivityTarget.name}" fue desvinculada de la competencia.`
      });
      setUnlinkActivityTarget(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al desvincular actividad',
        description: err.message
      });
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleOpenAddActivityModal = (course) => {
    setActivityModalCourse(course);
  };

  const handleAddActivity = async (cmid, ruleOutcome) => {
    try {
      await performModuleAction({
        action: 'add',
        competencyid: compIdNum,
        cmid,
        ruleoutcome: ruleOutcome
      });
      addToast({
        type: 'success',
        title: 'Actividad vinculada',
        description: 'La actividad clave fue vinculada exitosamente a la competencia.'
      });
      setActivityModalCourse(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al vincular actividad',
        description: err.message
      });
    }
  };

  return {
    expandedCourseIds,
    setExpandedCourseIds,
    toggleExpandCourse,
    selectorOpen,
    setSelectorOpen,
    selectedInitialRule,
    setSelectedInitialRule,
    activityModalCourse,
    setActivityModalCourse,
    unlinkCourseTarget,
    setUnlinkCourseTarget,
    unlinkActivityTarget,
    setUnlinkActivityTarget,
    unlinkLoading,
    reviewsModalOpen,
    setReviewsModalOpen,
    handleLinkCourses,
    handleUpdateCourseRule,
    handleConfirmUnlinkCourse,
    handleUpdateModuleRule,
    handleConfirmUnlinkActivity,
    handleOpenAddActivityModal,
    handleAddActivity
  };
}
