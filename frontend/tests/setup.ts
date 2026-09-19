import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});
