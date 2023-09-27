export const isWorker = typeof window === 'undefined' && typeof self !== 'undefined';
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
