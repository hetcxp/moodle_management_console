import { useState, useEffect } from 'react';
import {
  useCompetencyFrameworks,
  useCompetencyKpis,
  useCompetencyFrameworkAction,
  useScales
} from '../../hooks/useAdminerQueries';
import { AdminerApi } from '../../services/adminer-api';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useToast } from '../../components/ui/Toast';
import { exportToCsv } from '../../components/CsvExporter';
import { useAuth } from '../../context/AuthContext';

export function useCompetenciesState() {
  const { addToast } = useToast();
  const { permissions } = useAuth();

  const hasManageCompetencies = permissions?.is_siteadmin === 1 || permissions?.can_manage_competencies === 1;

  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [sort, setSort] = useState('shortname');
  const [dir, setDir] = useState('ASC');
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [filters, setFilters] = useState({});

  const activeFilters = { ...filters };
  if (visibilityFilter !== '-1') {
    activeFilters.visible = visibilityFilter;
  }

  const { data: frameworksData, isLoading, isFetching, refetch } = useCompetencyFrameworks({
    page,
    perpage: perPage,
    sort,
    dir,
    search,
    filters: activeFilters,
  });

  const { data: kpis } = useCompetencyKpis();
  const { data: scalesData } = useScales();
  const scales = scalesData?.scales || [];

  const frameworks = frameworksData?.frameworks || [];
  const totalCount = frameworksData?.totalcount || 0;
  const loading = isLoading || isFetching;

  const { mutateAsync: performFrameworkAction } = useCompetencyFrameworkAction();
  const { selectedIds, setSelectedIds, clearSelection } = useBulkSelection();

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFramework, setEditingFramework] = useState(null);
  const [formData, setFormData] = useState({
    shortname: '',
    idnumber: '',
    description: '',
    scaleid: 0,
    visible: 1,
  });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [frameworksToDelete, setFrameworksToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  // Preconfigurar escala por defecto cuando cargan las escalas
  useEffect(() => {
    if (!editingFramework && scales.length > 0 && formData.scaleid === 0) {
      const defaultScale = scales.find((s) => s.isdefault === 1) || scales[0];
      if (defaultScale) {
        setFormData((prev) => ({ ...prev, scaleid: defaultScale.id }));
      }
    }
  }, [scales, editingFramework, formData.scaleid]);

  const handleOpenCreate = () => {
    setEditingFramework(null);
    const defaultScale = scales.find((s) => s.isdefault === 1) || scales[0];
    setFormData({
      shortname: '',
      idnumber: '',
      description: '',
      scaleid: defaultScale ? defaultScale.id : 0,
      visible: 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (framework) => {
    setEditingFramework(framework);
    setFormData({
      shortname: framework.shortname,
      idnumber: framework.idnumber,
      description: framework.description,
      scaleid: framework.scaleid || (scales[0]?.id || 0),
      visible: framework.visible !== undefined ? framework.visible : 1,
    });
    setModalOpen(true);
  };

  const handleSaveFramework = async (e) => {
    e.preventDefault();
    if (!formData.shortname.trim()) {
      addToast({ type: 'error', title: 'Error', description: 'El nombre del marco es obligatorio.' });
      return;
    }
    setFormLoading(true);
    try {
      if (editingFramework) {
        await performFrameworkAction({
          action: 'edit',
          frameworkid: editingFramework.id,
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
          scaleid: Number(formData.scaleid),
          visible: formData.visible ? 1 : 0,
        });
        addToast({ type: 'success', title: 'Marco de competencias actualizado' });
      } else {
        await performFrameworkAction({
          action: 'create',
          shortname: formData.shortname,
          idnumber: formData.idnumber,
          description: formData.description,
          scaleid: Number(formData.scaleid),
          visible: formData.visible ? 1 : 0,
        });
        addToast({ type: 'success', title: 'Marco de competencias creado' });
      }
      setModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al guardar', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleVisibility = async (framework) => {
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

  const handleOpenDelete = (ids) => {
    setFrameworksToDelete(ids);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (frameworksToDelete.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of frameworksToDelete) {
        await performFrameworkAction({ action: 'delete', frameworkid: id });
      }
      addToast({ type: 'success', title: 'Marco(s) eliminado(s)' });
      setDeleteConfirmOpen(false);
      clearSelection();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      let exportData = frameworks;
      if (totalCount > frameworks.length) {
        const res = await AdminerApi.getCompetencyFrameworks({
          page: 0,
          perpage: 99999,
          sort,
          dir,
          search,
          filters: activeFilters,
        });
        if (res?.frameworks) {
          exportData = res.frameworks;
        }
      }

      const cols = [
        { label: 'ID', accessor: 'id' },
        { label: 'Nombre del Marco', accessor: 'shortname' },
        { label: 'Código / ID Number', accessor: 'idnumber' },
        { label: 'Escala de Evaluación', accessor: 'scalename' },
        { label: 'Competencias Nivel 1', accessor: 'competenciescount' },
        { label: 'Estado', accessor: (r) => (r.visible ? 'Visible' : 'Oculto') },
        { label: 'Descripción', accessor: 'description' },
      ];

      exportToCsv('marcos_competencias_moodle', exportData, cols);
      setExportModalOpen(false);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Export error', err);
      addToast({ title: 'Error', description: 'Error al exportar registros.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  return {
    frameworks, totalCount, kpis, scales, loading,
    page, setPage, perPage, setPerPage, sort, dir, setSort, setDir, setFilters,
    search, setSearch, visibilityFilter, setVisibilityFilter,
    selectedIds, setSelectedIds, clearSelection,
    hasManageCompetencies,
    modalOpen, setModalOpen, editingFramework, formData, setFormData, formLoading,
    deleteConfirmOpen, setDeleteConfirmOpen, frameworksToDelete, deleteLoading,
    exportModalOpen, setExportModalOpen, exportLoading,
    reviewsModalOpen, setReviewsModalOpen,
    handleOpenCreate, handleOpenEdit, handleSaveFramework,
    handleToggleVisibility, handleOpenDelete, handleDelete, handleExport,
    refetch,
  };
}
