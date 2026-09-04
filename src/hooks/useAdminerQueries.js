/**
 * Barrel re-export — mantiene la API pública intacta.
 * Implementaciones en src/hooks/queries/ (split por dominio).
 */
export * from './queries/useDashboardQueries.js';
export * from './queries/usePermissionQueries.js';
export * from './queries/useCourseQueries.js';
export * from './queries/useCategoryQueries.js';
export * from './queries/useUserQueries.js';
export * from './queries/useCohortQueries.js';
export * from './queries/useCompetencyQueries.js';
