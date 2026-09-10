import { useQuery } from '@tanstack/react-query';

/**
 * Factory para generar hooks de React Query de listados paginados/filtrados
 * @param {string} queryKey - Clave base para la cache de react-query
 * @param {function} fetcherFn - Función del servicio API que recibe params
 * @param {Object} [defaultOptions={}] - Opciones adicionales de useQuery
 * @returns {function(Object=): import('@tanstack/react-query').UseQueryResult}
 */
export function createListQuery(queryKey, fetcherFn, defaultOptions = {}) {
  return function useListQuery(params) {
    return useQuery({
      queryKey: [queryKey, params],
      queryFn: () => fetcherFn(params),
      staleTime: 30 * 1000,
      ...defaultOptions,
    });
  };
}
