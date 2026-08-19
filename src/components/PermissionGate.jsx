import React from 'react';
import { useAuth } from '../context/AuthContext';

export const PermissionGate = ({ capability, children, fallback = null }) => {
  const { permissions } = useAuth();

  if (!permissions) {
    return fallback;
  }

  if (permissions.is_siteadmin === 1) {
    return <>{children}</>;
  }

  if (capability && permissions[capability] === 1) {
    return <>{children}</>;
  }

  return fallback;
};
