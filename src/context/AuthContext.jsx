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
    let isCurrent = true;

    const initAuth = async () => {
      try {
        if (AuthService.isEmbedded()) {
          const configToken = window.MANAGEMENT_CONSOLE_CONFIG?.token || window.ADMINER_CONFIG?.token;
          const configUser = window.MANAGEMENT_CONSOLE_CONFIG?.user || window.ADMINER_CONFIG?.user;

          if (configToken) {
            setToken(configToken);
            let currentUser = configUser || AuthService.getUser();
            if (!currentUser) {
              try {
                currentUser = await AuthService.validateToken(configToken);
              } catch (err) {
                // eslint-disable-next-line no-console
                if (import.meta.env.DEV) console.warn('Could not validate token via webservice, using fallback admin user:', err);
                currentUser = { username: 'moodle_admin', fullname: 'Administrador Moodle' };
              }
            }
            if (isCurrent) {
              setUser(currentUser);
              await fetchPermissions();
            }
          }
        } else {
          const curToken = AuthService.getToken();
          const curUser = AuthService.getUser();
          if (curToken && curUser) {
            await fetchPermissions();
          }
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isCurrent = false;
    };
  }, [fetchPermissions]);

  useEffect(() => {
    const handleAuthError = (e) => {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.warn('Moodle Auth Error:', e.detail);
      if (!AuthService.isEmbedded()) {
        logout();
      }
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
      await fetchPermissions();
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
      await fetchPermissions();
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
