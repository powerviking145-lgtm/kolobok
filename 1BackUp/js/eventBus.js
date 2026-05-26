const listeners = new Map();

export const eventBus = {
  on(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(handler);
  },

  off(event, handler) {
    const set = listeners.get(event);
    if (set) set.delete(handler);
  },

  emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    set.forEach((handler) => handler(payload));
  },
};
