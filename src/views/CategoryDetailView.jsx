import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { CourseCreateModal } from './courses/CourseCreateModal';
import { SelectorModal } from '../components/ui/SelectorModal';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, FolderTree, CheckCircle, EyeOff } from 'lucide-react';
import { CategoryCoursesTab } from './categories/CategoryCoursesTab';
import { CategorySubcatsTab } from './categories/CategorySubcatsTab';

export const CategoryDetailView = ({ categoryId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  
  const hasManageCategory = permissions?.is_siteadmin === 1 || permissions?.can_manage_categories === 1;
  const hasUpdateCourse = permissions?.is_siteadmin === 1 || permissions?.can_update_courses === 1;
  const hasCreateCourse = permissions?.is_siteadmin === 1 || permissions?.can_create_courses === 1;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'subcategories'

  // Move courses modal
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState('');
  const [coursesToMove, setCoursesToMove] = useState([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [flatCategories, setFlatCategories] = useState([]);

  // Create / Bring courses
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [bringCourseModalOpen, setBringCourseModalOpen] = useState(false);

  const handleBringCourses = async (selectedIds) => {
    try {
      await AdminerApi.courseAction({
        action: 'move',
        courseids: selectedIds,
        categoryid: parseInt(categoryId, 10)
      });
      addToast({ type: 'success', title: 'Cursos vinculados exitosamente' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const loadFlatCategories = async () => {
    try {
      const res = await AdminerApi.getCategoriesFlat();
      setFlatCategories(res.categories || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCategoryDetail(categoryId);
      setData(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando categoría', description: err.message });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [categoryId, addToast, onBack]);

  useEffect(() => {
    loadData();
    loadFlatCategories();
    setActiveTab('courses');
  }, [loadData]);

  const handleBulkCourseAction = async (action, ids) => {
    try {
      await AdminerApi.courseAction({ action, courseids: ids.map(Number) });
      addToast({ type: 'success', title: `Cursos ${action === 'hide' ? 'ocultados' : 'visibles'}` });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleBulkSubcategoryAction = async (action, ids) => {
    try {
      await AdminerApi.categoryAction({ action, categoryids: ids.map(Number) });
      addToast({ type: 'success', title: `Subcategorías ${action === 'hide' ? 'ocultadas' : action === 'delete' ? 'eliminadas' : 'visibles'}` });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const handleOpenMoveModal = (ids) => {
    setCoursesToMove(ids);
    setTargetCategory('');
    setMoveModalOpen(true);
  };

  const handleExecuteMove = async () => {
    if (!targetCategory) return;
    setMoveLoading(true);
    try {
      await AdminerApi.courseAction({
        action: 'move',
        courseids: coursesToMove,
        categoryid: parseInt(targetCategory, 10)
      });
      addToast({ type: 'success', title: 'Cursos movidos correctamente' });
      setMoveModalOpen(false);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al mover cursos', description: err.message });
    } finally {
      setMoveLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) return null;

  // KPIs calculations
  const totalCourses = data.courses?.length || 0;
  const visibleCourses = data.courses?.filter(c => c.visible === 1).length || 0;
  const hiddenCourses = data.courses?.filter(c => c.visible === 0).length || 0;
  const totalSubcats = data.subcategories?.length || 0;

  const handleToggleCategoryVisibility = async (id, isVisible) => {
    try {
      await AdminerApi.categoryAction({ 
        action: isVisible ? 'hide' : 'show', 
        categoryids: [Number(id)] 
      });
      addToast({ type: 'success', title: isVisible ? 'Categoría ocultada' : 'Categoría visible' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button onClick={onBack} className="flex items-center hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">{data.name}</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-sm">
              <FolderTree className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.name}</h1>
              {data.description && (
                <div className="text-sm text-muted-foreground mt-1 max-w-2xl" dangerouslySetInnerHTML={{ __html: data.description }} />
              )}
            </div>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="flex gap-4">
           <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col items-center min-w-[120px] shadow-sm">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cursos</span>
             <span className="text-2xl font-black text-foreground">{totalCourses}</span>
             <div className="flex gap-2 text-[10px] mt-1 font-medium">
                <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle className="h-3 w-3"/> {visibleCourses}</span>
                <span className="text-amber-600 flex items-center gap-0.5"><EyeOff className="h-3 w-3"/> {hiddenCourses}</span>
             </div>
           </div>
           <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col items-center min-w-[120px] shadow-sm">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subcategorías</span>
             <span className="text-2xl font-black text-foreground">{totalSubcats}</span>
             <span className="text-[10px] mt-1 text-muted-foreground font-medium">Anidadas</span>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/70">
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('courses')}
        >
          Cursos en esta Categoría ({filteredCourses.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'subcategories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('subcategories')}
        >
          Subcategorías ({totalSubcats})
        </button>
      </div>

      {/* Tab Content: Courses */}
      {activeTab === 'courses' && (
        <CategoryCoursesTab
          courses={data.courses}
          loading={loading}
          hasCreateCourse={hasCreateCourse}
          hasUpdateCourse={hasUpdateCourse}
          loadData={loadData}
          handleBulkCourseAction={handleBulkCourseAction}
          handleOpenMoveModal={handleOpenMoveModal}
          onNavigateToDetail={onNavigateToDetail}
          setCreateCourseModalOpen={setCreateCourseModalOpen}
          setBringCourseModalOpen={setBringCourseModalOpen}
        />
      )}

      {/* Tab Content: Subcategories */}
      {activeTab === 'subcategories' && (
        <CategorySubcatsTab
          subcategories={data.subcategories}
          categoryId={categoryId}
          loading={loading}
          hasManageCategory={hasManageCategory}
          loadData={loadData}
          handleBulkSubcategoryAction={handleBulkSubcategoryAction}
          handleToggleCategoryVisibility={handleToggleCategoryVisibility}
          onNavigateToDetail={onNavigateToDetail}
        />
      )}

    </div>
  );
};
