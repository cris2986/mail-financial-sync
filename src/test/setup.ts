// Setup file for Vitest
import '@testing-library/jest-dom';

// Mock de navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock de Google Identity Services
Object.defineProperty(window, 'google', {
  writable: true,
  value: {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn()
      }
    }
  }
});
