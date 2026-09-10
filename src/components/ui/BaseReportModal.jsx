import React from 'react';
import { ReportSelectorModal } from './ReportSelectorModal';
import { useReportExport } from '../../hooks/useReportExport';

/**
 * BaseReportModal - Componente genérico para modales de reportes
 * @param {Object} props
 * @param {boolean} props.open - Estado de apertura
 * @param {function} props.onClose - Función para cerrar
 * @param {string} props.title - Título del modal
 * @param {string} props.description - Descripción
 * @param {string} props.search - Valor de búsqueda
 * @param {function} props.setSearch - Setter de búsqueda
 * @param {number} props.page - Página actual
 * @param {function} props.setPage - Setter de página
 * @param {number} props.totalPages - Total de páginas
 * @param {boolean} props.loading - Estado de carga de la lista
 * @param {Array} props.data - Lista de datos a mostrar
 * @param {string} props.emptyTitle - Título cuando no hay datos
 * @param {string} props.emptyMessage - Mensaje cuando no hay datos
 * @param {React.ReactNode} props.extraFilters - Filtros adicionales
 * @param {function} props.renderItem - Función para renderizar cada item
 * @param {function} props.fetchDetail - Función que retorna la promesa con el detalle de un ID
 * @param {function} props.processDetail - Función que recibe (detail, csvRows) y empuja filas
 * @param {Array} props.columns - Columnas para el CSV [{label, accessor}]
 * @param {string} props.filename - Nombre del archivo CSV a exportar
 * @param {number} [props.chunkSize=5] - Tamaño de los lotes de peticiones
 */
export const BaseReportModal = ({
  open,
  onClose,
  title,
  description,
  search,
  setSearch,
  page,
  setPage,
  totalPages,
  loading,
  data,
  emptyTitle,
  emptyMessage,
  extraFilters,
  renderItem,
  fetchDetail,
  processDetail,
  columns,
  filename,
  chunkSize = 5
}) => {
  const { exporting, handleExport } = useReportExport({
    fetchDetail,
    processDetail,
    columns,
    filename,
    chunkSize,
    onClose,
  });

  return (
    <ReportSelectorModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      exporting={exporting}
      onExport={handleExport}
      search={search}
      setSearch={setSearch}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      loading={loading}
      data={data}
      emptyTitle={emptyTitle}
      emptyMessage={emptyMessage}
      extraFilters={extraFilters}
      renderItem={renderItem}
    />
  );
};
