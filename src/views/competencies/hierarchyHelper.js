/**
 * Helper to build hierarchical ordering and levels for competencies.
 * Separated from component file to ensure pure fast refresh and zero react-refresh warnings.
 */
export function buildCompetencyHierarchy(competencies = []) {
  if (!competencies || competencies.length === 0) return [];
  const byParent = new Map();
  const itemMap = new Map();
  competencies.forEach((c) => {
    itemMap.set(c.id, c);
    const pid = c.parentid || 0;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(c);
  });

  const result = [];
  function traverse(pid, level) {
    const children = byParent.get(pid) || [];
    children.sort((a, b) => (a.sortorder || 0) - (b.sortorder || 0) || (a.shortname || '').localeCompare(b.shortname || ''));
    for (const child of children) {
      result.push({
        ...child,
        level: level,
      });
      traverse(child.id, level + 1);
    }
  }

  traverse(0, 1);
  if (result.length < competencies.length) {
    const visited = new Set(result.map((r) => r.id));
    competencies.forEach((c) => {
      if (!visited.has(c.id)) {
        let fallbackLevel = c.level;
        if (!fallbackLevel) {
          if (c.path) {
            const parts = c.path.split('/').filter(p => p && p !== '0');
            fallbackLevel = parts.length > 0 ? parts.length : ((c.parentid || 0) > 0 ? 2 : 1);
          } else {
            fallbackLevel = (c.parentid || 0) > 0 ? 2 : 1;
          }
        }
        result.push({ ...c, level: fallbackLevel });
      }
    });
  }
  return result;
}
