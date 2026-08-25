import '@testing-library/react';

// Mock ResizeObserver for @tanstack/react-virtual
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;
