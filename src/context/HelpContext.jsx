/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { helpRegistry } from '../config/helpRegistry';

export const HelpContext = createContext(null);

export function resolveViewId(pathname) {
  if (!pathname || pathname === '/') return 'dashboard';
  if (pathname.startsWith('/courses/') && pathname.includes('/users/')) return 'course-user-detail';
  if (pathname.startsWith('/courses/')) return 'courses-detail';
  if (pathname === '/courses') return 'courses';
  if (pathname.startsWith('/categories/')) return 'categories-detail';
  if (pathname === '/categories') return 'categories';
  if (pathname.startsWith('/users/')) return 'users-detail';
  if (pathname === '/users') return 'users';
  if (pathname.startsWith('/cohorts/')) return 'cohorts-detail';
  if (pathname === '/cohorts') return 'cohorts';
  if (pathname.includes('/competency/')) return 'competency-detail';
  if (pathname === '/competencies/scales' || pathname.startsWith('/competencies/scales/')) return 'scales';
  if (pathname.match(/^\/competencies\/[^/]+$/)) return 'competency-framework-detail';
  if (pathname === '/competencies') return 'competencies';
  if (pathname.startsWith('/reports')) return 'reports';
  return 'dashboard';
}

export function HelpProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customViewId, setCustomViewId] = useState(null);
  const [location] = useLocation();

  const derivedViewId = useMemo(() => resolveViewId(location), [location]);
  const viewId = customViewId || derivedViewId;
  const helpData = useMemo(() => helpRegistry[viewId] || null, [viewId]);

  const open = useCallback((targetViewId) => {
    if (targetViewId && typeof targetViewId === 'string') {
      setCustomViewId(targetViewId);
    } else {
      setCustomViewId(null);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCustomViewId(null);
  }, []);

  const toggle = useCallback((targetViewId) => {
    setIsOpen(prev => {
      if (prev) {
        setCustomViewId(null);
        return false;
      }
      if (targetViewId && typeof targetViewId === 'string') {
        setCustomViewId(targetViewId);
      } else {
        setCustomViewId(null);
      }
      return true;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.MANAGEMENT_CONSOLE_CONFIG?.embedded === true) return;

    const handleKeyDown = (e) => {
      const isQuestionMark = e.key === '?' || (e.shiftKey && e.key === '/');
      if (isQuestionMark) {
        const active = document.activeElement;
        const isInput = active && (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) ||
          active.isContentEditable ||
          active.getAttribute('contenteditable') === 'true'
        );
        if (isInput) return;
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
        const helpBtn = document.getElementById('help-button');
        if (helpBtn) {
          helpBtn.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggle, close]);

  const value = useMemo(() => ({
    isOpen,
    viewId,
    helpData,
    open,
    close,
    toggle,
    openHelp: open,
    closeHelp: close,
    toggleHelp: toggle
  }), [isOpen, viewId, helpData, open, close, toggle]);

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
}

const defaultHelpContext = {
  isOpen: false,
  viewId: 'dashboard',
  helpData: helpRegistry.dashboard || null,
  open: () => {},
  close: () => {},
  toggle: () => {},
  openHelp: () => {},
  closeHelp: () => {},
  toggleHelp: () => {}
};

export function useHelp() {
  const context = useContext(HelpContext);
  return context || defaultHelpContext;
}
