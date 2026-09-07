import '@testing-library/react';

// Mock ResizeObserver for @tanstack/react-virtual
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i) => Object.keys(store)[i] || null,
  };
};

if (!window.localStorage || typeof window.localStorage.clear !== 'function') {
  window.localStorage = createStorageMock();
}
if (!window.sessionStorage || typeof window.sessionStorage.clear !== 'function') {
  window.sessionStorage = createStorageMock();
}

globalThis.localStorage = window.localStorage;
globalThis.sessionStorage = window.sessionStorage;

