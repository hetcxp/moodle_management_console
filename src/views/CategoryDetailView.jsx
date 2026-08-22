import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/DataTable';
import { ChevronLeft, ChevronRight, FolderTree, BookOpen, Layers } from 'lucide-react';

export const CategoryDetailView = ({ categoryId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'subcategories'

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
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) return null;

  const coursesCols = [
    {
      header: 'Curso',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.fullname}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.shortname}</div>
          </div>
        </div>
      )
    }
  ];

  const subcategoriesCols = [
    {
      header: 'Subcategoría',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 font-bold">
            <FolderTree className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.coursecount} curso(s)</div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button 
              onClick={onBack} 
              className="flex items-center hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">{data.name}</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-700 dark:bg-purple-900/30 rounded-xl">
              <FolderTree className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.name}</h1>
              {data.description && (
                <div 
                  className="text-sm text-muted-foreground mt-1 max-w-2xl" 
                  dangerouslySetInnerHTML={{ __html: data.description }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/70">
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('courses')}
        >
          Cursos en esta Categoría ({data.courses.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'subcategories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('subcategories')}
        >
          Subcategorías ({data.subcategories.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <DataTable
            columns={coursesCols}
            data={data.courses}
            loading={loading}
            totalCount={data.courses.length}
            onRowClick={(row) => onNavigateToDetail('course', row.id)}
          />
        </div>
      )}

      {activeTab === 'subcategories' && (
        <div className="space-y-4">
          <DataTable
            columns={subcategoriesCols}
            data={data.subcategories}
            loading={loading}
            totalCount={data.subcategories.length}
            onRowClick={(row) => onNavigateToDetail('category', row.id)}
          />
        </div>
      )}
    </div>
  );
};
