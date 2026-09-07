/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AuthService } from '../services/auth.js';
import { AdminerApi } from '../services/adminer-api.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const isMounted = useRef(true);
  const [user, setUser] = useState(AuthService.getUser());
  const [token, setToken] = useState(AuthService.getToken());
  const [permissions, setPermissions] = useState(null);
  const [permissionsError, setPermissionsError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchPermissions = useCallback(async (retry = true) => {
    try {
      const perms = await AdminerApi.getPermissions();
      if (!isMounted.current) return;
      setPermissions(perms);
      setPermissionsError(false);
    } catch (err) {
      if (retry) {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.warn('Could not fetch permissions, retrying in 3s...', err);
        return new Promise(resolve => {
          setTimeout(async () => {
            if (!isMounted.current) return resolve();
            resolve(await fetchPermissions(false));
          }, 3000);
        });
      }
      if (!isMounted.current) return;
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.warn('Could not fetch permissions after retry, setting default fallback permissions:', err);
      setPermissionsError(true);
      // Fallback if permissions service fails
      setPermissions({
        is_siteadmin: 0,
        can_config_site: 0,
        can_view_courses: 0,
        can_create_courses: 0,
        can_update_courses: 0,
        can_delete_courses: 0,
        can_manage_categories: 0,
        can_view_users: 0,
        can_update_users: 0,
        can_delete_users: 0,
        can_view_cohorts: 0,
        can_view_competencies: 0,
        can_manage_competencies: 0,
        can_view_reports: 0,
      });
    }
  }, []);

  useEffect(() => {
    if (AuthService.isEmbedded() && typeof window !== 'undefined' && window.ADMINER_CONFIG?.token) {
      loginWithToken(window.ADMINER_CONFIG.token).then(() => {
        fetchPermissions().finally(() => setLoading(false));
      });
    } else if (token && user) {
      fetchPermissions().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, user, fetchPermissions]);

  useEffect(() => {
    const handleAuthError = (e) => {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.warn('Moodle Auth Error:', e.detail);
      logout();
    };
    window.addEventListener('moodle-auth-error', handleAuthError);
    return () => window.removeEventListener('moodle-auth-error', handleAuthError);
  }, []);

  const login = async (username, password, remember = true) => {
    setLoading(true);
    try {
      await AuthService.login(username, password, remember);
      const curUser = AuthService.getUser();
      const curToken = AuthService.getToken();
      setUser(curUser);
      setToken(curToken);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const loginWithToken = async (manualToken) => {
    setLoading(true);
    try {
      const validUser = await AuthService.validateToken(manualToken);
      setUser(validUser);
      setToken(manualToken);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    setToken(null);
    setPermissions(null);
    setPermissionsError(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      permissions,
      permissionsError,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      loginWithToken,
      logout,
      reloadPermissions: () => fetchPermissions(true)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
