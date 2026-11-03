import '@testing-library/jest-dom/vitest';

// Competition pages live under /event/{code}/; run every test inside a test event.
window.history.replaceState({}, '', '/event/testevent/');
