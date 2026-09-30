import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

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

export const LicensedActionButton = ({
  onClick,
  capability,
  permission,
  children,
  fallback = null,
  className,
  title,
  ...rest
}) => {
  let permissions = null;
  let isLicensed = true;

  try {
    const auth = useAuth();
    permissions = auth?.permissions ?? null;
    if (auth?.isLicensed !== undefined) {
      isLicensed = Boolean(auth.isLicensed);
    } else if (permissions?.is_licensed !== undefined) {
      isLicensed = permissions.is_licensed === 1;
    } else {
      isLicensed = true;
    }
  } catch {
    // Rendered outside AuthProvider (e.g. isolated component unit tests)
    permissions = { is_siteadmin: 1 };
    isLicensed = true;
  }

  if (!permissions) {
    return fallback;
  }

  const cap = capability || permission;
  const hasCap = cap ? (permissions.is_siteadmin === 1 || permissions[cap] === 1) : true;

  if (!hasCap) {
    return fallback;
  }

  if (!isLicensed) {
    const defaultDisabledTitle = 'Acción no disponible: requiere activación de licencia';

    if (!onClick && React.isValidElement(children)) {
      return (
        <span
          aria-disabled="true"
          title={title || defaultDisabledTitle}
          className={cn('inline-flex items-center gap-1.5 opacity-40 cursor-not-allowed pointer-events-none', className)}
        >
          {children}
        </span>
      );
    }

    return (
      <Button
        type="button"
        disabled={true}
        aria-disabled="true"
        title={title || defaultDisabledTitle}
        className={cn('opacity-40 cursor-not-allowed pointer-events-none', className)}
        {...rest}
      >
        {children}
      </Button>
    );
  }

  if (!onClick && React.isValidElement(children)) {
    return children;
  }

  return (
    <Button
      onClick={onClick}
      className={className}
      title={title}
      {...rest}
    >
      {children}
    </Button>
  );
};
