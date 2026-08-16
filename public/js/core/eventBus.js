// BUILD
/** Normalizes and validates an event name */
function ensureEventName(eventName) {
  if (!eventName) throw new Error("eventBus.on: missing eventName");
  return String(eventName);
}


/** Creates an event bus with subscribe, emit, and clear helpers */
export function createEventBus() {
  const listeners = Object.create(null);
  function on(eventName, handler) {
    const name = ensureEventName(eventName);
    if (typeof handler !== "function") throw new Error("eventBus.on: handler must be a function");
    (listeners[name] || (listeners[name] = [])).push(handler);
    return function off() {
      const list = listeners[name];
      if (!list) return;
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    };
  }
  function emit(eventName, detail) {
    const name = ensureEventName(eventName);
    const list = listeners[name];
    if (!list || list.length === 0) return;
    const snapshot = list.slice();
    const ev = { type: name, detail: detail || {} };
    snapshot.forEach((fn) => {
      try {
        fn(ev);
      } catch (_e) {}
    });
  }
  function clear(eventName) {
    if (typeof eventName === "undefined") {
      Object.keys(listeners).forEach((key) => {
        delete listeners[key];
      });
      return;
    }
    delete listeners[String(eventName)];
  }
  return { on, emit, clear };
}
