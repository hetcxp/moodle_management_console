import { useAuth } from '../context/AuthContext';

/**
 * Hook to check if current user has a capability or siteadmin rights.
 * @param {string} capability
 * @returns {boolean}
 */
export function usePermission(capability) {
  const { permissions } = useAuth();
  if (!permissions) return false;
  return permissions.is_siteadmin === 1 || permissions[capability] === 1;
}

/**
 * Hook to get helper functions for multiple permission checks.
 * @returns {{ permissions: object, has: (cap: string) => boolean }}
 */
export function usePermissionsHelper() {
  const { permissions } = useAuth();
  const has = (capability) => {
    if (!permissions) return false;
    return permissions.is_siteadmin === 1 || permissions[capability] === 1;
  };
  return { permissions, has };
}
