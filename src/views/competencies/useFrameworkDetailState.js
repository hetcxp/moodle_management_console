import { useState } from 'react';
import {
  useCompetencyFrameworkDetail,
  useCompetencyAction,
  useCompetencyFrameworkAction,
} from '../../hooks/useAdminerQueries';
import { useToast } from '../../components/ui/Toast';
import { exportToCsv } from '../../components/CsvExporter';
import { useAuth } from '../../context/AuthContext';

export function useFrameworkDetailState({ frameworkId, onNavigateToDetail }) {
  const { addToast } = useToast();
  const { permissions } = useAuth();

  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('shortname');
  const [dir, setDir] = useState('ASC');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(100);

  const { data: framework, isLoading, isFetching, refetch } = useCompetencyFrameworkDetail(frameworkId, search);

  const { mutateAsync: performCompetencyAction } = useCompetencyAction();
  const { mutateAsync: performFrameworkAction } = useCompetencyFrameworkAction();

  const competencies = framework?.competencies || [];
  const totalCount = competencies.length;
  const loading = isLoading || isFetching;

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [formData, setFormData] = useState({ shortname: '', idnumber: '', description: '', parentid: 0 });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [competencyToDelete, setCompetencyToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [coursesModalOpen, setCoursesModalOpen] = useState(false);
  const [selectedCompetencyForCourses, setSelectedCompetencyForCourses] = useState(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [selectedCompetencyForReviews, setSelectedCompetencyForReviews] = useState(null);

  const handleOpenReviewsForCompetency = (comp) => {
    setSelectedCompetencyForReviews(comp);
    setReviewsModalOpen(true);
  };

  const handleOpenFrameworkReviews = () => {
    setSelectedCompetencyForReviews(null);
    setReviewsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingCompetency(null);
    setFormData({ shortname: '', idnumber: '', description: '', parentid: 0 });
    setModalOpen(true);
  };

  const handleOpenCreateSubcomp = (parentComp) => {
    setEditingCompetency(null);
    setFormData({ shortname: '', idnumber: '', description: '', parentid: parentComp.id });
    setModalOpen(true);
  };

  const handleOpenEdit = (comp) => {
    setEditingCompetency(comp);
    setFormData({
      shortname: comp.shortname,
      idnumber: comp.idnumber,
      description: comp.description,
      parentid: comp.parentid || 0,
    });
    setModalOpen(true);
  };

  const handleSaveCompetency = async (e) => {
    e.preventDefault();
    if (!formData.shortname.trim()) {
      addToast({ type: 'error', title: 'Error', description: 'El nombre de la competencia es obligatorio.' });
      return;
    }
    setFormLoading(true);
    try {
      if (editingCompetency) {
        await performCompetencyAction({
          action: 'edit',
          competencyid: editingCompetency.id,
          parentid: Number(formData.parentid || 0),
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
        });
        addToast({ type: 'success', title: 'Competencia actualizada' });
      } else {
        await performCompetencyAction({
          action: 'create',
          frameworkid: Number(frameworkId),
          parentid: Number(formData.parentid || 0),
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
        });
        addToast({
          type: 'success',
          title: formData.parentid > 0 ? 'Subcompetencia creada' : 'Competencia creada'
        });
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al guardar', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDelete = (comp) => {
    setCompetencyToDelete(comp);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteCompetency = async () => {
    if (!competencyToDelete) return;
    setDeleteLoading(true);
    try {
      await performCompetencyAction({
        action: 'delete',
        competencyid: competencyToDelete.id,
      });
      addToast({ type: 'success', title: 'Competencia eliminada' });
      setDeleteConfirmOpen(false);
      setCompetencyToDelete(null);
      refetch();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!framework) return;
    try {
      await performFrameworkAction({
        action: 'toggle_visibility',
        frameworkid: framework.id,
      });
      addToast({
        type: 'success',
        title: 'Visibilidad actualizada',
        description: `El marco ahora está ${framework.visible ? 'oculto' : 'visible'}.`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleExport = () => {
    const filename = `competencias_marco_${frameworkId}_${new Date().toISOString().split('T')[0]}`;
    const headers = [
      { key: 'id', label: 'ID' },
      { key: 'shortname', label: 'Competencia' },
      { key: 'idnumber', label: 'Código ID' },
      { key: 'parentname', label: 'Competencia Padre' },
      { key: 'coursescount', label: 'Cursos Vinculados' },
      { key: 'childrencount', label: 'Subcompetencias' },
      { key: 'pendingreviewscount', label: 'Revisiones Pendientes' },
      { key: 'description', label: 'Descripción' },
    ];
    exportToCsv(competencies, headers, filename);
    setExportModalOpen(false);
    addToast({ type: 'success', title: 'Exportación completada', description: `Se exportaron ${competencies.length} competencias.` });
  };

  const handleOpenCompetencyDetail = (comp) => {
    if (onNavigateToDetail) {
      onNavigateToDetail('competency', {
        frameworkId: Number(frameworkId),
        competencyId: comp.id,
      });
    }
  };

  return {
    framework, competencies, totalCount, loading,
    search, setSearch, sort, setSort, dir, setDir, page, setPage, perPage, setPerPage,
    hasManageCompetencies,
    modalOpen, setModalOpen, editingCompetency, formData, setFormData, formLoading,
    deleteConfirmOpen, setDeleteConfirmOpen, competencyToDelete, deleteLoading,
    exportModalOpen, setExportModalOpen, coursesModalOpen, setCoursesModalOpen,
    selectedCompetencyForCourses, setSelectedCompetencyForCourses,
    reviewsModalOpen, setReviewsModalOpen, selectedCompetencyForReviews, setSelectedCompetencyForReviews,
    handleOpenReviewsForCompetency, handleOpenFrameworkReviews,
    handleOpenCreate, handleOpenCreateSubcomp, handleOpenEdit,
    handleSaveCompetency, handleOpenDelete, handleDeleteCompetency,
    handleToggleVisibility, handleExport, handleOpenCompetencyDetail,
    refetch,
  };
}
