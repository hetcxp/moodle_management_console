/**
 * Canonical navigation and routing helpers for Management Console entities.
 */

export const ENTITY_ROUTES = {
  course: 'courses',
  user: 'users',
  cohort: 'cohorts',
  category: 'categories',
  competency: 'competencies',
  competency_framework: 'competencies',
  framework: 'competencies',
};

/**
 * Builds the canonical path for any entity detail view.
 *
 * @param {string} entity Entity type ('course', 'user', 'cohort', 'category', 'course_user', 'competency', 'competency_framework', 'framework')
 * @param {string|number|object} id ID or composite ID object
 * @returns {string} Route URL
 */
export function buildDetailUrl(entity, id) {
  if (entity === 'course_user') {
    const courseId = typeof id === 'object' ? (id.courseId ?? id.course_id ?? 0) : 0;
    const userId = typeof id === 'object' ? (id.userId ?? id.user_id ?? id) : id;
    return `/courses/${courseId}/users/${userId}`;
  }

  if (entity === 'competency') {
    if (typeof id === 'object' && id.frameworkId && id.competencyId) {
      return `/competencies/${id.frameworkId}/competency/${id.competencyId}`;
    }
    return `/competencies/${id}`;
  }

  if (entity === 'competency_framework') {
    return `/competencies/${id}`;
  }

  const prefix = ENTITY_ROUTES[entity] || `${entity}s`;
  return `/${prefix}/${id}`;
}

/**
 * Navigates to the appropriate detail route using wouter's setLocation.
 *
 * @param {Function} setLocation Wouter navigate/setLocation callback
 * @param {string} entity
 * @param {string|number|object} id
 */
export function navigateToDetail(setLocation, entity, id) {
  const url = buildDetailUrl(entity, id);
  setLocation(url);
}
