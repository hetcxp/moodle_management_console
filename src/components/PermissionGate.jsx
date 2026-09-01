import React from 'react';
import { useAuth } from '../context/AuthContext';

export const PermissionGate = ({ capability, permission, children, fallback = null }) => {
  const { permissions } = useAuth();

  if (!permissions) {
    return fallback;
  }

  if (permissions.is_siteadmin === 1) {
    return <>{children}</>;
  }

  const cap = capability || permission;
  if (cap && permissions[cap] === 1) {
    return <>{children}</>;
  }

  return fallback;
};
