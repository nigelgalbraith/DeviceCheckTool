// BUILD
/** Runs a cleanup function safely */
function runCleanup(fn) {
  try {
    fn();
  } catch (_e) {}
}


/** Creates a page lifecycle controller */
export function createPageLifecycle() {
  const cleanups = [];
  let destroyed = false;
  function add(fn) {
    if (typeof fn !== "function") return fn;
    if (destroyed) {
      runCleanup(fn);
      return fn;
    }
    cleanups.push(fn);
    return fn;
  }
  function isDestroyed() {
    return destroyed;
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (let i = cleanups.length - 1; i >= 0; i -= 1) runCleanup(cleanups[i]);
    cleanups.length = 0;
  }
  return { add, isDestroyed, destroy };
}
